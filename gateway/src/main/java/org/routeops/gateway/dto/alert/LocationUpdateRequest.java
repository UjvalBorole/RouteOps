package org.routeops.gateway.dto.alert;

import jakarta.validation.constraints.NotNull;

public record LocationUpdateRequest(
        @NotNull Double latitude,
        @NotNull Double longitude,
        Double speedKmh
) {
}
