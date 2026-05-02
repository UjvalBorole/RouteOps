package org.routeops.gateway.dto.route;

public record RouteNodeDto(
        Long nodeId,
        Double latitude,
        Double longitude,
        String streetName,
        String instruction,
        Double distanceFromStart,
        Integer sequence
) {
}