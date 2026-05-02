package org.routeops.gateway.dto.alert;

import java.time.Instant;

public record AlertResponse(
        String id,
        String name,
        String message,
        String routeSessionId,
        String alertType,
        Double thresholdDistanceMeters,
        boolean enabled,
        Instant createdAt,
        Instant lastTriggeredAt
) {
}
