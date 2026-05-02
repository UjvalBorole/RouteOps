package org.routeguidance.service;

import org.routeguidance.dto.GeoPoint;
import org.routeguidance.dto.RoutePlan;

public interface RoutingEngineClient {

    RoutePlan calculateRoute(GeoPoint start, GeoPoint destination);
}
