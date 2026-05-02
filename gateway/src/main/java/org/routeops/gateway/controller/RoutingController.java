package org.routeops.gateway.controller;

import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.service.RoutingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RoutingController {
    private final RoutingService routingService;
    public RoutingController(RoutingService routingService) {
        this.routingService = routingService;
    }

    @GetMapping("/api/route")
    public ResponseEntity<RouteResponse> getOptimalRoute(
            @RequestParam Double startLat,
            @RequestParam Double startLng,
            @RequestParam Double endLat,
            @RequestParam Double endLng,
            @RequestParam(required = false) Double weight) {

        try {
            RouteResponse route = routingService.getOptimalRoute(startLat, startLng, endLat, endLng, weight);
            return new ResponseEntity<>(route, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
