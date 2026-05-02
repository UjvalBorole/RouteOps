package org.routeops.gateway.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record TokenRequest(
        @NotBlank String accessToken,
        @NotBlank String refreshToken
) { }
