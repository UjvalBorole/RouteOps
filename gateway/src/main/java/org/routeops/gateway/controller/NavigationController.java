package org.routeops.gateway.controller;

import org.routeops.gateway.dto.alert.NavigationRequest;
import org.routeops.gateway.dto.alert.NavigationResponse;
import org.routeops.gateway.service.NavigationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/navigation")
public class NavigationController {

    private final NavigationService navigationService;

    public NavigationController(NavigationService navigationService) {
        this.navigationService = navigationService;
    }

    @PostMapping("/plan")
    public ResponseEntity<NavigationResponse> planNavigation(@RequestBody @Valid NavigationRequest request) {
        NavigationResponse response = navigationService.planNavigation(request);
        return ResponseEntity.ok(response);
    }
}
