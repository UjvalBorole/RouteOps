package org.routeops.gateway.dto.auth;

public record TokenResponse(
        String accessToken,
        String refreshToken
) { }
