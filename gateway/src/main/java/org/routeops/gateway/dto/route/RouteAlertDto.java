package org.routeops.gateway.dto.route;

import java.time.Instant;

public record RouteAlertDto(
        String alertId,
        String alertType,
        String message,
        Double thresholdValue,
        Double currentValue,
        Instant triggeredAt,
        Boolean acknowledged
) {
}