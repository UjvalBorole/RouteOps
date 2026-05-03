package org.routeops.gateway.dto.route;

import java.util.List;

public record RouteProgressResponse(
        String sessionId,
        String status,
        Double currentLat,
        Double currentLng,
        Double remainingDistance,
        Double remainingDistanceKm,
        Double completedDistance,
        Double progressPercentage,
        Integer currentNodeIndex,
        Boolean onRoute,
        Double deviationDistance,
        List<RouteAlertDto> activeAlerts,
        String nextInstruction,
        Double distanceToNextInstruction,
        List<RouteNodeDto> remainingPathNodes,
        Double currentSpeedKmh,
        Double lastSegmentDistanceMeters,
        Long lastSegmentDurationSeconds,
        Long estimatedTimeToDestinationSeconds,
        Long nextAlarmTriggerTimeSeconds,
        Double nextAlarmThresholdMeters
) {
}