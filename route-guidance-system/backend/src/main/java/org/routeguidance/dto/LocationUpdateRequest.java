package org.routeguidance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record LocationUpdateRequest(
        @Valid @NotNull GeoPoint currentLocation
) {
}
