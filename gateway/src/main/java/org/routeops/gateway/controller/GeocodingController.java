package org.routeops.gateway.controller;

import lombok.RequiredArgsConstructor;
import org.routeops.gateway.dto.geocoding.GeocodingResponse;
import org.routeops.gateway.service.GeocodingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geocoding")
@RequiredArgsConstructor
public class GeocodingController {

    private final GeocodingService geocodingService;

    @GetMapping("/search")
    public ResponseEntity<GeocodingResponse> search(
            @RequestParam String q,
            @RequestParam(required = false) String countrycodes
    ) {
        return geocodingService.search(q, countrycodes)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/reverse")
    public ResponseEntity<GeocodingResponse> reverse(
            @RequestParam double lat,
            @RequestParam double lon
    ) {
        return geocodingService.reverse(lat, lon)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
