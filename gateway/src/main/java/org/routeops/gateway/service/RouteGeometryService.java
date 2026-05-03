package org.routeops.gateway.service;

import org.routeops.gateway.dto.route.RouteNodeDto;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * RouteGeometryService handles all geometric and distance calculations for route management.
 * 
 * Responsibilities:
 * - Calculate distances between geographic coordinates using Haversine formula
 * - Project user location onto the route to determine deviation
 * - Calculate route segments and intersections
 * 
 * Usage Example:
 * <pre>
 *   double distance = routeGeometryService.calculateHaversineDistance(lat1, lng1, lat2, lng2);
 *   RouteProjection projection = routeGeometryService.projectToRoute(routeNodes, currentLat, currentLng);
 *   double deviation = projection.getDeviationDistance();
 * </pre>
 */
@Service
@Slf4j
public class RouteGeometryService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private static final double OFF_ROUTE_THRESHOLD_METERS = 40.0;

    /**
     * Calculates the great-circle distance between two geographic points using Haversine formula.
     * 
     * @param lat1 Latitude of first point (degrees)
     * @param lng1 Longitude of first point (degrees)
     * @param lat2 Latitude of second point (degrees)
     * @param lng2 Longitude of second point (degrees)
     * @return Distance in meters
     * 
     * Example:
     *   double distance = calculateHaversineDistance(28.7041, 77.1025, 28.5244, 77.1855);
     *   // Returns distance between two Delhi locations in meters
     */
    public double calculateHaversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Projects the user's current location onto the planned route to determine:
     * - How far along the route they are
     * - How far they've deviated from the route
     * - Which route segment they're closest to
     * 
     * @param routeNodes List of route waypoints
     * @param currentLat Current latitude (degrees)
     * @param currentLng Current longitude (degrees)
     * @return RouteProjection containing deviation and route distance information
     * 
     * Example:
     *   RouteProjection proj = projectToRoute(nodes, 28.6139, 77.2090);
     *   if (proj.getDeviationDistance() > 40.0) { // off route
     *       System.out.println("User is " + proj.getDeviationDistance() + "m off route");
     *   }
     */
    public RouteProjection projectToRoute(java.util.List<RouteNodeDto> routeNodes, double currentLat, double currentLng) {
        double bestDistance = Double.MAX_VALUE;
        double bestDistanceAlongRoute = 0.0;
        int bestSegmentIndex = 0;

        // Find closest point on route by checking all segments
        for (int i = 0; i < routeNodes.size() - 1; i++) {
            RouteNodeDto start = routeNodes.get(i);
            RouteNodeDto end = routeNodes.get(i + 1);
            ProjectionResult projection = projectPointToSegment(start, end, currentLat, currentLng);
            double distanceAlongRoute = start.distanceFromStart() + projection.distanceFromStartSegment();
            if (projection.deviationDistance() < bestDistance) {
                bestDistance = projection.deviationDistance();
                bestDistanceAlongRoute = distanceAlongRoute;
                bestSegmentIndex = i;
            }
        }

        // Handle single node case
        if (routeNodes.size() == 1) {
            RouteNodeDto onlyNode = routeNodes.get(0);
            double distanceToPoint = calculateHaversineDistance(currentLat, currentLng, 
                    onlyNode.latitude(), onlyNode.longitude());
            bestDistance = distanceToPoint;
            bestDistanceAlongRoute = onlyNode.distanceFromStart();
        }

        return new RouteProjection(bestDistanceAlongRoute, bestDistance, bestSegmentIndex);
    }

    /**
     * Projects a point onto a line segment to find the closest point on that segment.
     * Uses vector projection mathematics to find perpendicular or endpoint intersection.
     * 
     * @param start Route node representing segment start
     * @param end Route node representing segment end
     * @param lat Point latitude (degrees)
     * @param lng Point longitude (degrees)
     * @return ProjectionResult with deviation distance and distance along segment
     */
    private ProjectionResult projectPointToSegment(RouteNodeDto start, RouteNodeDto end, 
                                                   double lat, double lng) {
        // Convert to cartesian coordinates for projection math
        double referenceLat = Math.toRadians((start.latitude() + end.latitude()) / 2.0);
        double startX = Math.toRadians(start.longitude()) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double startY = Math.toRadians(start.latitude()) * EARTH_RADIUS_METERS;
        double endX = Math.toRadians(end.longitude()) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double endY = Math.toRadians(end.latitude()) * EARTH_RADIUS_METERS;
        double pointX = Math.toRadians(lng) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double pointY = Math.toRadians(lat) * EARTH_RADIUS_METERS;

        // Calculate projection of point onto line segment
        double dx = endX - startX;
        double dy = endY - startY;
        double segmentLengthSquared = dx * dx + dy * dy;
        double t = 0.0;
        if (segmentLengthSquared > 0) {
            t = ((pointX - startX) * dx + (pointY - startY) * dy) / segmentLengthSquared;
            t = Math.max(0.0, Math.min(1.0, t)); // Clamp to segment
        }

        double projectedX = startX + t * dx;
        double projectedY = startY + t * dy;
        double deviationDistance = Math.hypot(pointX - projectedX, pointY - projectedY);
        double distanceFromStartSegment = Math.hypot(projectedX - startX, projectedY - startY);
        return new ProjectionResult(deviationDistance, distanceFromStartSegment);
    }

    /**
     * Checks if user has deviated beyond acceptable threshold from the planned route.
     * 
     * @param deviationDistance Deviation from route in meters
     * @return true if user is significantly off route and needs rerouting
     */
    public boolean isOffRoute(double deviationDistance) {
        return deviationDistance > OFF_ROUTE_THRESHOLD_METERS;
    }

    /**
     * Inner class representing a projection of a point onto the route.
     * Stores distance information for route tracking and deviation detection.
     */
    public static class RouteProjection {
        private final double distanceAlongRoute;
        private final double deviationDistance;
        private final int closestSegmentIndex;

        /**
         * Create a new route projection result
         * @param distanceAlongRoute Distance traveled along the route from start (meters)
         * @param deviationDistance How far user is from the route (meters)
         * @param closestSegmentIndex Index of the closest route segment
         */
        public RouteProjection(double distanceAlongRoute, double deviationDistance, int closestSegmentIndex) {
            this.distanceAlongRoute = distanceAlongRoute;
            this.deviationDistance = deviationDistance;
            this.closestSegmentIndex = closestSegmentIndex;
        }

        public double getDistanceAlongRoute() { return distanceAlongRoute; }
        public double getDeviationDistance() { return deviationDistance; }
        public int getClosestSegmentIndex() { return closestSegmentIndex; }
    }

    /**
     * Inner class representing the result of projecting a point onto a line segment.
     */
    private static class ProjectionResult {
        private final double deviationDistance;
        private final double distanceFromStartSegment;

        ProjectionResult(double deviationDistance, double distanceFromStartSegment) {
            this.deviationDistance = deviationDistance;
            this.distanceFromStartSegment = distanceFromStartSegment;
        }

        double deviationDistance() {
            return deviationDistance;
        }

        double distanceFromStartSegment() {
            return distanceFromStartSegment;
        }
    }
}
