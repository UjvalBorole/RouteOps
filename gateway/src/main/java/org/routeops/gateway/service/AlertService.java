package org.routeops.gateway.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.routeops.gateway.dto.alert.AlertEvaluationResponse;
import org.routeops.gateway.dto.alert.AlertResponse;
import org.routeops.gateway.dto.alert.CreateAlertRequest;
import org.routeops.gateway.dto.alert.LocationUpdateRequest;
import org.routeops.gateway.entity.RouteSession;
import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.repository.AlertRuleRepository;
import org.routeops.gateway.repository.RouteSessionRepository;
import org.routeops.gateway.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRuleRepository alertRuleRepository;
    private final RouteSessionRepository routeSessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public AlertResponse createAlert(String username, CreateAlertRequest request) {
        User user = findUserByUsername(username);

        // For now, alerts are created automatically with route sessions
        // This method is kept for backward compatibility but may be deprecated
        throw new UnsupportedOperationException("Alerts are now managed automatically with route sessions. Use route planning instead.");
    }

    public List<AlertResponse> listAlerts(String username) {
        User user = findUserByUsername(username);
        return alertRuleRepository.findAllByRouteSessionUser(user)
                .stream()
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    public AlertResponse getAlert(String username, String alertId) {
        User user = findUserByUsername(username);
        AlertRule alertRule = alertRuleRepository.findByIdAndRouteSessionUser(alertId, user)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found"));
        return mapToAlertResponse(alertRule);
    }

    @Transactional
    public void deleteAlert(String username, String alertId) {
        User user = findUserByUsername(username);
        AlertRule alertRule = alertRuleRepository.findByIdAndRouteSessionUser(alertId, user)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found"));
        alertRuleRepository.delete(alertRule);
    }

    @Transactional
    public AlertEvaluationResponse evaluateAlerts(String username, LocationUpdateRequest request) {
        // This method is now handled by RouteService.updateLocation()
        // Kept for backward compatibility
        User user = findUserByUsername(username);

        return new AlertEvaluationResponse(Optional.empty(), false);
    }

    @Transactional
    public void acknowledgeAlert(String username, String alertId) {
        User user = findUserByUsername(username);
        AlertRule alertRule = alertRuleRepository.findByIdAndRouteSessionUser(alertId, user)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found"));

        // For route-based alerts, acknowledgment is handled differently
        // This is a placeholder implementation
    }

    // Helper method to create destination alert for a route session
    @Transactional
    public AlertRule createDestinationAlert(RouteSession routeSession, double thresholdMeters) {
        AlertRule alertRule = AlertRule.builder()
                .name("Destination Approach Alert")
                .message("You are approaching your destination")
                .routeSession(routeSession)
                .alertType(AlertRule.AlertType.DESTINATION_APPROACH)
                .thresholdDistanceMeters(thresholdMeters)
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        return alertRuleRepository.save(alertRule);
    }

    private User findUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private AlertResponse mapToAlertResponse(AlertRule alertRule) {
        return new AlertResponse(
                alertRule.getId(),
                alertRule.getName(),
                alertRule.getMessage(),
                alertRule.getRouteSession() != null ? alertRule.getRouteSession().getId() : null,
                alertRule.getAlertType() != null ? alertRule.getAlertType().toString() : null,
                alertRule.getThresholdDistanceMeters(),
                alertRule.isEnabled(),
                alertRule.getCreatedAt(),
                alertRule.getLastTriggeredAt()
        );
    }
}
