package org.routeguidance.service;

import org.routeguidance.config.GuidanceProperties;
import org.routeguidance.domain.GuidanceSession;
import org.routeguidance.dto.GeoPoint;
import org.routeguidance.dto.GuidanceSessionResponse;
import org.routeguidance.dto.LocationUpdateRequest;
import org.routeguidance.dto.LocationUpdateResponse;
import org.routeguidance.dto.RoutePlan;
import org.routeguidance.dto.StartGuidanceRequest;
import org.routeguidance.exception.NotFoundException;
import org.routeguidance.repository.GuidanceSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class DefaultGuidanceService implements GuidanceService {

    private final GuidanceSessionRepository repository;
    private final RoutingEngineClient routingEngineClient;
    private final GeoMathService geoMathService;
    private final GuidanceProperties properties;

    public DefaultGuidanceService(GuidanceSessionRepository repository,
                                  RoutingEngineClient routingEngineClient,
                                  GeoMathService geoMathService,
                                  GuidanceProperties properties) {
        this.repository = repository;
        this.routingEngineClient = routingEngineClient;
        this.geoMathService = geoMathService;
        this.properties = properties;
    }

    @Override
    public GuidanceSessionResponse startSession(StartGuidanceRequest request) {
        RoutePlan route = routingEngineClient.calculateRoute(request.currentLocation(), request.destination());
        Instant now = Instant.now();

        GuidanceSession session = new GuidanceSession(
                UUID.randomUUID().toString(),
                request.userId(),
                request.currentLocation(),
                request.destination(),
                request.thresholdDistanceMeters(),
                request.thresholdEtaMinutes(),
                request.speedKmh() != null && request.speedKmh() > 0
                        ? request.speedKmh()
                        : properties.getDefaults().getSpeedKmh(),
                route,
                now,
                now
        );

        repository.save(session);
        return toResponse(session);
    }

    @Override
    public GuidanceSessionResponse getSession(String sessionId) {
        GuidanceSession session = repository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Guidance session not found: " + sessionId));
        return toResponse(session);
    }

    @Override
    public LocationUpdateResponse processLocationUpdate(String sessionId, LocationUpdateRequest request) {
        GuidanceSession session = repository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Guidance session not found: " + sessionId));

        GeoPoint currentLocation = request.currentLocation();
        RoutePlan activeRoute = session.getActiveRoute();
        boolean followingPlannedRoute = geoMathService.isNearRoute(
                currentLocation,
                activeRoute.path(),
                properties.getDefaults().getRouteCorridorMeters()
        );

        boolean rerouted = false;
        if (!followingPlannedRoute) {
            activeRoute = routingEngineClient.calculateRoute(currentLocation, session.getDestination());
            session.setActiveRoute(activeRoute);
            session.incrementRerouteCount();
            rerouted = true;
        }

        session.setCurrentLocation(currentLocation);
        session.setUpdatedAt(Instant.now());

        double remainingDistance = geoMathService.remainingRouteDistanceMeters(currentLocation, activeRoute.path());
        double etaMinutes = remainingDistance / 1000.0 / session.getSpeedKmh() * 60.0;

        boolean thresholdDistanceReached = session.getThresholdDistanceMeters() != null
                && session.getThresholdDistanceMeters() > 0
                && remainingDistance <= session.getThresholdDistanceMeters();

        boolean thresholdEtaReached = session.getThresholdEtaMinutes() != null
                && session.getThresholdEtaMinutes() > 0
                && etaMinutes <= session.getThresholdEtaMinutes();

        boolean thresholdTriggered = thresholdDistanceReached || thresholdEtaReached;
        session.setThresholdTriggered(thresholdTriggered);
        repository.save(session);

        String status;
        if (thresholdTriggered && rerouted) {
            status = "rerouted_and_threshold_triggered";
        } else if (thresholdTriggered) {
            status = "threshold_triggered";
        } else if (rerouted) {
            status = "rerouted";
        } else {
            status = "tracking";
        }

        String message;
        if (thresholdTriggered) {
            message = "User is approaching the destination threshold based on the remaining road route.";
        } else if (rerouted) {
            message = "User moved away from the suggested road path. A new route was calculated from the latest live location.";
        } else {
            message = "User is still following the planned road route. Remaining distance is route-aware.";
        }

        return new LocationUpdateResponse(
                session.getSessionId(),
                currentLocation,
                followingPlannedRoute,
                rerouted,
                session.getRerouteCount(),
                remainingDistance,
                etaMinutes,
                thresholdTriggered,
                status,
                message,
                activeRoute
        );
    }

    private GuidanceSessionResponse toResponse(GuidanceSession session) {
        return new GuidanceSessionResponse(
                session.getSessionId(),
                session.getUserId(),
                session.getCurrentLocation(),
                session.getDestination(),
                session.getThresholdDistanceMeters(),
                session.getThresholdEtaMinutes(),
                session.getSpeedKmh(),
                session.getRerouteCount(),
                session.isThresholdTriggered(),
                session.getCreatedAt(),
                session.getUpdatedAt(),
                session.getActiveRoute()
        );
    }
}
