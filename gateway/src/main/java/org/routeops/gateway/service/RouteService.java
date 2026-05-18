package org.routeops.gateway.service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.dto.route.RouteAlertDto;
import org.routeops.gateway.dto.route.RouteLocationUpdateRequest;
import org.routeops.gateway.dto.route.RouteNodeDto;
import org.routeops.gateway.dto.route.RoutePlanRequest;
import org.routeops.gateway.dto.route.RoutePlanResponse;
import org.routeops.gateway.dto.route.RouteProgressResponse;
import org.routeops.gateway.dto.route.RouteSessionResponse;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.repository.RouteSessionRepository;
import org.routeops.gateway.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RouteService is the main coordinator and facade for all route-related operations.
 * It delegates specific concerns to specialized services.
 * 
 * Architecture Overview:
 * <pre>
 *   RouteService (Coordinator)
 *   ├── RouteCalculationService    : Route planning and calculation
 *   ├── RouteProgressService       : Progress tracking along route
 *   ├── RouteStateService          : Session state management
 *   ├── RouteAlertService          : Alert management
 *   ├── RouteGeometryService       : Geometric calculations
 *   └── RouteMovementService       : Movement and speed tracking
 * </pre>
 * 
 * Public Operations:
 * - planRoute()      : Create and store a new route plan
 * - startRoute()     : Begin navigation
 * - updateLocation() : Process location update from user
 * - pauseRoute()     : Pause navigation
 * - resumeRoute()    : Resume navigation
 * - cancelRoute()    : Cancel navigation
 * - completeRoute()  : Mark navigation as complete
 * - getRouteHistory(): Retrieve past routes
 * - getRouteSession(): Retrieve session details
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteService {

    // Core dependencies
    private final RouteSessionRepository routeSessionRepository;
    private final UserRepository userRepository;

    // Distributed services - each handles specific concern
    private final RouteCalculationService calculationService;
    private final RouteProgressService progressService;
    private final RouteStateService stateService;
    private final RouteAlertService alertService;
    private final RouteMovementService movementService;

    // Session-level locking to prevent concurrent modifications
    private final ConcurrentMap<String, ReentrantLock> sessionLocks = new ConcurrentHashMap<>();

    private static final double DEFAULT_SPEED_KMH = 40.0;
    private static final double DEFAULT_DESTINATION_THRESHOLD = 100.0; // 100 meters
    private static final double DESTINATION_REACHED_THRESHOLD = 10.0;   // 10 meters

    /**
     * Plans a new route from start to destination and creates a route session.
     * 
     * This is the entry point for route planning. It:
     * 1. Validates the user exists
     * 2. Calculates optimal route using routing engine
     * 3. Persists route waypoints
     * 4. Creates alert rules if enabled
     * 5. Returns route details and estimated time
     * 
     * @param username User identifier
     * @param request Route planning request with start/end coordinates
     * @return Route plan response with waypoints and estimated travel time
     * @throws IllegalArgumentException If user not found
     * @throws IllegalStateException If routing fails
     * 
     * Example:
     * <pre>
     *   RoutePlanRequest request = new RoutePlanRequest(28.6139, 77.2090, 28.5244, 77.1855, "car");
     *   RoutePlanResponse response = routeService.planRoute("alice", request);
     *   System.out.println("Route: " + response.getSessionId());
     *   System.out.println("Distance: " + response.getTotalDistance() + " meters");
     *   System.out.println("ETA: " + response.getEstimatedDurationMinutes() + " minutes");
     * </pre>
     */
    @Transactional
    public RoutePlanResponse planRoute(String username, RoutePlanRequest request) {
        log.info("Planning route for user {} from ({},{}) to ({},{})",
                username, request.startLat(), request.startLng(), request.endLat(), request.endLng());

        // Validate user exists
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Convert vehicle type to weight parameter for routing engine
        Double vehicleWeight = calculationService.convertVehicleTypeToWeight(request.vehicleType());

        // Get optimal route from routing engine
        RouteResponse routeResponse = calculationService.planRoute(
                request.startLat(), request.startLng(),
                request.endLat(), request.endLng(), vehicleWeight);

        // Determine alert thresholds
        Double destinationThresholdMeters = request.destinationThresholdMeters() != null ?
                request.destinationThresholdMeters() : (double) DEFAULT_DESTINATION_THRESHOLD;
        Long destinationThresholdSeconds = request.destinationThresholdSeconds();
        boolean alertsEnabled = !(Double.compare(destinationThresholdMeters, 0.0) == 0 && destinationThresholdSeconds == null);

        // Create route session entity
        RouteSession session = RouteSession.builder()
                .user(user)
                .sessionName(request.sessionName() != null ? request.sessionName() :
                           String.format("Route from (%.4f,%.4f) to (%.4f,%.4f)",
                               request.startLat(), request.startLng(),
                               request.endLat(), request.endLng()))
                .startLat(request.startLat())
                .startLng(request.startLng())
                .endLat(request.endLat())
                .endLng(request.endLng())
                .startAddress(request.startAddress())
                .destinationAddress(request.destinationAddress())
                .vehicleType(request.vehicleType())
                .status(RouteSession.RouteSessionStatus.ACTIVE)
                .createdAt(Instant.now())
                .startedAt(Instant.now())
                .totalRouteDistance(routeResponse.totalDistance())
                .remainingDistance(routeResponse.totalDistance())
                .completedDistance(0.0)
                .currentNodeIndex(0)
                .destinationThresholdMeters(destinationThresholdMeters)
                .destinationThresholdSeconds(destinationThresholdSeconds)
                .destinationAlertTriggered(false)
                .build();

        // Store route nodes and serialize as JSON
        String routeJson = calculationService.storeRouteNodes(session, routeResponse);
        session.setPlannedRouteJson(routeJson);
        session = routeSessionRepository.save(session);

        // Create destination alert if alerts are enabled
        if (alertsEnabled) {
            alertService.createDestinationAlert(session, destinationThresholdMeters, destinationThresholdSeconds);
        }

        // Calculate estimated travel time
        double estimatedDurationMinutes = calculationService.calculateEstimatedDurationMinutes(
                routeResponse.totalDistance());
        long estimatedDurationSeconds = calculationService.calculateEstimatedDurationSeconds(
                routeResponse.totalDistance());

        // Parse route nodes for response
        List<RouteNodeDto> routeNodes = calculationService.buildRouteNodeDtos(routeResponse.path());

        log.info("Route planned successfully for user {} - {} meters in {} minutes",
                username, routeResponse.totalDistance(), estimatedDurationMinutes);

        return new RoutePlanResponse(
                session.getId(),
                session.getSessionName(),
                session.getStartLat(),
                session.getStartLng(),
                session.getEndLat(),
                session.getEndLng(),
                session.getStartAddress(),
                session.getDestinationAddress(),
                session.getTotalRouteDistance(),
                estimatedDurationMinutes,
                estimatedDurationSeconds,
                routeNodes,
                "Route planned and navigation started successfully"
        );
    }

    /**
     * Starts an inactive route session, transitioning from PLANNED to ACTIVE.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session details
     * 
     * Example:
     *   RouteSessionResponse response = routeService.startRoute("alice", "route-123");
     *   assert response.getStatus() == "ACTIVE";
     */
    @Transactional
    public RouteSessionResponse startRoute(String username, String sessionId) {
        return withSessionLock(sessionId, () -> {
            RouteSession session = stateService.startRoute(username, sessionId);
            return mapToSessionResponse(session);
        });
    }

    /**
     * Updates user location during navigation.
     * 
     * This is the core tracking method that:
     * 1. Validates session state
     * 2. Calculates movement metrics (speed, distance)
     * 3. Determines progress along route
     * 4. Detects route deviations and triggers reroute if needed
     * 5. Checks alert conditions (destination approach)
     * 6. Updates session state
     * 
     * @param username User identifier
     * @param request Location update with coordinates and optional speed
     * @return Route progress response with current status and alerts
     * 
     * Example:
     * <pre>
     *   RouteLocationUpdateRequest update = new RouteLocationUpdateRequest(
     *       "route-123", 28.6100, 77.2100, 35.0);
     *   RouteProgressResponse progress = routeService.updateLocation("alice", update);
     *   System.out.println("Completed: " + progress.getCompletedDistance() + "m");
     *   System.out.println("Remaining: " + progress.getRemainingDistance() + "m");
     *   if (!progress.isOnRoute()) {
     *       System.out.println("WARNING: Deviated " + progress.getDeviationDistance() + "m");
     *   }
     * </pre>
     */
    @Transactional
    public RouteProgressResponse updateLocation(String username, RouteLocationUpdateRequest request) {
        return withSessionLock(request.sessionId(), () -> doUpdateLocation(username, request));
    }

    /**
     * Internal method for location update processing.
     * Separated for cleaner locking logic.
     */
    private RouteProgressResponse doUpdateLocation(String username, RouteLocationUpdateRequest request) {
        log.debug("Updating location for session {} at ({},{})",
                request.sessionId(), request.latitude(), request.longitude());

        // Get and validate session
        RouteSession session = stateService.getRouteSession(username, request.sessionId());

        if (session.getStatus() == RouteSession.RouteSessionStatus.CANCELLED ||
                session.getStatus() == RouteSession.RouteSessionStatus.COMPLETED ||
                session.getStatus() == RouteSession.RouteSessionStatus.REACHED) {
            throw new IllegalStateException(
                    "Route session cannot accept location updates in current state: " + session.getStatus());
        }

        Instant now = Instant.now();

        // Calculate movement metrics
        RouteMovementService.MovementMetrics movementMetrics = movementService.calculateMovementMetrics(
                session, request.latitude(), request.longitude(), now);
        
        // Resolve speed (calculated > requested > default)
        double calculatedSpeedKmh = movementService.resolveSpeed(
                movementMetrics.getSpeedKmh(),
                request.speedKmh(),
                DEFAULT_SPEED_KMH
        );

        // Update session with movement data
        movementService.updateSessionMovement(session, request.latitude(), request.longitude(),
                calculatedSpeedKmh, movementMetrics.getDistanceMeters(),
                movementMetrics.getDurationSeconds(), now);

        // Auto-pause/resume based on movement
        if (!Boolean.TRUE.equals(session.getUserPausedByCommand())) {
            boolean isMoving = movementService.isUserMoving(
                    movementMetrics.getDistanceMeters(), calculatedSpeedKmh);
            stateService.updateMovementStatus(session, isMoving);
        }

        // Calculate progress along route
        RouteProgressService.RouteProgress progress = progressService.calculateProgress(
                session, request.latitude(), request.longitude());

        // Detect route deviation and reroute if necessary
        if (!progress.isOnRoute()) {
            handleOffRouteCondition(session, request.latitude(), request.longitude());
            // Recalculate progress with new route
            progress = progressService.calculateProgress(session, request.latitude(), request.longitude());
        }

        // Update progress metrics in session
        session.setRemainingDistance(progress.getRemainingDistance());
        session.setCompletedDistance(progress.getCompletedDistance());
        session.setCurrentNodeIndex(progress.getCurrentNodeIndex());

        // Calculate ETA
        long estimatedTimeToDestinationSeconds = calculateEstimatedTimeSeconds(
                progress.getRemainingDistance(), calculatedSpeedKmh);
        session.setEstimatedTimeToDestinationSeconds(estimatedTimeToDestinationSeconds);

        // Get remaining path nodes
        List<RouteNodeDto> remainingPathNodes = progressService.getRemainingPathNodes(
                session, progress.getCurrentNodeIndex());

        // Check for destination alerts
        List<RouteAlertDto> activeAlerts = alertService.checkAndTriggerAlerts(
                session, progress.getRemainingDistance(), estimatedTimeToDestinationSeconds,
                request.latitude(), request.longitude());

        // Calculate next alarm trigger time
        List<AlertRule> alertRules = alertService.getAlertRulesForSession(session);
        RouteAlertService.NextAlarmInfo nextAlarmInfo = alertService.calculateNextAlarmTriggerTime(
                alertRules, progress.getRemainingDistance(), estimatedTimeToDestinationSeconds, calculatedSpeedKmh);

        // Check if reached destination
        if (progress.getRemainingDistance() <= DESTINATION_REACHED_THRESHOLD) {
            session = stateService.markAsReached(username, request.sessionId());
        } else {
            session = routeSessionRepository.save(session);
        }

        // Build response
        double progressPercentage = session.getTotalRouteDistance() > 0 ?
                (session.getCompletedDistance() / session.getTotalRouteDistance()) * 100.0 : 0.0;
        double remainingDistanceKm = progress.getRemainingDistance() / 1000.0;

        log.debug("Location update processed - Progress: {}%, Remaining: {}m, Speed: {}km/h",
                progressPercentage, progress.getRemainingDistance(), calculatedSpeedKmh);

        return new RouteProgressResponse(
                session.getId(),
                session.getStatus().toString(),
                session.getCurrentLat(),
                session.getCurrentLng(),
                session.getRemainingDistance(),
                remainingDistanceKm,
                session.getCompletedDistance(),
                progressPercentage,
                session.getCurrentNodeIndex(),
                progress.isOnRoute(),
                progress.getDeviationDistance(),
                activeAlerts,
                progress.getNextInstruction(),
                progress.getDistanceToNext(),
                remainingPathNodes,
                session.getCurrentSpeedKmh(),
                session.getLastSegmentDistanceMeters(),
                session.getLastSegmentDurationSeconds(),
                estimatedTimeToDestinationSeconds,
                nextAlarmInfo.nextAlarmTriggerTimeSeconds,
                nextAlarmInfo.nextAlarmThresholdMeters
        );
    }

    /**
     * Handles off-route condition by triggering reroute if needed.
     */
    private void handleOffRouteCondition(RouteSession session, double currentLat, double currentLng) {
        log.warn("User deviated from route for session {}. Triggering reroute from ({},{})",
                session.getId(), currentLat, currentLng);

        Double vehicleWeight = calculationService.convertVehicleTypeToWeight(session.getVehicleType());
        RouteResponse rerouteResponse = calculationService.rerouteFromPosition(
                currentLat, currentLng,
                session.getEndLat(), session.getEndLng(),
                vehicleWeight);

        if (rerouteResponse != null && !rerouteResponse.path().isEmpty()) {
            String routeJson = calculationService.updateRouteNodes(session, rerouteResponse);
            session.setPlannedRouteJson(routeJson);
            session.setTotalRouteDistance(rerouteResponse.totalDistance());
            log.info("Reroute successful for session {} with new distance {}m",
                    session.getId(), rerouteResponse.totalDistance());
        } else {
            log.warn("Reroute failed for session {}", session.getId());
        }
    }

    /**
     * Pauses an active route session.
     * Maintains current position but stops progress tracking until resumed.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session details with PAUSED status
     */
    @Transactional
    public RouteSessionResponse pauseRoute(String username, String sessionId) {
        return withSessionLock(sessionId, () -> {
            RouteSession session = stateService.pauseRoute(username, sessionId);
            return mapToSessionResponse(session);
        });
    }

    /**
     * Resumes a paused route session.
     * Continues navigation from current position.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session details with ACTIVE status
     */
    @Transactional
    public RouteSessionResponse resumeRoute(String username, String sessionId) {
        return withSessionLock(sessionId, () -> {
            RouteSession session = stateService.resumeRoute(username, sessionId);
            return mapToSessionResponse(session);
        });
    }

    /**
     * Cancels a route session.
     * Navigation terminates and session becomes unmodifiable.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session details with CANCELLED status
     */
    @Transactional
    public RouteSessionResponse cancelRoute(String username, String sessionId) {
        return withSessionLock(sessionId, () -> {
            RouteSession session = stateService.cancelRoute(username, sessionId);
            return mapToSessionResponse(session);
        });
    }

    /**
     * Marks a route session as complete.
     * Called when user explicitly finishes navigation or destination is reached.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Updated session details with COMPLETED status
     */
    @Transactional
    public RouteSessionResponse completeRoute(String username, String sessionId) {
        return withSessionLock(sessionId, () -> {
            RouteSession session = stateService.completeRoute(username, sessionId);
            return mapToSessionResponse(session);
        });
    }

    /**
     * Retrieves all historical route sessions for a user.
     * Only returns sessions in terminal states: COMPLETED, REACHED, CANCELLED.
     * 
     * @param username User identifier
     * @return List of historical route sessions
     */
    public List<RouteSessionResponse> getRouteHistory(String username) {
        return stateService.getRouteHistory(username)
                .stream()
                .map(this::mapToSessionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all route sessions for a user in any state.
     * 
     * @param username User identifier
     * @return List of all user route sessions
     */
    public List<RouteSessionResponse> getUserRouteSessions(String username) {
        return stateService.getAllUserSessions(username)
                .stream()
                .map(this::mapToSessionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a specific route session by ID.
     * 
     * @param username User identifier
     * @param sessionId Route session identifier
     * @return Session details
     */
    public RouteSessionResponse getRouteSession(String username, String sessionId) {
        RouteSession session = stateService.getRouteSession(username, sessionId);
        return mapToSessionResponse(session);
    }

    /**
     * Converts RouteSession to RouteSessionResponse DTO.
     * Maps entity fields to response object for API consumption.
     */
    private RouteSessionResponse mapToSessionResponse(RouteSession session) {
        double remainingDistanceKm = session.getRemainingDistance() != null ?
                session.getRemainingDistance() / 1000.0 : 0.0;

        return new RouteSessionResponse(
                session.getId(),
                session.getSessionName(),
                session.getStartLat(),
                session.getStartLng(),
                session.getEndLat(),
                session.getEndLng(),
                session.getStartAddress(),
                session.getDestinationAddress(),
                session.getVehicleType(),
                session.getStatus().toString(),
                session.getCreatedAt(),
                session.getStartedAt(),
                session.getCompletedAt(),
                session.getTotalRouteDistance(),
                session.getRemainingDistance(),
                remainingDistanceKm,
                session.getCompletedDistance(),
                session.getCurrentLat(),
                session.getCurrentLng(),
                session.getLastLocationUpdate(),
                session.getCurrentSpeedKmh(),
                session.getLastSegmentDistanceMeters(),
                session.getLastSegmentDurationSeconds(),
                session.getEstimatedTimeToDestinationSeconds(),
                session.getDestinationAlertTriggered(),
                session.getDestinationAlertTriggeredAt()
        );
    }

    /**
     * Calculates estimated time to destination based on distance and speed.
     * Used for ETA calculations in progress responses.
     * 
     * @param distanceMeters Distance remaining (meters)
     * @param speedKmh Current speed (kilometers per hour)
     * @return Estimated time in seconds
     */
    private long calculateEstimatedTimeSeconds(double distanceMeters, double speedKmh) {
        if (speedKmh <= 0) {
            return 0;
        }
        double distanceKm = distanceMeters / 1000.0;
        double hoursToDestination = distanceKm / speedKmh;
        return Math.round(hoursToDestination * 3600);
    }

    /**
     * Executes an action with per-session locking to prevent concurrent modifications.
     * Ensures thread-safe session updates during location tracking.
     * 
     * @param sessionId Session identifier for locking
     * @param action Action to execute within lock
     * @return Action result
     */
    private <T> T withSessionLock(String sessionId, Supplier<T> action) {
        ReentrantLock lock = sessionLocks.computeIfAbsent(sessionId, ignored -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                sessionLocks.remove(sessionId, lock);
            }
        }
    }
}