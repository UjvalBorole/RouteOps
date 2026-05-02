package org.routeops.gateway.service.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
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
import org.routeops.gateway.repository.TokenRepository;
import org.routeops.gateway.repository.UserRepository;
import org.routeops.gateway.service.JwtService;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TokenRepository tokenRepository;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private UserServiceImpl userService;

    private User testUser;
    private Token testToken;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testUser = User.builder()
                .id("user-1")
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .roles(new HashSet<>(Set.of(Role.USER)))
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        testToken = Token.builder()
                .id("token-1")
                .user(testUser)
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .createdAt(Instant.now())
                .blacklisted(false)
                .build();
    }

    @Test
    void testRegister_Success() {
        RegisterRequest request = new RegisterRequest("newuser", "newemail@example.com", "password123");

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newemail@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        Optional<UserResponse> result = userService.register(request);

        assertTrue(result.isPresent());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testRegister_UserAlreadyExists() {
        RegisterRequest request = new RegisterRequest("testuser", "newemail@example.com", "password123");

        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        Optional<UserResponse> result = userService.register(request);

        assertTrue(result.isEmpty());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegister_EmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("newuser", "test@example.com", "password123");

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        Optional<UserResponse> result = userService.register(request);

        assertTrue(result.isEmpty());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testLogin_Success_WithUsername() {
        LoginRequest request = new LoginRequest("testuser", "password123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtService.generateToken(testUser)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(testUser)).thenReturn("refresh-token");
        when(tokenRepository.findAllValidTokenByUser("user-1")).thenReturn(new ArrayList<>());
        when(tokenRepository.save(any(Token.class))).thenReturn(testToken);

        Optional<LoginResponse> result = userService.login(request);

        assertTrue(result.isPresent());
        verify(tokenRepository, times(1)).save(any(Token.class));
    }

    @Test
    void testLogin_Success_WithEmail() {
        LoginRequest request = new LoginRequest("test@example.com", "password123");

        when(userRepository.findByUsername("test@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtService.generateToken(testUser)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(testUser)).thenReturn("refresh-token");
        when(tokenRepository.findAllValidTokenByUser("user-1")).thenReturn(new ArrayList<>());
        when(tokenRepository.save(any(Token.class))).thenReturn(testToken);

        Optional<LoginResponse> result = userService.login(request);

        assertTrue(result.isPresent());
    }

    @Test
    void testLogin_UserNotFound() {
        LoginRequest request = new LoginRequest("nonexistent", "password123");

        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("nonexistent")).thenReturn(Optional.empty());

        Optional<LoginResponse> result = userService.login(request);

        assertTrue(result.isEmpty());
    }

    @Test
    void testLogin_InvalidPassword() {
        LoginRequest request = new LoginRequest("testuser", "wrongpassword");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", "hashedPassword")).thenReturn(false);

        Optional<LoginResponse> result = userService.login(request);

        assertTrue(result.isEmpty());
    }

    @Test
    void testTokens_Success() {
        TokenRequest request = new TokenRequest("access-token", "refresh-token");

        when(tokenRepository.findByRefreshToken("refresh-token")).thenReturn(Optional.of(testToken));
        when(jwtService.generateToken(testUser)).thenReturn("new-access-token");
        when(jwtService.generateRefreshToken(testUser)).thenReturn("new-refresh-token");
        when(tokenRepository.save(any(Token.class))).thenReturn(testToken);

        Optional<TokenResponse> result = userService.tokens(request);

        assertTrue(result.isPresent());
        assertEquals("new-access-token", result.get().accessToken());
        verify(tokenRepository, times(2)).save(any(Token.class));
    }

    @Test
    void testTokens_RefreshTokenNotFound() {
        TokenRequest request = new TokenRequest("access-token", "invalid-token");

        when(tokenRepository.findByRefreshToken("invalid-token")).thenReturn(Optional.empty());

        Optional<TokenResponse> result = userService.tokens(request);

        assertTrue(result.isEmpty());
    }

    @Test
    void testTokens_RefreshTokenBlacklisted() {
        TokenRequest request = new TokenRequest("access-token", "refresh-token");
        testToken.setBlacklisted(true);

        when(tokenRepository.findByRefreshToken("refresh-token")).thenReturn(Optional.of(testToken));

        Optional<TokenResponse> result = userService.tokens(request);

        assertTrue(result.isEmpty());
    }
}
