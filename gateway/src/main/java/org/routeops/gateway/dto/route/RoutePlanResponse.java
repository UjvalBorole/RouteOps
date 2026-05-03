package org.routeops.gateway.dto.route;

import java.util.List;

public record RoutePlanResponse(
        String sessionId,
        String sessionName,
        Double startLat,
        Double startLng,
        Double endLat,
        Double endLng,
        String startAddress,
        String destinationAddress,
        Double totalDistance,
        Double estimatedDurationMinutes,
        Long estimatedDurationSeconds,
        List<RouteNodeDto> routePath,
        String status
) {
}