package org.routeops.gateway.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.routeops.gateway.dto.route.RouteNodeDto;
import org.routeops.gateway.entity.RouteSession;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * RouteProgressService calculates and tracks the user's progress along the planned route.
 * 
 * Responsibilities:
 * - Calculate remaining and completed distance
 * - Determine current node index and next instruction
 * - Detect route deviations
 * - Calculate progress percentage
 * 
 * Usage Example:
 * <pre>
 *   RouteProgress progress = routeProgressService.calculateProgress(session, currentLat, currentLng);
 *   System.out.println("Progress: " + progress.getCompletedDistance() + "m");
 *   System.out.println("Deviation: " + progress.getDeviationDistance() + "m");
 *   System.out.println("On route: " + progress.isOnRoute());
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteProgressService {

    private final RouteGeometryService geometryService;
    private final ObjectMapper objectMapper;

    /**
     * Calculates the user's current progress along the route.
     * 
     * @param session Current route session containing route data
     * @param currentLat User's current latitude (degrees)
     * @param currentLng User's current longitude (degrees)
     * @return RouteProgress containing distance, node index, and instruction information
     * 
     * Example:
     *   RouteProgress progress = calculateProgress(session, 28.6139, 77.2090);
     *   if (!progress.isOnRoute()) {
     *       log.warn("User deviated " + progress.getDeviationDistance() + "m");
     *   }
     */
    public RouteProgress calculateProgress(RouteSession session, double currentLat, double currentLng) {
        List<RouteNodeDto> routeNodes = parsePlannedRoute(session);
        
        if (routeNodes.isEmpty()) {
            // No route nodes - direct line to destination
            return calculateDirectProgress(session, currentLat, currentLng);
        }

        // Project current location onto route
        RouteGeometryService.RouteProjection projection = geometryService.projectToRoute(
                routeNodes, currentLat, currentLng);
        
        double totalDistance = session.getTotalRouteDistance() != null ? 
                session.getTotalRouteDistance() : 
                routeNodes.get(routeNodes.size() - 1).distanceFromStart();
        
        // Calculate distances
        double remainingDistance = Math.max(0.0, totalDistance - projection.getDistanceAlongRoute());
        double completedDistance = Math.max(0.0, projection.getDistanceAlongRoute());
        
        // Check if on route
        boolean onRoute = !geometryService.isOffRoute(projection.getDeviationDistance());

        // Find next node instruction
        int currentNodeIndex = Math.min(routeNodes.size() - 1, projection.getClosestSegmentIndex() + 1);
        RouteNodeDto nextNode = routeNodes.get(currentNodeIndex);
        String nextInstruction = nextNode.instruction() != null ? 
                nextNode.instruction() : "Follow route to next waypoint";
        
        // Calculate distance to next node
        double distanceToNext = geometryService.calculateHaversineDistance(
                currentLat, currentLng, nextNode.latitude(), nextNode.longitude());

        return new RouteProgress(
                remainingDistance,
                completedDistance,
                currentNodeIndex,
                onRoute,
                projection.getDeviationDistance(),
                nextInstruction,
                distanceToNext
        );
    }

    /**
     * Calculates progress when no intermediate nodes exist - direct line to destination.
     */
    private RouteProgress calculateDirectProgress(RouteSession session, double currentLat, double currentLng) {
        double distanceToDestination = geometryService.calculateHaversineDistance(
                currentLat, currentLng, session.getEndLat(), session.getEndLng());
        double completedDistance = Math.max(0.0, session.getTotalRouteDistance() - distanceToDestination);
        
        return new RouteProgress(
                distanceToDestination,
                completedDistance,
                0,
                true,
                0.0,
                "Proceed toward destination",
                distanceToDestination
        );
    }

    /**
     * Parses the planned route JSON stored in the session.
     * 
     * @param session Route session containing serialized route data
     * @return List of route nodes, or empty list if parsing fails
     */
    private List<RouteNodeDto> parsePlannedRoute(RouteSession session) {
        if (session.getPlannedRouteJson() == null || session.getPlannedRouteJson().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(session.getPlannedRouteJson(), 
                    new TypeReference<List<RouteNodeDto>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize planned route from session {}", session.getId(), e);
            return List.of();
        }
    }

    /**
     * Gets remaining nodes from current position onwards.
     * Used to provide upcoming waypoints to the user.
     * 
     * @param session Current route session
     * @param currentNodeIndex Index of current node
     * @return List of remaining route nodes
     */
    public List<RouteNodeDto> getRemainingPathNodes(RouteSession session, int currentNodeIndex) {
        List<RouteNodeDto> allNodes = parsePlannedRoute(session);
        if (allNodes.isEmpty() || currentNodeIndex >= allNodes.size()) {
            return List.of();
        }
        return allNodes.subList(Math.max(0, currentNodeIndex), allNodes.size());
    }

    /**
     * RouteProgress contains calculated metrics about user's position on the route.
     */
    public static class RouteProgress {
        private final double remainingDistance;
        private final double completedDistance;
        private final int currentNodeIndex;
        private final boolean onRoute;
        private final double deviationDistance;
        private final String nextInstruction;
        private final double distanceToNext;

        /**
         * Create route progress snapshot
         * @param remainingDistance Distance to destination (meters)
         * @param completedDistance Distance traveled since start (meters)
         * @param currentNodeIndex Index of next waypoint
         * @param onRoute Whether user is within acceptable route tolerance
         * @param deviationDistance How far user is from planned route (meters)
         * @param nextInstruction Navigation instruction for next segment
         * @param distanceToNext Distance to next waypoint (meters)
         */
        public RouteProgress(double remainingDistance, double completedDistance, int currentNodeIndex,
                           boolean onRoute, double deviationDistance, String nextInstruction, double distanceToNext) {
            this.remainingDistance = remainingDistance;
            this.completedDistance = completedDistance;
            this.currentNodeIndex = currentNodeIndex;
            this.onRoute = onRoute;
            this.deviationDistance = deviationDistance;
            this.nextInstruction = nextInstruction;
            this.distanceToNext = distanceToNext;
        }

        public double getRemainingDistance() { return remainingDistance; }
        public double getCompletedDistance() { return completedDistance; }
        public int getCurrentNodeIndex() { return currentNodeIndex; }
        public boolean isOnRoute() { return onRoute; }
        public double getDeviationDistance() { return deviationDistance; }
        public String getNextInstruction() { return nextInstruction; }
        public double getDistanceToNext() { return distanceToNext; }
    }
}
