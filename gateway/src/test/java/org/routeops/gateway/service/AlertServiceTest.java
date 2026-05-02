package org.routeops.gateway.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.routeops.gateway.dto.alert.AlertResponse;
import org.routeops.gateway.dto.alert.CreateAlertRequest;
import org.routeops.gateway.entity.alert.AlertRule;
import org.routeops.gateway.entity.user.Role;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.repository.AlertRuleRepository;
import org.routeops.gateway.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;

import jakarta.persistence.EntityNotFoundException;

class AlertServiceTest {

    @Mock
    private AlertRuleRepository alertRuleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoutingService routingService;

    @InjectMocks
    private AlertService alertService;

    private User testUser;
    private AlertRule testAlert;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testUser = User.builder()
                .id("user-1")
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hash")
                .roles(new HashSet<>(Set.of(Role.USER)))
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        testAlert = AlertRule.builder()
                .id("alert-1")
                .name("Test Alert")
                .message("Test message")
                .targetLat(45.6567)
                .targetLng(24.5679)
                .thresholdDistanceMeters(1000.0)
                .thresholdEtaMinutes(null)
                .enabled(true)
                .createdAt(Instant.now())
                .user(testUser)
                .build();
    }

    @Test
    void testCreateAlert_Success() {
        CreateAlertRequest request = new CreateAlertRequest(
                "Test Alert",
                "Test message",
                45.6567,
                24.5679,
                1000.0,
                null,
                null,
                true
        );

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.save(any(AlertRule.class))).thenReturn(testAlert);

        AlertResponse response = alertService.createAlert("testuser", request);

        assertNotNull(response);
        assertEquals("Test Alert", response.name());
        assertEquals("Test message", response.message());
        verify(userRepository, times(1)).findByUsername("testuser");
        verify(alertRuleRepository, times(1)).save(any(AlertRule.class));
    }

    @Test
    void testCreateAlert_NoThresholdProvided() {
        CreateAlertRequest request = new CreateAlertRequest(
                "Test Alert",
                "Test message",
                45.6567,
                24.5679,
                null,
                null,
                null,
                true
        );

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> alertService.createAlert("testuser", request));

        assertEquals("An alert must include a distance or ETA threshold.", exception.getMessage());
    }

    @Test
    void testListAlerts_Success() {
        List<AlertRule> alerts = Arrays.asList(testAlert);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.findAllByUser(testUser)).thenReturn(alerts);

        List<AlertResponse> responses = alertService.listAlerts("testuser");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        verify(alertRuleRepository, times(1)).findAllByUser(testUser);
    }

    @Test
    void testGetAlert_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.findByIdAndUser("alert-1", testUser))
                .thenReturn(Optional.of(testAlert));

        AlertResponse response = alertService.getAlert("testuser", "alert-1");

        assertNotNull(response);
        assertEquals("Test Alert", response.name());
    }

    @Test
    void testGetAlert_NotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.findByIdAndUser("alert-1", testUser))
                .thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> alertService.getAlert("testuser", "alert-1"));
    }

    @Test
    void testDeleteAlert_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.findByIdAndUser("alert-1", testUser))
                .thenReturn(Optional.of(testAlert));
        doNothing().when(alertRuleRepository).delete(testAlert);

        assertDoesNotThrow(() -> alertService.deleteAlert("testuser", "alert-1"));
        verify(alertRuleRepository, times(1)).delete(testAlert);
    }

    @Test
    void testAcknowledgeAlert_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(alertRuleRepository.findByIdAndUser("alert-1", testUser))
                .thenReturn(Optional.of(testAlert));
        doNothing().when(alertRuleRepository).delete(testAlert);

        assertDoesNotThrow(() -> alertService.acknowledgeAlert("testuser", "alert-1"));
        verify(alertRuleRepository, times(1)).delete(testAlert);
    }
}
