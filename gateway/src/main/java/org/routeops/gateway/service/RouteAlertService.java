package org.routeops.gateway.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.routeops.gateway.dto.route.RouteAlertDto;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.repository.AlertRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * RouteAlertService manages destination approach alerts and other route-related notifications.
 * 
 * Responsibilities:
 * - Create and manage alert rules for route sessions
 * - Check if alerts should trigger based on distance/time thresholds
 * - Track alert trigger status and history
 * - Calculate time until next alarm
 * 
 * Alert Types:
 * - DESTINATION_APPROACH: Triggers when approaching destination by distance or time
 * 
 * Usage Example:
 * <pre>
 *   // Create destination alert
 *   routeAlertService.createDestinationAlert(session, 500.0, 300L);
 *   
 *   // Check and trigger alerts
 *   List<RouteAlertDto> activeAlerts = routeAlertService.checkAndTriggerAlerts(
 *       session, remainingDistance, estimatedTimeSeconds);
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteAlertService {

    private final AlertRuleRepository alertRuleRepository;

    /**
     * Creates a destination approach alert for a route session.
     * This alert will trigger when user gets within specified distance or time of destination.
     * 
     * @param session Route session to attach alert to
     * @param thresholdDistanceMeters Distance from destination to trigger alert (meters)
     * @param thresholdSeconds Time until arrival to trigger alert (seconds)
     * @return Created alert rule
     * 
     * Example:
     *   AlertRule alert = createDestinationAlert(session, 500.0, 60L);
     *   // Alert will trigger when < 500m away OR < 60 seconds away
     */
    @Transactional
    public AlertRule createDestinationAlert(RouteSession session, Double thresholdDistanceMeters, Long thresholdSeconds) {
        AlertRule destinationAlert = AlertRule.builder()
                .name("Destination Approach Alert")
                .message("You are approaching your destination")
                .routeSession(session)
                .alertType(AlertRule.AlertType.DESTINATION_APPROACH)
                .thresholdDistanceMeters(thresholdDistanceMeters)
                .thresholdSeconds(thresholdSeconds)
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        log.info("Created destination alert for session {} with distance threshold {}m and time threshold {}s",
                session.getId(), thresholdDistanceMeters, thresholdSeconds);
        return alertRuleRepository.save(destinationAlert);
    }

    /**
     * Checks all active alert rules for a session and triggers those whose thresholds are met.
     * 
     * @param session Route session to check alerts for
     * @param remainingDistance Current distance to destination (meters)
     * @param estimatedTimeToDestinationSeconds Estimated time until arrival (seconds)
     * @param currentLat Current latitude (degrees)
     * @param currentLng Current longitude (degrees)
     * @return List of alerts that have been triggered
     * 
     * Example:
     *   double remaining = 400.0; // 400 meters
     *   long timeLeft = 45; // 45 seconds
     *   List<RouteAlertDto> activeAlerts = checkAndTriggerAlerts(session, remaining, timeLeft, lat, lng);
     *   if (!activeAlerts.isEmpty()) {
     *       notifications.sendAlert(activeAlerts.get(0));
     *   }
     */
    @Transactional
    public List<RouteAlertDto> checkAndTriggerAlerts(RouteSession session, double remainingDistance,
                                                      long estimatedTimeToDestinationSeconds,
                                                      double currentLat, double currentLng) {
        List<RouteAlertDto> activeAlerts = new ArrayList<>();

        // Get all enabled alert rules for this session
        List<AlertRule> alertRules = alertRuleRepository.findAllByRouteSessionAndEnabled(session, true);

        for (AlertRule rule : alertRules) {
            if (rule.getAlertType() == AlertRule.AlertType.DESTINATION_APPROACH) {
                // Check both distance and time thresholds
                boolean distanceThresholdMet = rule.getThresholdDistanceMeters() != null &&
                        remainingDistance <= rule.getThresholdDistanceMeters();
                boolean timeThresholdMet = rule.getThresholdSeconds() != null &&
                        estimatedTimeToDestinationSeconds <= rule.getThresholdSeconds();

                if (distanceThresholdMet || timeThresholdMet) {
                    // Mark destination alert as triggered if not already
                    if (!Boolean.TRUE.equals(session.getDestinationAlertTriggered())) {
                        session.setDestinationAlertTriggered(true);
                        session.setDestinationAlertTriggeredAt(Instant.now());
                    }

                    RouteAlertDto alert = new RouteAlertDto(
                            rule.getId(),
                            "DESTINATION_APPROACH",
                            rule.getMessage(),
                            rule.getThresholdDistanceMeters(),
                            remainingDistance,
                            Instant.now(),
                            false
                    );
                    activeAlerts.add(alert);

                    log.info("Triggered destination alert for session {}. Distance: {}m, Time: {}s",
                            session.getId(), remainingDistance, estimatedTimeToDestinationSeconds);
                }
            }
        }

        return activeAlerts;
    }

    /**
     * Calculates when the next alert will trigger based on current movement.
     * 
     * @param alertRules List of active alert rules
     * @param remainingDistance Current distance to destination (meters)
     * @param estimatedTimeToDestinationSeconds Current estimated time to arrival (seconds)
     * @param currentSpeedKmh Current movement speed (kilometers per hour)
     * @return AlarmInfo with trigger time or null if no upcoming alarm
     * 
     * Example:
     *   AlarmInfo nextAlarm = calculateNextAlarmTriggerTime(rules, 800.0, 60, 40.0);
     *   if (nextAlarm.getTriggerTimeSeconds() > 0) {
     *       System.out.println("Next alarm in " + nextAlarm.getTriggerTimeSeconds() + "s");
     *   }
     */
    public NextAlarmInfo calculateNextAlarmTriggerTime(List<AlertRule> alertRules, double remainingDistance,
                                                       long estimatedTimeToDestinationSeconds, double currentSpeedKmh) {
        NextAlarmInfo nextAlarmInfo = new NextAlarmInfo(0L, 0.0);

        for (AlertRule rule : alertRules) {
            if (rule.getAlertType() == AlertRule.AlertType.DESTINATION_APPROACH) {
                long timeUntilTrigger = Long.MAX_VALUE;

                // Calculate time until distance threshold
                if (rule.getThresholdDistanceMeters() != null && remainingDistance > rule.getThresholdDistanceMeters()) {
                    double distanceToThreshold = remainingDistance - rule.getThresholdDistanceMeters();
                    long timeUntilDistanceThreshold = calculateEstimatedTimeSeconds(distanceToThreshold, currentSpeedKmh);
                    timeUntilTrigger = Math.min(timeUntilTrigger, timeUntilDistanceThreshold);
                }

                // Calculate time until time threshold
                if (rule.getThresholdSeconds() != null && estimatedTimeToDestinationSeconds > rule.getThresholdSeconds()) {
                    long timeUntilTimeThreshold = estimatedTimeToDestinationSeconds - rule.getThresholdSeconds();
                    timeUntilTrigger = Math.min(timeUntilTrigger, timeUntilTimeThreshold);
                }

                // Update next alarm if this rule triggers sooner
                if (timeUntilTrigger < Long.MAX_VALUE && timeUntilTrigger > 0) {
                    if (nextAlarmInfo.nextAlarmTriggerTimeSeconds == null ||
                        timeUntilTrigger < nextAlarmInfo.nextAlarmTriggerTimeSeconds) {
                        nextAlarmInfo.nextAlarmTriggerTimeSeconds = timeUntilTrigger;
                        nextAlarmInfo.nextAlarmThresholdMeters = rule.getThresholdDistanceMeters();
                    }
                }
            }
        }

        return nextAlarmInfo;
    }

    /**
     * Disables an alert rule.
     * 
     * @param alertId Alert rule identifier
     */
    @Transactional
    public void disableAlert(String alertId) {
        if (alertId != null) {
            alertRuleRepository.findById(alertId).ifPresent(alert -> {
                alert.setEnabled(false);
                alertRuleRepository.save(alert);
                log.info("Disabled alert rule {}", alertId);
            });
        }
    }

    /**
     * Gets all alert rules for a session.
     * 
     * @param session Route session
     * @return List of all alert rules (enabled and disabled)
     */
    @Transactional(readOnly = true)
    public List<AlertRule> getAlertRulesForSession(RouteSession session) {
        return alertRuleRepository.findAllByRouteSession(session);
    }

    /**
     * Calculates estimated time based on distance and speed.
     * 
     * @param distanceMeters Distance to travel (meters)
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
     * Holds information about the next alarm to trigger.
     */
    public static class NextAlarmInfo {
        public Long nextAlarmTriggerTimeSeconds;
        public Double nextAlarmThresholdMeters;

        /**
         * Create alarm info
         * @param nextAlarmTriggerTime Legacy parameter (ignored)
         * @param nextAlarmTriggerTimeSeconds Time until alarm triggers (seconds)
         */
        public NextAlarmInfo(Long nextAlarmTriggerTime, Long nextAlarmTriggerTimeSeconds) {
            this.nextAlarmTriggerTimeSeconds = nextAlarmTriggerTimeSeconds;
        }

        public NextAlarmInfo(Long nextAlarmTriggerTime, Double nextAlarmThresholdMeters) {
            this.nextAlarmThresholdMeters = nextAlarmThresholdMeters;
        }

        public Long getNextAlarmTriggerTimeSeconds() { return nextAlarmTriggerTimeSeconds; }
        public Double getNextAlarmThresholdMeters() { return nextAlarmThresholdMeters; }
    }
}
