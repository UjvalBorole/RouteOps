package org.routeops.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.routeops.gateway.dto.geocoding.GeocodingResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class GeocodingService {

    private static final String NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "RouteOps/1.0 (local-development)";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();
    private final ConcurrentHashMap<String, Optional<GeocodingResponse>> cache = new ConcurrentHashMap<>();

    public Optional<GeocodingResponse> search(String query, String countryCodes) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isBlank()) {
            return Optional.empty();
        }

        String cacheKey = "search:" + normalizedQuery.toLowerCase() + ":" + (countryCodes == null ? "" : countryCodes);
        return cache.computeIfAbsent(cacheKey, ignored -> doSearch(normalizedQuery, countryCodes));
    }

    public Optional<GeocodingResponse> reverse(double lat, double lng) {
        String cacheKey = "reverse:" + String.format("%.5f,%.5f", lat, lng);
        return cache.computeIfAbsent(cacheKey, ignored -> doReverse(lat, lng));
    }

    private Optional<GeocodingResponse> doSearch(String query, String countryCodes) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromHttpUrl(NOMINATIM_BASE_URL + "/search")
                    .queryParam("q", query)
                    .queryParam("format", "jsonv2")
                    .queryParam("limit", 1);
            if (countryCodes != null && !countryCodes.isBlank()) {
                builder.queryParam("countrycodes", countryCodes);
            }

            JsonNode results = send(builder.build().encode().toUri());
            if (!results.isArray() || results.isEmpty()) {
                return Optional.empty();
            }

            JsonNode best = results.get(0);
            return Optional.of(new GeocodingResponse(
                    parseDouble(best.path("lat").asText()),
                    parseDouble(best.path("lon").asText()),
                    best.path("display_name").asText(null)
            ));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private Optional<GeocodingResponse> doReverse(double lat, double lng) {
        try {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(NOMINATIM_BASE_URL + "/reverse")
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("format", "jsonv2")
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);
            String displayName = result.path("display_name").asText(null);
            if (displayName == null || displayName.isBlank()) {
                return Optional.empty();
            }

            return Optional.of(new GeocodingResponse(lat, lng, displayName));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private JsonNode send(URI uri) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(12))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Geocoding request failed: " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    private Double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException error) {
            return null;
        }
    }
}
