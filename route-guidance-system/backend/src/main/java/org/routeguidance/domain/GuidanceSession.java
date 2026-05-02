package org.routeguidance.domain;

import org.routeguidance.dto.GeoPoint;
import org.routeguidance.dto.RoutePlan;

import java.time.Instant;

public class GuidanceSession {

    private final String sessionId;
    private final String userId;
    private final GeoPoint destination;
    private final Instant createdAt;
    private GeoPoint currentLocation;
    private Double thresholdDistanceMeters;
    private Double thresholdEtaMinutes;
    private Double speedKmh;
    private int rerouteCount;
    private boolean thresholdTriggered;
    private Instant updatedAt;
    private RoutePlan activeRoute;

    public GuidanceSession(String sessionId,
                           String userId,
                           GeoPoint currentLocation,
                           GeoPoint destination,
                           Double thresholdDistanceMeters,
                           Double thresholdEtaMinutes,
                           Double speedKmh,
                           RoutePlan activeRoute,
                           Instant createdAt,
                           Instant updatedAt) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.currentLocation = currentLocation;
        this.destination = destination;
        this.thresholdDistanceMeters = thresholdDistanceMeters;
        this.thresholdEtaMinutes = thresholdEtaMinutes;
        this.speedKmh = speedKmh;
        this.activeRoute = activeRoute;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getUserId() {
        return userId;
    }

    public GeoPoint getDestination() {
        return destination;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public GeoPoint getCurrentLocation() {
        return currentLocation;
    }

    public void setCurrentLocation(GeoPoint currentLocation) {
        this.currentLocation = currentLocation;
    }

    public Double getThresholdDistanceMeters() {
        return thresholdDistanceMeters;
    }

    public Double getThresholdEtaMinutes() {
        return thresholdEtaMinutes;
    }

    public Double getSpeedKmh() {
        return speedKmh;
    }

    public int getRerouteCount() {
        return rerouteCount;
    }

    public void incrementRerouteCount() {
        this.rerouteCount++;
    }

    public boolean isThresholdTriggered() {
        return thresholdTriggered;
    }

    public void setThresholdTriggered(boolean thresholdTriggered) {
        this.thresholdTriggered = thresholdTriggered;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public RoutePlan getActiveRoute() {
        return activeRoute;
    }

    public void setActiveRoute(RoutePlan activeRoute) {
        this.activeRoute = activeRoute;
    }
}
