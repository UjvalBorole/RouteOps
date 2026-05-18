package org.routeops.gateway.service;

import java.util.ArrayList;
import java.util.List;

import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.dto.route.RouteNodeDto;
import org.routeops.gateway.entity.GeoNode;
import org.routeops.gateway.entity.RouteNode;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.repository.RouteNodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RouteCalculationService handles route planning and calculation.
 * 
 * Responsibilities:
 * - Plan optimal routes using the routing engine
 * - Build and persist route nodes
 * - Calculate route statistics (distance, estimated time)
 * - Handle rerouting when user deviates from planned path
 * 
 * Usage Example:
 * <pre>
 *   // Plan a new route
 *   RoutePlanResult result = routeCalculationService.planRoute(
 *       startLat, startLng, endLat, endLng, vehicleType);
 *   
 *   // Store route nodes
 *   routeCalculationService.storeRouteNodes(session, routeResponse);
 *   
 *   // Reroute when user deviates
 *   RouteResponse newRoute = routeCalculationService.rerouteFromPosition(
 *       currentLat, currentLng, endLat, endLng, vehicleType);
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteCalculationService {

    private final RoutingService routingService;
    private final RouteNodeRepository routeNodeRepository;
    private final ObjectMapper objectMapper;

    private static final double DEFAULT_SPEED_KMH = 40.0;

    /**
     * Plans an optimal route from start to end point.
     * Delegates to routing engine for path calculation.
     * 
     * @param startLat Start latitude (degrees)
     * @param startLng Start longitude (degrees)
     * @param endLat End latitude (degrees)
     * @param endLng End longitude (degrees)
     * @param vehicleWeight Vehicle weight for routing optimization (kg), or null for default
     * @return Route response with waypoints and distance
     * @throws IllegalStateException If routing engine fails
     * 
     * Example:
     *   RouteResponse route = planRoute(28.6139, 77.2090, 28.5244, 77.1855, 1500.0);
     *   System.out.println("Route distance: " + route.getTotalDistance() + "m");
     */
    public RouteResponse planRoute(double startLat, double startLng, double endLat, double endLng, 
                                   Double vehicleWeight) {
        log.info("Planning route from ({},{}) to ({},{}) with vehicle weight {}kg",
                startLat, startLng, endLat, endLng, vehicleWeight);

        RouteResponse routeResponse = routingService.getOptimalRoute(
                startLat, startLng, endLat, endLng, vehicleWeight);

        if (routeResponse == null || routeResponse.path() == null) {
            log.error("Failed to get route from routing engine");
            throw new IllegalStateException("Unable to calculate route");
        }

        log.info("Route planned successfully with {} waypoints and {} meters distance",
                routeResponse.path().size(), routeResponse.totalDistance());
        return routeResponse;
    }

    /**
     * Stores route waypoints in database as RouteNode entities.
     * Also serializes the route as JSON for quick retrieval.
     * 
     * @param session Route session to attach nodes to
     * @param routeResponse Route response from planning service
     * @return Serialized route as JSON string
     * 
     * Example:
     *   String routeJson = storeRouteNodes(session, routeResponse);
     *   session.setPlannedRouteJson(routeJson);
     */
    @Transactional
    public String storeRouteNodes(RouteSession session, RouteResponse routeResponse) {
        log.debug("Storing route nodes for session {}", session.getId());

        List<RouteNodeDto> routeNodes = buildRouteNodeDtos(routeResponse.path());

        // Persist each node to database
        for (RouteNodeDto node : routeNodes) {
            RouteNode routeNode = RouteNode.builder()
                    .nodeId(node.nodeId())
                    .latitude(node.latitude())
                    .longitude(node.longitude())
                    .sequence(node.sequence())
                    .distanceFromStart(node.distanceFromStart())
                    .streetName(node.streetName())
                    .instruction(node.instruction())
                    .build();
            routeNodeRepository.save(routeNode);
        }

        // Serialize route as JSON
        String routeJson;
        try {
            routeJson = objectMapper.writeValueAsString(routeNodes);
        } catch (Exception e) {
            log.error("Failed to serialize route nodes for session {}", session.getId(), e);
            routeJson = "[]";
        }

        log.debug("Stored {} route nodes for session {}", routeNodes.size(), session.getId());
        return routeJson;
    }

    /**
     * Plans a new route from user's current position to final destination.
     * Used when user deviates from the original planned route.
     * 
     * @param currentLat User's current latitude (degrees)
     * @param currentLng User's current longitude (degrees)
     * @param endLat Final destination latitude (degrees)
     * @param endLng Final destination longitude (degrees)
     * @param vehicleWeight Vehicle weight for optimization (kg)
     * @return New route response, or null if rerouting fails
     * 
     * Example:
     *   RouteResponse newRoute = rerouteFromPosition(28.6000, 77.2000, 28.5244, 77.1855, 1500.0);
     *   if (newRoute != null) {
     *       session.setTotalRouteDistance(newRoute.getTotalDistance());
     *   }
     */
    public RouteResponse rerouteFromPosition(double currentLat, double currentLng, 
                                            double endLat, double endLng, Double vehicleWeight) {
        log.info("Rerouting from current position ({},{}) to destination ({},{})",
                currentLat, currentLng, endLat, endLng);

        try {
            RouteResponse rerouteResponse = routingService.getOptimalRoute(
                    currentLat, currentLng, endLat, endLng, vehicleWeight);

            if (rerouteResponse != null && rerouteResponse.path() != null && !rerouteResponse.path().isEmpty()) {
                log.info("Reroute successful with {} waypoints", rerouteResponse.path().size());
                return rerouteResponse;
            } else {
                log.warn("Reroute failed - no valid path returned");
                return null;
            }
        } catch (Exception e) {
            log.error("Exception during rerouting", e);
            return null;
        }
    }

    /**
     * Updates route nodes when rerouting occurs.
     * Clears old nodes and stores new ones.
     * 
     * @param session Route session to update
     * @param rerouteResponse New route response from rerouting
     * @return Updated serialized route as JSON
     */
    @Transactional
    public String updateRouteNodes(RouteSession session, RouteResponse rerouteResponse) {
        log.debug("Updating route nodes for session {} after reroute", session.getId());

        // Could optionally clear old nodes here if needed
        // routeNodeRepository.deleteBySession(session);

        return storeRouteNodes(session, rerouteResponse);
    }

    /**
     * Builds RouteNodeDto objects from raw path data.
     * Calculates cumulative distance for each waypoint.
     * 
     * @param path List of geographic nodes from routing engine
     * @return List of DTOs with distance and sequence information
     * 
     * Example:
     *   List<RouteNodeDto> nodes = buildRouteNodeDtos(routePath);
     *   nodes.forEach(n -> System.out.println("Node " + n.getSequence() + 
     *       " at " + n.getDistanceFromStart() + "m"));
     */
    public List<RouteNodeDto> buildRouteNodeDtos(List<GeoNode> path) {
        List<RouteNodeDto> routeNodes = new ArrayList<>();
        double cumulativeDistance = 0.0;

        for (int i = 0; i < path.size(); i++) {
            GeoNode node = path.get(i);
            
            // Calculate distance from previous node
            if (i > 0) {
                GeoNode previous = path.get(i - 1);
                // Note: Using simple distance calc here, could use RouteGeometryService for precision
                double nodeDistance = Math.sqrt(
                        Math.pow(node.getLat() - previous.getLat(), 2) +
                        Math.pow(node.getLon() - previous.getLon(), 2)
                ) * 111000; // Approximate meters per degree
                cumulativeDistance += nodeDistance;
            }

            routeNodes.add(new RouteNodeDto(
                    node.getId(),
                    node.getLat(),
                    node.getLon(),
                    null,
                    null,
                    cumulativeDistance,
                    i
            ));
        }

        log.debug("Built {} route node DTOs with total distance {}", routeNodes.size(), cumulativeDistance);
        return routeNodes;
    }

    /**
     * Calculates estimated travel time based on total distance and assumed speed.
     * 
     * @param totalDistanceMeters Route distance in meters
     * @return Estimated duration in minutes
     * 
     * Example:
     *   double minutes = calculateEstimatedDurationMinutes(50000.0); // 50km
     *   System.out.println("ETA: " + minutes + " minutes");
     */
    public double calculateEstimatedDurationMinutes(double totalDistanceMeters) {
        return (totalDistanceMeters / 1000.0) / DEFAULT_SPEED_KMH * 60.0;
    }

    /**
     * Calculates estimated travel time in seconds.
     * 
     * @param totalDistanceMeters Route distance in meters
     * @return Estimated duration in seconds
     */
    public long calculateEstimatedDurationSeconds(double totalDistanceMeters) {
        double minutes = calculateEstimatedDurationMinutes(totalDistanceMeters);
        return (long) (minutes * 60);
    }

    /**
     * Converts vehicle type string to weight for routing optimization.
     * Different vehicle types have different routing preferences.
     * 
     * @param vehicleType Type of vehicle (car, bike, truck, etc.)
     * @return Vehicle weight in kg, or null for default routing
     * 
     * Example:
     *   Double weight = convertVehicleTypeToWeight("truck");
     *   // Returns 5000.0 for truck
     */
    public Double convertVehicleTypeToWeight(String vehicleType) {
        if (vehicleType == null) {
            return null;
        }

        return switch (vehicleType.toLowerCase()) {
            case "pedestrian" -> 80.0;
            case "bicycle" -> 20.0;
            case "bike" -> 20.0;
            case "motorcycle" -> 200.0;
            case "car" -> 1500.0;
            case "truck" -> 5000.0;
            case "bus" -> 10000.0;
            default -> null;
        };
    }
}
