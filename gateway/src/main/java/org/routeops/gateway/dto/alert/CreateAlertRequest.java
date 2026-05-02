package org.routeops.gateway.dto.alert;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAlertRequest(
        @NotBlank String name,
        @NotBlank String message,
        @NotNull Double targetLat,
        @NotNull Double targetLng,
        Double thresholdDistanceMeters,
        Double thresholdEtaMinutes,
        Double estimatedSpeedKmh,
        Boolean enabled
) {
}
