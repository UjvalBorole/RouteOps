package org.routeops.gateway.dto.auth;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        UserResponse user
) { }
