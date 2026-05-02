package org.routeguidance.dto;

import java.time.Instant;

public record GuidanceSessionResponse(
        String sessionId,
        String userId,
        GeoPoint currentLocation,
        GeoPoint destination,
        Double thresholdDistanceMeters,
        Double thresholdEtaMinutes,
        Double speedKmh,
        int rerouteCount,
        boolean thresholdTriggered,
        Instant createdAt,
        Instant updatedAt,
        RoutePlan route
) {
}
