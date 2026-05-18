package org.routeops.gateway.dto.geocoding;

public record GeocodingResponse(
        Double lat,
        Double lng,
        String displayName
) {
}
