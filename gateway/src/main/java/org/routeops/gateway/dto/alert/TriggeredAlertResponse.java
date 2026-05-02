package org.routeops.gateway.dto.alert;

public record TriggeredAlertResponse(
        String alertId,
        String name,
        String message,
        Double routeDistanceMeters,
        Double routeEtaMinutes,
        Double thresholdDistanceMeters,
        Double thresholdEtaMinutes,
        boolean triggeredByDistance,
        boolean triggeredByEta
) {
}
