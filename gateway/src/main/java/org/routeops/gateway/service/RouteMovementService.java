package org.routeops.gateway.service;

import java.time.Instant;

import org.routeops.gateway.entity.RouteSession;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RouteMovementService calculates movement metrics based on location updates.
 * 
 * Responsibilities:
 * - Calculate speed from location deltas
 * - Detect when user is moving vs stopped
 * - Track movement history
 * - Calculate movement-based metrics
 * 
 * Usage Example:
 * <pre>
 *   MovementMetrics metrics = routeMovementService.calculateMovementMetrics(
 *       session, currentLat, currentLng, now);
 *   
 *   double speedKmh = metrics.getSpeedKmh();
 *   boolean isMoving = speedKmh >= AUTO_RESUME_SPEED_THRESHOLD_KMH;
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteMovementService {

    private final RouteGeometryService geometryService;

    private static final double AUTO_MOVEMENT_DISTANCE_THRESHOLD_METERS = 4.0;
    private static final double AUTO_RESUME_SPEED_THRESHOLD_KMH = 2.5;

    /**
     * Calculates movement metrics between two location points.
     * 
     * @param session Current route session
     * @param currentLat Current latitude (degrees)
     * @param currentLng Current longitude (degrees)
     * @param now Current timestamp
     * @return MovementMetrics containing distance, duration, and calculated speed
     * 
     * Example:
     *   MovementMetrics metrics = calculateMovementMetrics(session, 28.6139, 77.2090, Instant.now());
     *   System.out.println("User moved " + metrics.getDistanceMeters() + "m");
     *   System.out.println("Speed: " + metrics.getSpeedKmh() + " km/h");
     */
    public MovementMetrics calculateMovementMetrics(RouteSession session, double currentLat, double currentLng, 
                                                     Instant now) {
        // If this is the first location update, return zero metrics
        if (session.getLastMovementLat() == null || session.getLastMovementLng() == null || 
            session.getLastMovementAt() == null) {
            return new MovementMetrics(0.0, 0L, 0.0);
        }

        // Calculate time elapsed since last update
        long durationSeconds = Math.max(0L, now.getEpochSecond() - session.getLastMovementAt().getEpochSecond());

        // Calculate distance traveled
        double distanceMeters = geometryService.calculateHaversineDistance(
                session.getLastMovementLat(), session.getLastMovementLng(), currentLat, currentLng);

        // If no time has elapsed, can't calculate speed
        if (durationSeconds <= 0L || distanceMeters <= 0.0) {
            return new MovementMetrics(distanceMeters, durationSeconds, 0.0);
        }

        // Calculate speed in km/h from meters and seconds
        double speedKmh = (distanceMeters / durationSeconds) * 3.6;
        
        log.debug("Movement metrics - Distance: {}m, Duration: {}s, Speed: {}km/h", 
                distanceMeters, durationSeconds, speedKmh);
        
        return new MovementMetrics(distanceMeters, durationSeconds, speedKmh);
    }

    /**
     * Determines if the user is currently moving based on distance and speed thresholds.
     * 
     * @param distanceMeters Distance traveled in last update (meters)
     * @param speedKmh Current calculated speed (kilometers per hour)
     * @return true if user is moving significantly, false if stopped/barely moving
     * 
     * Example:
     *   boolean isMoving = isUserMoving(5.0, 3.0);
     *   // User moved 5m at 3 km/h - returns true
     */
    public boolean isUserMoving(double distanceMeters, double speedKmh) {
        boolean enoughDistance = distanceMeters >= AUTO_MOVEMENT_DISTANCE_THRESHOLD_METERS;
        boolean enoughSpeed = speedKmh >= AUTO_RESUME_SPEED_THRESHOLD_KMH;
        
        boolean moving = enoughDistance && enoughSpeed;
        
        if (!moving) {
            log.debug("User not moving - Distance: {}m (threshold: {}m), Speed: {}km/h (threshold: {}km/h)",
                    distanceMeters, AUTO_MOVEMENT_DISTANCE_THRESHOLD_METERS, speedKmh, AUTO_RESUME_SPEED_THRESHOLD_KMH);
        }
        
        return moving;
    }

    /**
     * Resolves the actual speed to use for calculations.
     * Prefers calculated speed from location deltas, falls back to provided speed, then default.
     * 
     * @param calculatedSpeedKmh Speed calculated from movement metrics (may be 0)
     * @param requestedSpeedKmh Speed provided by client (may be null or invalid)
     * @param defaultSpeedKmh Default speed to use as fallback
     * @return Resolved speed to use for navigation calculations (km/h)
     * 
     * Example:
     *   double speed = resolveSpeed(5.0, null, 40.0);
     *   // Uses 5.0 km/h from calculated
     *   
     *   double speed = resolveSpeed(0.0, 45.0, 40.0);
     *   // Uses 45.0 km/h from request since calculated is 0
     *   
     *   double speed = resolveSpeed(0.0, null, 40.0);
     *   // Uses 40.0 km/h default
     */
    public double resolveSpeed(double calculatedSpeedKmh, Double requestedSpeedKmh, double defaultSpeedKmh) {
        // Prefer calculated speed if > 0
        if (calculatedSpeedKmh > 0) {
            return calculatedSpeedKmh;
        }

        // Fall back to requested speed if valid
        if (requestedSpeedKmh != null && requestedSpeedKmh > 0) {
            return requestedSpeedKmh;
        }

        // Use default
        return defaultSpeedKmh;
    }

    /**
     * Updates the session with the latest movement information.
     * 
     * @param session Session to update
     * @param currentLat New latitude (degrees)
     * @param currentLng New longitude (degrees)
     * @param speedKmh Current speed (km/h)
     * @param distanceMeters Distance of last movement (meters)
     * @param durationSeconds Duration of last movement (seconds)
     * @param now Current timestamp
     * 
     * Example:
     *   updateSessionMovement(session, 28.6139, 77.2090, 35.5, 10.0, 1, Instant.now());
     */
    public void updateSessionMovement(RouteSession session, double currentLat, double currentLng,
                                     double speedKmh, double distanceMeters, long durationSeconds, Instant now) {
        session.setCurrentLat(currentLat);
        session.setCurrentLng(currentLng);
        session.setLastLocationUpdate(now);
        session.setCurrentSpeedKmh(speedKmh);
        session.setLastSegmentDistanceMeters(distanceMeters);
        session.setLastSegmentDurationSeconds(durationSeconds);
        session.setLastMovementLat(currentLat);
        session.setLastMovementLng(currentLng);
        session.setLastMovementAt(now);
        
        log.debug("Updated session {} movement - Position: ({},{}), Speed: {}km/h", 
                session.getId(), currentLat, currentLng, speedKmh);
    }

    /**
     * Gets the speed threshold used for auto-resume (when paused user resumes moving).
     * @return Speed threshold in km/h
     */
    public double getAutoResumeSpeedThreshold() {
        return AUTO_RESUME_SPEED_THRESHOLD_KMH;
    }

    /**
     * Gets the distance threshold for detecting movement.
     * @return Distance threshold in meters
     */
    public double getAutoMovementDistanceThreshold() {
        return AUTO_MOVEMENT_DISTANCE_THRESHOLD_METERS;
    }

    /**
     * MovementMetrics stores calculated movement information from location updates.
     */
    public static class MovementMetrics {
        private final double distanceMeters;
        private final long durationSeconds;
        private final double speedKmh;

        /**
         * Create movement metrics
         * @param distanceMeters Distance traveled (meters)
         * @param durationSeconds Time taken (seconds)
         * @param speedKmh Calculated speed (kilometers per hour)
         */
        public MovementMetrics(double distanceMeters, long durationSeconds, double speedKmh) {
            this.distanceMeters = distanceMeters;
            this.durationSeconds = durationSeconds;
            this.speedKmh = speedKmh;
        }

        public double getDistanceMeters() { return distanceMeters; }
        public long getDurationSeconds() { return durationSeconds; }
        public double getSpeedKmh() { return speedKmh; }
    }
}
