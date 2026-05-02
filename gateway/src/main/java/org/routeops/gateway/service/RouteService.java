package org.routeops.gateway.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.dto.route.*;
import org.routeops.gateway.entity.RouteNode;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.repository.RouteNodeRepository;
import org.routeops.gateway.repository.RouteSessionRepository;
import org.routeops.gateway.repository.AlertRuleRepository;
import org.routeops.gateway.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteService {

    private final RoutingService routingService;
    private final RouteSessionRepository routeSessionRepository;
    private final RouteNodeRepository routeNodeRepository;
    private final AlertRuleRepository alertRuleRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private static final double DEFAULT_SPEED_KMH = 40.0;
    private static final double DEFAULT_DESTINATION_THRESHOLD = 100.0; // 100 meters
    private static final double OFF_ROUTE_THRESHOLD_METERS = 40.0; // trigger reroute when user deviates from route

    @Transactional
    public RoutePlanResponse planRoute(String username, RoutePlanRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Get route from routing engine
        RouteResponse routeResponse = routingService.getOptimalRoute(
                request.startLat(), request.startLng(),
                request.endLat(), request.endLng(), null);

        if (routeResponse == null || routeResponse.path() == null) {
            throw new IllegalStateException("Unable to calculate route");
        }

        // Create route session
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
                .status(RouteSession.RouteSessionStatus.PLANNED)
                .createdAt(Instant.now())
                .totalRouteDistance(routeResponse.totalDistance())
                .remainingDistance(routeResponse.totalDistance())
                .completedDistance(0.0)
                .currentNodeIndex(0)
                .destinationThresholdMeters(request.destinationThresholdMeters() != null ?
                                          request.destinationThresholdMeters() : DEFAULT_DESTINATION_THRESHOLD)
                .destinationAlertTriggered(false)
                .build();

        // Store route nodes with distance from start
        List<RouteNodeDto> routeNodes = buildRouteNodeDtos(routeResponse.path());
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

        // Store planned route as JSON
        try {
            session.setPlannedRouteJson(objectMapper.writeValueAsString(routeNodes));
        } catch (Exception e) {
            log.error("Failed to serialize route nodes", e);
        }

        session = routeSessionRepository.save(session);

        // Create default destination alert rule
        AlertRule destinationAlert = AlertRule.builder()
                .name("Destination Approach Alert")
                .message("You are approaching your destination")
                .routeSession(session)
                .alertType(AlertRule.AlertType.DESTINATION_APPROACH)
                .thresholdDistanceMeters(session.getDestinationThresholdMeters())
                .enabled(true)
                .createdAt(Instant.now())
                .build();
        alertRuleRepository.save(destinationAlert);

        double estimatedDuration = routeResponse.totalDistance() / 1000.0 / DEFAULT_SPEED_KMH * 60.0;

        return new RoutePlanResponse(
                session.getId(),
                session.getSessionName(),
                session.getStartLat(),
                session.getStartLng(),
                session.getEndLat(),
                session.getEndLng(),
                session.getTotalRouteDistance(),
                estimatedDuration,
                routeNodes,
                "Route planned successfully"
        );
    }

    @Transactional
    public RouteSessionResponse startRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() != RouteSession.RouteSessionStatus.PLANNED) {
            throw new IllegalStateException("Route session is not in planned state");
        }

        session.setStatus(RouteSession.RouteSessionStatus.ACTIVE);
        session.setStartedAt(Instant.now());
        session = routeSessionRepository.save(session);

        return mapToSessionResponse(session);
    }

    @Transactional
    public RouteProgressResponse updateLocation(String username, RouteLocationUpdateRequest request) {
        RouteSession session = getUserRouteSession(username, request.sessionId());

        if (session.getStatus() != RouteSession.RouteSessionStatus.ACTIVE) {
            throw new IllegalStateException("Route session is not active");
        }

        // Update current position
        session.setCurrentLat(request.latitude());
        session.setCurrentLng(request.longitude());
        session.setLastLocationUpdate(Instant.now());

        // Calculate progress along route
        RouteProgress progress = calculateRouteProgress(session, request.latitude(), request.longitude());

        // Reroute if user deviates from the planned path
        if (!progress.onRoute) {
            RouteResponse rerouteResponse = routingService.getOptimalRoute(
                    request.latitude(), request.longitude(),
                    session.getEndLat(), session.getEndLng(), null);
            if (rerouteResponse != null && rerouteResponse.path() != null && !rerouteResponse.path().isEmpty()) {
                List<RouteNodeDto> rerouteNodes = buildRouteNodeDtos(rerouteResponse.path());
                for (RouteNodeDto node : rerouteNodes) {
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

                try {
                    session.setPlannedRouteJson(objectMapper.writeValueAsString(rerouteNodes));
                } catch (Exception e) {
                    log.error("Failed to serialize reroute nodes", e);
                }
                session.setTotalRouteDistance(rerouteResponse.totalDistance());
                progress = calculateRouteProgress(session, request.latitude(), request.longitude());
            }
        }

        session.setRemainingDistance(progress.remainingDistance);
        session.setCompletedDistance(progress.completedDistance);
        session.setCurrentNodeIndex(progress.currentNodeIndex);

        // Check for destination alert
        List<RouteAlertDto> activeAlerts = new ArrayList<>();
        if (shouldTriggerDestinationAlert(session)) {
            session.setDestinationAlertTriggered(true);
            session.setDestinationAlertTriggeredAt(Instant.now());

            activeAlerts.add(new RouteAlertDto(
                    "destination-" + session.getId(),
                    "DESTINATION_APPROACH",
                    "You are approaching your destination",
                    session.getDestinationThresholdMeters(),
                    session.getRemainingDistance(),
                    Instant.now(),
                    false
            ));
        }

        // Check if route completed
        if (session.getRemainingDistance() <= 10.0) { // Within 10 meters of destination
            session.setStatus(RouteSession.RouteSessionStatus.COMPLETED);
            session.setCompletedAt(Instant.now());
        }

        session = routeSessionRepository.save(session);

        double progressPercentage = session.getTotalRouteDistance() > 0 ?
                (session.getCompletedDistance() / session.getTotalRouteDistance()) * 100.0 : 0.0;

        return new RouteProgressResponse(
                session.getId(),
                session.getStatus().toString(),
                session.getCurrentLat(),
                session.getCurrentLng(),
                session.getRemainingDistance(),
                session.getCompletedDistance(),
                progressPercentage,
                session.getCurrentNodeIndex(),
                progress.onRoute,
                progress.deviationDistance,
                activeAlerts,
                progress.nextInstruction,
                progress.distanceToNext
        );
    }

    @Transactional
    public RouteSessionResponse pauseRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() != RouteSession.RouteSessionStatus.ACTIVE) {
            throw new IllegalStateException("Route session is not active");
        }

        session.setStatus(RouteSession.RouteSessionStatus.PAUSED);
        session = routeSessionRepository.save(session);

        return mapToSessionResponse(session);
    }

    @Transactional
    public RouteSessionResponse resumeRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        if (session.getStatus() != RouteSession.RouteSessionStatus.PAUSED) {
            throw new IllegalStateException("Route session is not paused");
        }

        session.setStatus(RouteSession.RouteSessionStatus.ACTIVE);
        session = routeSessionRepository.save(session);

        return mapToSessionResponse(session);
    }

    @Transactional
    public RouteSessionResponse cancelRoute(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);

        session.setStatus(RouteSession.RouteSessionStatus.CANCELLED);
        session = routeSessionRepository.save(session);

        return mapToSessionResponse(session);
    }

    public List<RouteSessionResponse> getUserRouteSessions(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return routeSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToSessionResponse)
                .collect(Collectors.toList());
    }

    public RouteSessionResponse getRouteSession(String username, String sessionId) {
        RouteSession session = getUserRouteSession(username, sessionId);
        return mapToSessionResponse(session);
    }

    private RouteSession getUserRouteSession(String username, String sessionId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return routeSessionRepository.findByIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Route session not found"));
    }

    private RouteProgress calculateRouteProgress(RouteSession session, double currentLat, double currentLng) {
        List<RouteNodeDto> routeNodes = parsePlannedRoute(session);
        if (routeNodes.isEmpty()) {
            double distanceToDestination = calculateHaversineDistance(
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

        RouteProjection projection = projectToRoute(routeNodes, currentLat, currentLng);
        double totalDistance = session.getTotalRouteDistance() != null ? session.getTotalRouteDistance() : routeNodes.get(routeNodes.size() - 1).distanceFromStart();
        double remainingDistance = Math.max(0.0, totalDistance - projection.distanceAlongRoute);
        double completedDistance = Math.max(0.0, projection.distanceAlongRoute);
        boolean onRoute = projection.deviationDistance <= OFF_ROUTE_THRESHOLD_METERS;

        int currentNodeIndex = Math.min(routeNodes.size() - 1, projection.closestSegmentIndex + 1);
        RouteNodeDto nextNode = routeNodes.get(currentNodeIndex);
        String nextInstruction = nextNode.instruction() != null ? nextNode.instruction() : "Follow route to next waypoint";
        double distanceToNext = calculateHaversineDistance(currentLat, currentLng, nextNode.latitude(), nextNode.longitude());

        return new RouteProgress(
                remainingDistance,
                completedDistance,
                currentNodeIndex,
                onRoute,
                projection.deviationDistance,
                nextInstruction,
                distanceToNext
        );
    }

    private List<RouteNodeDto> buildRouteNodeDtos(List<org.routeops.gateway.entity.GeoNode> path) {
        List<RouteNodeDto> routeNodes = new ArrayList<>();
        double cumulativeDistance = 0.0;
        for (int i = 0; i < path.size(); i++) {
            var node = path.get(i);
            if (i > 0) {
                var previous = path.get(i - 1);
                cumulativeDistance += calculateHaversineDistance(
                        previous.getLat(), previous.getLon(), node.getLat(), node.getLon());
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
        return routeNodes;
    }

    private List<RouteNodeDto> parsePlannedRoute(RouteSession session) {
        if (session.getPlannedRouteJson() == null || session.getPlannedRouteJson().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(session.getPlannedRouteJson(), new TypeReference<List<RouteNodeDto>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize planned route", e);
            return List.of();
        }
    }

    private RouteProjection projectToRoute(List<RouteNodeDto> routeNodes, double currentLat, double currentLng) {
        double bestDistance = Double.MAX_VALUE;
        double bestDistanceAlongRoute = 0.0;
        int bestSegmentIndex = 0;

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

        if (routeNodes.size() == 1) {
            RouteNodeDto onlyNode = routeNodes.get(0);
            double distanceToPoint = calculateHaversineDistance(currentLat, currentLng, onlyNode.latitude(), onlyNode.longitude());
            bestDistance = distanceToPoint;
            bestDistanceAlongRoute = onlyNode.distanceFromStart();
        }

        return new RouteProjection(bestDistanceAlongRoute, bestDistance, bestSegmentIndex);
    }

    private ProjectionResult projectPointToSegment(RouteNodeDto start, RouteNodeDto end, double lat, double lng) {
        double referenceLat = Math.toRadians((start.latitude() + end.latitude()) / 2.0);
        double startX = Math.toRadians(start.longitude()) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double startY = Math.toRadians(start.latitude()) * EARTH_RADIUS_METERS;
        double endX = Math.toRadians(end.longitude()) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double endY = Math.toRadians(end.latitude()) * EARTH_RADIUS_METERS;
        double pointX = Math.toRadians(lng) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
        double pointY = Math.toRadians(lat) * EARTH_RADIUS_METERS;

        double dx = endX - startX;
        double dy = endY - startY;
        double segmentLengthSquared = dx * dx + dy * dy;
        double t = 0.0;
        if (segmentLengthSquared > 0) {
            t = ((pointX - startX) * dx + (pointY - startY) * dy) / segmentLengthSquared;
            t = Math.max(0.0, Math.min(1.0, t));
        }

        double projectedX = startX + t * dx;
        double projectedY = startY + t * dy;
        double deviationDistance = Math.hypot(pointX - projectedX, pointY - projectedY);
        double distanceFromStartSegment = Math.hypot(projectedX - startX, projectedY - startY);
        return new ProjectionResult(deviationDistance, distanceFromStartSegment);
    }

    private boolean shouldTriggerDestinationAlert(RouteSession session) {
        return !Boolean.TRUE.equals(session.getDestinationAlertTriggered()) &&
               session.getRemainingDistance() <= session.getDestinationThresholdMeters();
    }

    private RouteSessionResponse mapToSessionResponse(RouteSession session) {
        return new RouteSessionResponse(
                session.getId(),
                session.getSessionName(),
                session.getStartLat(),
                session.getStartLng(),
                session.getEndLat(),
                session.getEndLng(),
                session.getStatus().toString(),
                session.getCreatedAt(),
                session.getStartedAt(),
                session.getCompletedAt(),
                session.getTotalRouteDistance(),
                session.getRemainingDistance(),
                session.getCompletedDistance(),
                session.getCurrentLat(),
                session.getCurrentLng(),
                session.getLastLocationUpdate(),
                session.getDestinationAlertTriggered(),
                session.getDestinationAlertTriggeredAt()
        );
    }

    private double calculateHaversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

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

    private static class RouteProjection {
        private final double distanceAlongRoute;
        private final double deviationDistance;
        private final int closestSegmentIndex;

        RouteProjection(double distanceAlongRoute, double deviationDistance, int closestSegmentIndex) {
            this.distanceAlongRoute = distanceAlongRoute;
            this.deviationDistance = deviationDistance;
            this.closestSegmentIndex = closestSegmentIndex;
        }
    }

    private static class RouteProgress {
        final double remainingDistance;
        final double completedDistance;
        final int currentNodeIndex;
        final boolean onRoute;
        final double deviationDistance;
        final String nextInstruction;
        final double distanceToNext;

        RouteProgress(double remainingDistance, double completedDistance, int currentNodeIndex,
                     boolean onRoute, double deviationDistance, String nextInstruction, double distanceToNext) {
            this.remainingDistance = remainingDistance;
            this.completedDistance = completedDistance;
            this.currentNodeIndex = currentNodeIndex;
            this.onRoute = onRoute;
            this.deviationDistance = deviationDistance;
            this.nextInstruction = nextInstruction;
            this.distanceToNext = distanceToNext;
        }
    }
}