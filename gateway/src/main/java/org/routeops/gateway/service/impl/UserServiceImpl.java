package org.routeops.gateway.service.impl;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.routeops.gateway.dto.auth.LoginRequest;
import org.routeops.gateway.dto.auth.LoginResponse;
import org.routeops.gateway.dto.auth.RegisterRequest;
import org.routeops.gateway.dto.auth.TokenRequest;
import org.routeops.gateway.dto.auth.TokenResponse;
import org.routeops.gateway.dto.auth.UserResponse;
import org.routeops.gateway.entity.token.Token;
import org.routeops.gateway.entity.user.Role;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.mapper.UserMapper;
import org.routeops.gateway.repository.TokenRepository;
import org.routeops.gateway.repository.UserRepository;
import org.routeops.gateway.service.JwtService;
import org.routeops.gateway.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final TokenRepository tokenRepository;
    private final JwtService jwtService;

    public UserServiceImpl(UserRepository users, PasswordEncoder encoder, TokenRepository tokenRepository, JwtService jwtService) {
        this.users = users;
        this.encoder = encoder;
        this.tokenRepository = tokenRepository;
        this.jwtService = jwtService;
    }

    @Override
    @SuppressWarnings("null")
    public Optional<UserResponse> register(RegisterRequest req) {
        if (users.existsByUsername(req.username()) || users.existsByEmail(req.email())) {
            return Optional.empty();
        }

        User u = User.builder()
                .username(req.username())
                .email(req.email())
                .passwordHash(encoder.encode(req.password()))
                .roles(new HashSet<>(Set.of(Role.USER)))
                .createdAt(Instant.now())
                .enabled(true)
                .build();

        u = users.save(u);
        return Optional.of(UserMapper.toResponse(u));
    }

    @Override
    @SuppressWarnings("null")
    public Optional<LoginResponse> login(LoginRequest req) {
        Optional<User> found = users.findByUsername(req.usernameOrEmail());
        if (found.isEmpty()) {
            found = users.findByEmail(req.usernameOrEmail());
        }

        if (found.isEmpty()) {
            return Optional.empty();
        }

        User u = found.get();
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            return Optional.empty();
        }

        Token token = Token.builder()
                .user(u)
                .accessToken(jwtService.generateToken(u))
                .refreshToken(jwtService.generateRefreshToken(u))
                .createdAt(Instant.now())
                .blacklisted(false)
                .build();

        revokeAllUserTokens(u);

        tokenRepository.save(token);

        return Optional.of(new LoginResponse(token.getAccessToken(), token.getRefreshToken(),UserMapper.toResponse(u)));
    }

    private void revokeAllUserTokens(User user){
        List<Token> validUserTokens =  tokenRepository.findAllValidTokenByUser(user.getId());
        if(validUserTokens.isEmpty()) return;
        for(Token token: validUserTokens)
            token.setBlacklisted(true);
        tokenRepository.saveAll(validUserTokens);
    }

    @Override
    @SuppressWarnings("null")
    public Optional<TokenResponse> tokens(TokenRequest oldToken){
        Optional<Token> foundToken = tokenRepository.findByRefreshToken(oldToken.refreshToken());
        if (foundToken.isEmpty() || foundToken.get().isBlacklisted()) {
            return Optional.empty();
        }

        foundToken.get().setBlacklisted(true);
        tokenRepository.save(foundToken.get());
        User tokenUser = foundToken.get().getUser();
        Token newToken = Token.builder()
                .user(tokenUser)
                .accessToken(jwtService.generateToken(tokenUser))
                .refreshToken(jwtService.generateRefreshToken(tokenUser))
                .createdAt(Instant.now())
                .blacklisted(false)
                .build();

        tokenRepository.save(newToken);
        return Optional.of(new TokenResponse(newToken.getAccessToken(), newToken.getRefreshToken()));

    }
}
