package org.routeops.gateway.dto.alert;

public record NavigationResponse(
        Double user1Lat,
        Double user1Lng,
        Double user2Lat,
        Double user2Lng,
        Double distanceMeters,
        Double etaMinutes,
        boolean withinDistance,
        boolean withinEta,
        String status,
        String message
) {
}
