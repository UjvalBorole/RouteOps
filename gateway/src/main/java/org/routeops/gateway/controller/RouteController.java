package org.routeops.gateway.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.routeops.gateway.dto.route.*;
import org.routeops.gateway.service.RouteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
@Slf4j
public class RouteController {

    private final RouteService routeService;

    @PostMapping("/plan")
    public ResponseEntity<RoutePlanResponse> planRoute(@RequestBody @Valid RoutePlanRequest request) {
        String username = getCurrentUsername();
        RoutePlanResponse response = routeService.planRoute(username, request);
        log.info("Plan Response ({})",response.toString());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{sessionId}/start")
    public ResponseEntity<RouteSessionResponse> startRoute(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.startRoute(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/pause")
    public ResponseEntity<RouteSessionResponse> pauseRoute(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.pauseRoute(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/resume")
    public ResponseEntity<RouteSessionResponse> resumeRoute(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.resumeRoute(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/cancel")
    public ResponseEntity<RouteSessionResponse> cancelRoute(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.cancelRoute(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<RouteSessionResponse> completeRoute(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.completeRoute(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/location")
    public ResponseEntity<RouteProgressResponse> updateLocation(@RequestBody @Valid RouteLocationUpdateRequest request) {
        String username = getCurrentUsername();
        RouteProgressResponse response = routeService.updateLocation(username, request);
        log.info("tracking location ({})",response.toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<RouteSessionResponse>> getUserRoutes() {
        String username = getCurrentUsername();
        List<RouteSessionResponse> response = routeService.getUserRouteSessions(username);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<RouteSessionResponse> getRouteSession(@PathVariable String sessionId) {
        String username = getCurrentUsername();
        RouteSessionResponse response = routeService.getRouteSession(username, sessionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history/list")
    public ResponseEntity<List<RouteSessionResponse>> getRouteHistory() {
        String username = getCurrentUsername();
        List<RouteSessionResponse> response = routeService.getRouteHistory(username);
        return ResponseEntity.ok(response);
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("Unable to resolve authenticated user");
        }
        return authentication.getName();
    }
}