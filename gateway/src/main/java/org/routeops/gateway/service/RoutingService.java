package org.routeops.gateway.service;

import org.routeops.gateway.dto.RouteResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.extern.slf4j.Slf4j;


@Service
@Slf4j
public class RoutingService {

    private final WebClient webClient;

    public RoutingService(
            @Qualifier("routingWebClient")
            WebClient webClient
    ) {
        this.webClient = webClient;
    }

 public RouteResponse getOptimalRoute(Double startLat, Double startLng, Double endLat, Double endLng, Double vehicleWeight) {
        try {
            vehicleWeight = vehicleWeight==null?0.0:vehicleWeight;
            log.debug("Requesting route from {} to {} (weight: {})",
                    new double[]{startLat, startLng},
                    new double[]{endLat, endLng},
                    vehicleWeight);


            String weight = vehicleWeight.toString().trim();
        RouteResponse response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/route")
                        .queryParam("startLat", startLat)
                        .queryParam("startLng", startLng)
                        .queryParam("endLat", endLat)
                        .queryParam("endLng", endLng)
                        .queryParam("weight", weight)
                        .build())
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        clientResponse -> {
                            log.error("Routing Engine returned status: {}", clientResponse.statusCode());
                            return clientResponse.createException();
                        })
                .bodyToMono(RouteResponse.class)
                .block();


        return response;
                    } catch (Exception e) {
            log.warn("Routing Engine unavailable, falling back to local routing. Error: {} - {}",
                    e.getClass().getSimpleName(), e.getMessage());
            return createFallbackRoute(startLat, startLng, endLat, endLng);
        }
    }

    private RouteResponse createFallbackRoute(Double startLat, Double startLng, Double endLat, Double endLng) {
        double totalDistance = calculateHaversineDistance(startLat, startLng, endLat, endLng);
        var startNode = new org.routeops.gateway.entity.GeoNode(-1L, startLat, startLng);
        var endNode = new org.routeops.gateway.entity.GeoNode(-2L, endLat, endLng);
        return new RouteResponse("fallback", 2, totalDistance, java.util.List.of(startNode, endNode));
    }

    private double calculateHaversineDistance(Double startLat, Double startLng, Double endLat, Double endLng) {
        double lat1 = Math.toRadians(startLat);
        double lon1 = Math.toRadians(startLng);
        double lat2 = Math.toRadians(endLat);
        double lon2 = Math.toRadians(endLng);

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6_371_000.0 * c;
    }
}
