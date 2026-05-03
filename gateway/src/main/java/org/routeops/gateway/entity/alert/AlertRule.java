package org.routeops.gateway.entity.alert;

import java.time.Instant;

import org.routeops.gateway.entity.RouteSession;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @JoinColumn(name = "route_session_id")
    @ManyToOne(fetch = FetchType.LAZY)
    private RouteSession routeSession;

    @Enumerated
    @Column(nullable = false)
    private AlertType alertType;

    // For destination alerts
    @Column
    private Double thresholdDistanceMeters; // Trigger when within this distance of destination

    @Column
    private Long thresholdSeconds; // Trigger when estimated time to destination is below this

    // For route deviation alerts
    @Column
    private Double maxDeviationMeters; // Maximum allowed deviation from route

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column
    private Instant lastTriggeredAt;

    public enum AlertType {
        DESTINATION_APPROACH,    // Alert when approaching destination
        ROUTE_DEVIATION,         // Alert when deviating from planned route
        ROUTE_COMPLETION         // Alert when route is completed
    }
}
