package org.routeops.gateway.dto.alert;

import jakarta.validation.constraints.NotNull;

public record NavigationRequest(
        @NotNull Double user1Lat,
        @NotNull Double user1Lng,
        @NotNull Double user2Lat,
        @NotNull Double user2Lng,
        Double thresholdDistanceMeters,
        Double thresholdEtaMinutes,
        Double speedKmh
) {
}
