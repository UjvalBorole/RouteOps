package org.routeguidance.dto;

public record LocationUpdateResponse(
        String sessionId,
        GeoPoint currentLocation,
        boolean followingPlannedRoute,
        boolean rerouted,
        int rerouteCount,
        Double remainingRouteDistanceMeters,
        Double etaMinutes,
        boolean thresholdTriggered,
        String status,
        String message,
        RoutePlan activeRoute
) {
}
