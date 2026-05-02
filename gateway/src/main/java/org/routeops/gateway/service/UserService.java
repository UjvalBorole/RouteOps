package org.routeops.gateway.service;

import org.routeops.gateway.dto.auth.*;

import java.util.Optional;

public interface UserService {
    public Optional<UserResponse> register(RegisterRequest req);
    public Optional<LoginResponse> login(LoginRequest req);
    public Optional<TokenResponse> tokens(TokenRequest oldToken);
}
