package org.routeops.gateway.dto.route;

import jakarta.validation.constraints.NotNull;

public record RoutePlanRequest(
        @NotNull Double startLat,
        @NotNull Double startLng,
        @NotNull Double endLat,
        @NotNull Double endLng,
        String sessionName,
        Double destinationThresholdMeters
) {
}