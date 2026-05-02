package org.routeops.gateway.dto;

import org.routeops.gateway.entity.GeoNode;

import java.util.List;


public record RouteResponse(String status,
                            int count,
                            Double totalDistance,
                            List<GeoNode> path
) { }
