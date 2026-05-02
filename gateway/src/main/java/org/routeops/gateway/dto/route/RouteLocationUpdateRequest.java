package org.routeops.gateway.dto.route;

import jakarta.validation.constraints.NotNull;

public record RouteLocationUpdateRequest(
        @NotNull String sessionId,
        @NotNull Double latitude,
        @NotNull Double longitude,
        Double speedKmh,
        Double accuracyMeters
) {
}