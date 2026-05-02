package org.routeguidance.dto;

import jakarta.validation.constraints.NotNull;

public record GeoPoint(
        @NotNull Double lat,
        @NotNull Double lng
) {
}
