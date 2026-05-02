package org.routeops.gateway.entity;

import java.time.Instant;

import org.routeops.gateway.entity.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "route_sessions")
public class RouteSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @JoinColumn(name = "user_id")
    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @Column(nullable = false)
    private String sessionName;

    @Column(nullable = false)
    private Double startLat;

    @Column(nullable = false)
    private Double startLng;

    @Column(nullable = false)
    private Double endLat;

    @Column(nullable = false)
    private Double endLng;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Instant startedAt;

    @Column
    private Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RouteSessionStatus status;

    // Planned route data (stored as JSON)
    @Column(columnDefinition = "TEXT")
    private String plannedRouteJson;

    // Current position tracking
    @Column
    private Double currentLat;

    @Column
    private Double currentLng;

    @Column
    private Instant lastLocationUpdate;

    // Route progress
    @Column
    private Double totalRouteDistance; // meters

    @Column
    private Double remainingDistance; // meters

    @Column
    private Double completedDistance; // meters

    @Column
    private Integer currentNodeIndex;

    // Alert settings
    @Column
    private Double destinationThresholdMeters;

    @Column
    private Boolean destinationAlertTriggered;

    @Column
    private Instant destinationAlertTriggeredAt;

    public enum RouteSessionStatus {
        PLANNED,    // Route planned but not started
        ACTIVE,     // User is actively navigating
        PAUSED,     // Navigation paused
        COMPLETED,  // Reached destination
        CANCELLED   // Session cancelled
    }
}