package org.routeops.gateway.dto.route;

import java.util.List;

public record RouteProgressResponse(
        String sessionId,
        String status,
        Double currentLat,
        Double currentLng,
        Double remainingDistance,
        Double completedDistance,
        Double progressPercentage,
        Integer currentNodeIndex,
        Boolean onRoute,
        Double deviationDistance,
        List<RouteAlertDto> activeAlerts,
        String nextInstruction,
        Double distanceToNextInstruction
) {
}