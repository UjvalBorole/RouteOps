package org.routeops.gateway.dto.route;

import jakarta.validation.constraints.NotNull;

public record RoutePlanRequest(
        @NotNull Double startLat,
        @NotNull Double startLng,
        @NotNull Double endLat,
        @NotNull Double endLng,
        String sessionName,
        String startAddress,
        String destinationAddress,
        String vehicleType, // e.g., "pedestrian", "car", "bike"
        Double destinationThresholdMeters,
        Long destinationThresholdSeconds // Time-based threshold in seconds
) {
}