package org.routeguidance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StartGuidanceRequest(
        @NotBlank String userId,
        @Valid @NotNull GeoPoint currentLocation,
        @Valid @NotNull GeoPoint destination,
        Double thresholdDistanceMeters,
        Double thresholdEtaMinutes,
        Double speedKmh
) {
}
