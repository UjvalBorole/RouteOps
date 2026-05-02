package org.routeops.gateway.controller;

import java.util.List;

import org.routeops.gateway.dto.alert.AlertEvaluationResponse;
import org.routeops.gateway.dto.alert.AlertResponse;
import org.routeops.gateway.dto.alert.CreateAlertRequest;
import org.routeops.gateway.dto.alert.LocationUpdateRequest;
import org.routeops.gateway.service.AlertService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @PostMapping
    public ResponseEntity<AlertResponse> createAlert(@RequestBody @Valid CreateAlertRequest request) {
        String username = currentUsername();
        AlertResponse response = alertService.createAlert(username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<AlertResponse>> listAlerts() {
        String username = currentUsername();
        return ResponseEntity.ok(alertService.listAlerts(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertResponse> getAlert(@PathVariable String id) {
        String username = currentUsername();
        return ResponseEntity.ok(alertService.getAlert(username, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable String id) {
        String username = currentUsername();
        alertService.deleteAlert(username, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/evaluate")
    public ResponseEntity<AlertEvaluationResponse> evaluateAlerts(@RequestBody @Valid LocationUpdateRequest request) {
        String username = currentUsername();
        return ResponseEntity.ok(alertService.evaluateAlerts(username, request));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable String id) {
        String username = currentUsername();
        alertService.acknowledgeAlert(username, id);
        return ResponseEntity.noContent().build();
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("Unable to resolve authenticated user");
        }
        return authentication.getName();
    }
}
