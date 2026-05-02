package org.routeguidance.controller;

import jakarta.validation.Valid;
import org.routeguidance.dto.GuidanceSessionResponse;
import org.routeguidance.dto.LocationUpdateRequest;
import org.routeguidance.dto.LocationUpdateResponse;
import org.routeguidance.dto.StartGuidanceRequest;
import org.routeguidance.service.GuidanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/guidance/sessions")
public class GuidanceController {

    private final GuidanceService guidanceService;

    public GuidanceController(GuidanceService guidanceService) {
        this.guidanceService = guidanceService;
    }

    @PostMapping
    public ResponseEntity<GuidanceSessionResponse> startSession(@RequestBody @Valid StartGuidanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(guidanceService.startSession(request));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<GuidanceSessionResponse> getSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(guidanceService.getSession(sessionId));
    }

    @PostMapping("/{sessionId}/location")
    public ResponseEntity<LocationUpdateResponse> updateLocation(@PathVariable String sessionId,
                                                                @RequestBody @Valid LocationUpdateRequest request) {
        return ResponseEntity.ok(guidanceService.processLocationUpdate(sessionId, request));
    }
}
