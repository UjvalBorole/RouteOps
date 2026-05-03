package org.routeops.gateway.dto.route;

import java.time.Instant;

public record RouteSessionResponse(
        String sessionId,
        String sessionName,
        Double startLat,
        Double startLng,
        Double endLat,
        Double endLng,
        String startAddress,
        String destinationAddress,
        String vehicleType,
        String status,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        Double totalDistance,
        Double remainingDistance,
        Double remainingDistanceKm,
        Double completedDistance,
        Double currentLat,
        Double currentLng,
        Instant lastLocationUpdate,
        Double currentSpeedKmh,
        Double lastSegmentDistanceMeters,
        Long lastSegmentDurationSeconds,
        Long estimatedTimeToDestinationSeconds,
        Boolean destinationAlertTriggered,
        Instant destinationAlertTriggeredAt
) {
}