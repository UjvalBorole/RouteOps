package org.routeguidance.dto;

import java.util.List;

public record RoutePlan(
        String status,
        int count,
        Double totalDistance,
        List<RouteNode> path
) {
}
