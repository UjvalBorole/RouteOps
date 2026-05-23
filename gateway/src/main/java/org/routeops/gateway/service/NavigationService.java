package org.routeops.gateway.service;

import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.dto.alert.NavigationRequest;
import org.routeops.gateway.dto.alert.NavigationResponse;
import org.routeops.gateway.dto.route.RoutePlanRequest;
import org.springframework.stereotype.Service;

@Service
public class NavigationService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private static final double DEFAULT_SPEED_KMH = 40.0;

    private final RouteService routeService;
    private final RoutingService routingService;

    public NavigationService(RouteService routeService, RoutingService routingService) {
        this.routeService = routeService;
        this.routingService = routingService;
    }

    /**
     * @deprecated Use RouteService.planRoute() instead. This method is kept for backward compatibility.
     */
    @Deprecated
    public NavigationResponse planNavigation(NavigationRequest request) {
        // Convert old request format to new format
//        RoutePlanRequest routeRequest = new RoutePlanRequest(
//                request.user1Lat(),
//                request.user1Lng(),
//                request.user2Lat(),
//                request.user2Lng(),
//                "Legacy Navigation Plan",
//                null, // startAddress
//                null, // destinationAddress
//                null, // vehicleType
//                request.thresholdDistanceMeters(),
//                null  // destinationThresholdSeconds
//        );

        // This would require a username, which we don't have in the old API
        // For backward compatibility, we'll return a simplified response
        RouteResponse route = routingService.getOptimalRoute(
                request.user1Lat(), request.user1Lng(),
                request.user2Lat(), request.user2Lng(),
                request.speedKmh()
        );

        double distanceMeters = route.totalDistance() != null
                ? route.totalDistance()
                : calculateHaversineDistance(
                request.user1Lat(), request.user1Lng(),
                request.user2Lat(), request.user2Lng());

        double speedKmh = request.speedKmh() != null && request.speedKmh() > 0 ? request.speedKmh() : DEFAULT_SPEED_KMH;
        double etaMinutes = distanceMeters / 1000.0 / speedKmh * 60.0;

        Double validThresholdDistance = request.thresholdDistanceMeters() != null && request.thresholdDistanceMeters() > 0
                ? request.thresholdDistanceMeters()
                : null;
        Double validThresholdEta = request.thresholdEtaMinutes() != null && request.thresholdEtaMinutes() > 0
                ? request.thresholdEtaMinutes()
                : null;

        boolean withinDistance = validThresholdDistance != null && distanceMeters <= validThresholdDistance;
        boolean withinEta = validThresholdEta != null && etaMinutes <= validThresholdEta;
        boolean alarmTriggered = withinDistance || withinEta;

        String routeType = "road route";
        if (route.status() == null || route.status().equalsIgnoreCase("fallback")) {
            routeType = "fallback straight-line";
        }

        String status;
        if (validThresholdDistance == null && validThresholdEta == null) {
            status = "No threshold configured; alarm logic is disabled.";
        } else if (withinDistance && withinEta) {
            status = "Alarm triggered: both distance and ETA thresholds reached.";
        } else if (withinDistance) {
            status = "Alarm triggered: distance threshold reached.";
        } else if (withinEta) {
            status = "Alarm triggered: ETA threshold reached.";
        } else {
            status = "No alarm: thresholds not reached yet.";
        }

        String message = String.format("%s Distance: %.1f meters, ETA: %.1f minutes. Alarm: %s", routeType, distanceMeters, etaMinutes, alarmTriggered ? "ON" : "OFF");

        return new NavigationResponse(
                request.user1Lat(),
                request.user1Lng(),
                request.user2Lat(),
                request.user2Lng(),
                distanceMeters,
                etaMinutes,
                withinDistance,
                withinEta,
                status,
                message
        );
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(rLat1) * Math.cos(rLat2)
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }
}
