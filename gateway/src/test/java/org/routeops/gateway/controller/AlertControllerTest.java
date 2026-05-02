package org.routeops.gateway.controller;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.routeops.gateway.dto.alert.AlertEvaluationResponse;
import org.routeops.gateway.dto.alert.AlertResponse;
import org.routeops.gateway.dto.alert.CreateAlertRequest;
import org.routeops.gateway.dto.alert.LocationUpdateRequest;
import org.routeops.gateway.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class AlertControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AlertService alertService;

    private AlertResponse mockAlertResponse;
    private CreateAlertRequest mockCreateRequest;

    @BeforeEach
    void setUp() {
        mockAlertResponse = new AlertResponse(
                "alert-1",
                "Test Alert",
                "Test message",
                45.6567,
                24.5679,
                1000.0,
                null,
                null,
                true,
                Instant.now()
        );

        mockCreateRequest = new CreateAlertRequest(
                "Test Alert",
                "Test message",
                45.6567,
                24.5679,
                1000.0,
                null,
                null,
                true
        );
    }

    @Test
    void testCreateAlert_Success() throws Exception {
        when(alertService.createAlert("testuser", mockCreateRequest)).thenReturn(mockAlertResponse);

        mockMvc.perform(post("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockCreateRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("alert-1"))
                .andExpect(jsonPath("$.name").value("Test Alert"));

        verify(alertService, times(1)).createAlert("testuser", mockCreateRequest);
    }

    @Test
    void testListAlerts_Success() throws Exception {
        List<AlertResponse> alerts = Arrays.asList(mockAlertResponse);
        when(alertService.listAlerts("testuser")).thenReturn(alerts);

        mockMvc.perform(get("/api/alerts"))
                .andExpect(status().isOk());

        verify(alertService, times(1)).listAlerts("testuser");
    }

    @Test
    void testGetAlert_Success() throws Exception {
        when(alertService.getAlert("testuser", "alert-1")).thenReturn(mockAlertResponse);

        mockMvc.perform(get("/api/alerts/alert-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("alert-1"))
                .andExpect(jsonPath("$.name").value("Test Alert"));

        verify(alertService, times(1)).getAlert("testuser", "alert-1");
    }

    @Test
    void testDeleteAlert_Success() throws Exception {
        doNothing().when(alertService).deleteAlert("testuser", "alert-1");

        mockMvc.perform(delete("/api/alerts/alert-1"))
                .andExpect(status().isNoContent());

        verify(alertService, times(1)).deleteAlert("testuser", "alert-1");
    }

    @Test
    void testAcknowledgeAlert_Success() throws Exception {
        doNothing().when(alertService).acknowledgeAlert("testuser", "alert-1");

        mockMvc.perform(post("/api/alerts/alert-1/acknowledge"))
                .andExpect(status().isNoContent());

        verify(alertService, times(1)).acknowledgeAlert("testuser", "alert-1");
    }

    @Test
    void testEvaluateAlerts_Success() throws Exception {
        LocationUpdateRequest updateRequest = new LocationUpdateRequest(
                45.6567,
                24.5679,
                40.0
        );

        AlertEvaluationResponse evaluationResponse = new AlertEvaluationResponse(
                Optional.empty(),
                false
        );

        when(alertService.evaluateAlerts("testuser", updateRequest))
                .thenReturn(evaluationResponse);

        mockMvc.perform(post("/api/alerts/evaluate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());

        verify(alertService, times(1)).evaluateAlerts("testuser", updateRequest);
    }
}
