package org.routeops.gateway.dto.route;

import java.time.Instant;

public record RouteSessionResponse(
        String sessionId,
        String sessionName,
        Double startLat,
        Double startLng,
        Double endLat,
        Double endLng,
        String status,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        Double totalDistance,
        Double remainingDistance,
        Double completedDistance,
        Double currentLat,
        Double currentLng,
        Instant lastLocationUpdate,
        Boolean destinationAlertTriggered,
        Instant destinationAlertTriggeredAt
) {
}