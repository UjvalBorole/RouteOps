package org.routeops.gateway.dto.route;

import java.util.List;

public record RoutePlanResponse(
        String sessionId,
        String sessionName,
        Double startLat,
        Double startLng,
        Double endLat,
        Double endLng,
        Double totalDistance,
        Double estimatedDurationMinutes,
        List<RouteNodeDto> routeNodes,
        String status
) {
}