package org.routeops.gateway.config;

import java.io.IOException;

import org.routeops.gateway.repository.TokenRepository;
import org.routeops.gateway.service.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final TokenRepository tokenRepository;
    private final UserDetailsService userDetailsService;

    // Ignore security rules for tracking endpoints
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/tracking/**");
    }

    // Apply the filter only once for each request
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String tokenFromHeader = authHeader.substring(7);

        String usernameByHeader = jwtService.extractUsername(tokenFromHeader);

        log.info(">>> JWT Filter: Extracted Username from header: {}", usernameByHeader);

        if (usernameByHeader != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userFromHeader = userDetailsService.loadUserByUsername(usernameByHeader);

            var tokenOptional = tokenRepository.findByAccessToken(tokenFromHeader);


            boolean isTokenValidInDb = tokenOptional
                    .map(t -> !t.isBlacklisted())
                    .orElse(false);

            boolean isCryptoValid = jwtService.isTokenValid(tokenFromHeader, userFromHeader);
            log.debug("Crypto Validation passed: {}", isCryptoValid);

            if(isCryptoValid && isTokenValidInDb){
                log.info("Authentication successful for user: {}", usernameByHeader);
                log.debug("User Authorities: {}", userFromHeader.getAuthorities());

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userFromHeader,
                        null,
                        userFromHeader.getAuthorities()
                );

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request)); // add request details (IP/session)

                SecurityContextHolder.getContext().setAuthentication(authToken); // perform the actual login
            } else {
                log.warn("Authentication failed for user: {}. Token valid in DB: {}, Crypto valid: {}",
                        usernameByHeader, isTokenValidInDb, isCryptoValid);
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() { return false; }

    @Override
    protected boolean shouldNotFilterErrorDispatch() { return false; }

}
