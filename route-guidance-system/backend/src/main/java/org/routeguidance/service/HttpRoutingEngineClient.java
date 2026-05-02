package org.routeguidance.service;

import org.routeguidance.config.GuidanceProperties;
import org.routeguidance.dto.GeoPoint;
import org.routeguidance.dto.RoutePlan;
import org.routeguidance.exception.RoutingEngineException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpRoutingEngineClient implements RoutingEngineClient {

    private final RestClient restClient;
    private final GuidanceProperties properties;

    public HttpRoutingEngineClient(RestClient routingRestClient, GuidanceProperties properties) {
        this.restClient = routingRestClient;
        this.properties = properties;
    }

    @Override
    public RoutePlan calculateRoute(GeoPoint start, GeoPoint destination) {
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(properties.getRouting().getRoutePath())
                            .queryParam("startLat", start.lat())
                            .queryParam("startLng", start.lng())
                            .queryParam("endLat", destination.lat())
                            .queryParam("endLng", destination.lng())
                            .build())
                    .retrieve()
                    .body(RoutePlan.class);
        } catch (Exception ex) {
            throw new RoutingEngineException("Could not calculate a road-based route from the routing engine.", ex);
        }
    }
}
