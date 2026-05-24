package org.routeops.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.routeops.gateway.dto.geocoding.GeocodingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeocodingService {

    // =========================================================
    // API URLs
    // =========================================================

    private static final String PHOTON_URL =
            "https://photon.komoot.io/api";

    private static final String NOMINATIM_URL =
            "https://nominatim.openstreetmap.org";

    /*
      OPTIONAL:
      Add your keys later if needed
    */
    @Value("${application.security.geoapify.secret-key}")
    private String GEOAPIFY_KEY;


    @Value("${application.security.openrouteservice.secret-key}")
    private String OPEN_ROUTE_SERVICE_KEY;

    @Value("${application.security.mapbox.secret-key}")
    private String MAPBOX_KEY;

    private static final String USER_AGENT =
            "RouteOps/1.0";

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .build();

    private final ConcurrentHashMap<String,
            Optional<GeocodingResponse>> cache =
            new ConcurrentHashMap<>();

    // =========================================================
    // PUBLIC SEARCH
    // =========================================================

    public Optional<GeocodingResponse> search(
            String query,
            String countryCodes
    ) {

        try {

            String normalized =
                    query == null ? "" : query.trim();

            if (normalized.isBlank()) {
                return Optional.empty();
            }

            String cacheKey =
                    "search:" + normalized.toLowerCase();

            return cache.computeIfAbsent(
                    cacheKey,
                    ignored -> searchWithFallbacks(
                            normalized,
                            countryCodes
                    )
            );

        } catch (Exception e) {

            log.error("Search failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // PUBLIC REVERSE
    // =========================================================

    public Optional<GeocodingResponse> reverse(
            double lat,
            double lng
    ) {

        try {

            String cacheKey =
                    "reverse:"
                            + String.format("%.5f,%.5f",
                            lat,
                            lng);

            return cache.computeIfAbsent(
                    cacheKey,
                    ignored -> reverseWithFallbacks(lat, lng)
            );

        } catch (Exception e) {

            log.error("Reverse geocoding failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // SEARCH FALLBACK CHAIN
    // =========================================================

    private Optional<GeocodingResponse> searchWithFallbacks(
            String query,
            String countryCodes
    ) {

        log.info("================================================");
        log.info("STARTING SEARCH FOR: {}", query);
        log.info("================================================");

        // 1. PHOTON
        Optional<GeocodingResponse> photon =
                searchPhoton(query);

        if (photon.isPresent()) {

            log.info("SUCCESS FROM PHOTON API");

            return photon;
        }

        log.warn("PHOTON FAILED");

        // 2. NOMINATIM
        Optional<GeocodingResponse> nominatim =
                searchNominatim(query, countryCodes);

        if (nominatim.isPresent()) {

            log.info("SUCCESS FROM NOMINATIM");

            return nominatim;
        }

        log.warn("NOMINATIM FAILED");

        // 3. GEOAPIFY
        Optional<GeocodingResponse> geoapify =
                searchGeoapify(query);

        if (geoapify.isPresent()) {

            log.info("SUCCESS FROM GEOAPIFY");

            return geoapify;
        }

        log.warn("GEOAPIFY FAILED");

        // 4. OPENROUTESERVICE
        Optional<GeocodingResponse> ors =
                searchOpenRouteService(query);

        if (ors.isPresent()) {

            log.info("SUCCESS FROM OPENROUTESERVICE");

            return ors;
        }

        log.warn("OPENROUTESERVICE FAILED");

        // 5. MAPBOX
        Optional<GeocodingResponse> mapbox =
                searchMapbox(query);

        if (mapbox.isPresent()) {

            log.info("SUCCESS FROM MAPBOX");

            return mapbox;
        }

        log.warn("MAPBOX FAILED");

        log.error("ALL GEOCODING PROVIDERS FAILED");

        return Optional.empty();
    }

    // =========================================================
    // REVERSE FALLBACK CHAIN
    // =========================================================

    private Optional<GeocodingResponse> reverseWithFallbacks(
            double lat,
            double lng
    ) {

        log.info("================================================");
        log.info("STARTING REVERSE GEOCODING");
        log.info("LAT={}, LNG={}", lat, lng);
        log.info("================================================");

        // 1. NOMINATIM
        Optional<GeocodingResponse> nominatim =
                reverseNominatim(lat, lng);

        if (nominatim.isPresent()) {

            log.info("SUCCESS FROM NOMINATIM");

            return nominatim;
        }

        log.warn("NOMINATIM REVERSE FAILED");

        // 2. GEOAPIFY
        Optional<GeocodingResponse> geoapify =
                reverseGeoapify(lat, lng);

        if (geoapify.isPresent()) {

            log.info("SUCCESS FROM GEOAPIFY");

            return geoapify;
        }

        log.warn("GEOAPIFY REVERSE FAILED");

        // 3. MAPBOX
        Optional<GeocodingResponse> mapbox =
                reverseMapbox(lat, lng);

        if (mapbox.isPresent()) {

            log.info("SUCCESS FROM MAPBOX");

            return mapbox;
        }

        log.warn("MAPBOX REVERSE FAILED");

        log.error("ALL REVERSE GEOCODING FAILED");

        return Optional.empty();
    }

    // =========================================================
    // PHOTON SEARCH
    // =========================================================

    private Optional<GeocodingResponse> searchPhoton(
            String query
    ) {

        try {

            URI uri = UriComponentsBuilder
                    .fromHttpUrl(PHOTON_URL)
                    .queryParam("q", query)
                    .queryParam("limit", 1)
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            JsonNode coordinates =
                    item.path("geometry")
                            .path("coordinates");

            double lng = coordinates.get(0).asDouble();
            double lat = coordinates.get(1).asDouble();

            String name =
                    item.path("properties")
                            .path("name")
                            .asText(null);

            return Optional.of(
                    new GeocodingResponse(
                            lat,
                            lng,
                            name
                    )
            );

        } catch (Exception e) {

            log.error("Photon failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // NOMINATIM SEARCH
    // =========================================================

    private Optional<GeocodingResponse> searchNominatim(
            String query,
            String countryCodes
    ) {

        try {

            UriComponentsBuilder builder =
                    UriComponentsBuilder
                            .fromHttpUrl(
                                    NOMINATIM_URL + "/search"
                            )
                            .queryParam("q", query)
                            .queryParam("format", "jsonv2")
                            .queryParam("limit", 1);

            if (countryCodes != null &&
                    !countryCodes.isBlank()) {

                builder.queryParam(
                        "countrycodes",
                        countryCodes
                );
            }

            JsonNode results =
                    send(builder.build()
                            .encode()
                            .toUri());

            if (!results.isArray() ||
                    results.isEmpty()) {

                return Optional.empty();
            }

            JsonNode best = results.get(0);

            return Optional.of(
                    new GeocodingResponse(
                            parseDouble(best.path("lat").asText()),
                            parseDouble(best.path("lon").asText()),
                            best.path("display_name").asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("Nominatim failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // GEOAPIFY SEARCH
    // =========================================================

    private Optional<GeocodingResponse> searchGeoapify(
            String query
    ) {

        try {

            if (GEOAPIFY_KEY.isBlank()) {
                return Optional.empty();
            }

            URI uri = UriComponentsBuilder
                    .fromHttpUrl(
                            "https://api.geoapify.com/v1/geocode/search"
                    )
                    .queryParam("text", query)
                    .queryParam("limit", 1)
                    .queryParam("apiKey", GEOAPIFY_KEY)
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            JsonNode properties =
                    item.path("properties");

            return Optional.of(
                    new GeocodingResponse(
                            properties.path("lat").asDouble(),
                            properties.path("lon").asDouble(),
                            properties.path("formatted").asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("Geoapify failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // OPENROUTESERVICE SEARCH
    // =========================================================

    private Optional<GeocodingResponse> searchOpenRouteService(
            String query
    ) {

        try {

            if (OPEN_ROUTE_SERVICE_KEY.isBlank()) {
                return Optional.empty();
            }

            URI uri = UriComponentsBuilder
                    .fromHttpUrl(
                            "https://api.openrouteservice.org/geocode/search"
                    )
                    .queryParam("api_key",
                            OPEN_ROUTE_SERVICE_KEY)
                    .queryParam("text", query)
                    .queryParam("size", 1)
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            JsonNode coordinates =
                    item.path("geometry")
                            .path("coordinates");

            return Optional.of(
                    new GeocodingResponse(
                            coordinates.get(1).asDouble(),
                            coordinates.get(0).asDouble(),
                            item.path("properties")
                                    .path("label")
                                    .asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("OpenRouteService failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // MAPBOX SEARCH
    // =========================================================

    private Optional<GeocodingResponse> searchMapbox(
            String query
    ) {

        try {

            if (MAPBOX_KEY.isBlank()) {
                return Optional.empty();
            }

            String encoded =
                    URLEncoder.encode(
                            query,
                            StandardCharsets.UTF_8
                    );

            URI uri = URI.create(
                    "https://api.mapbox.com/geocoding/v5/mapbox.places/"
                            + encoded
                            + ".json?limit=1&access_token="
                            + MAPBOX_KEY
            );

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            JsonNode center =
                    item.path("center");

            return Optional.of(
                    new GeocodingResponse(
                            center.get(1).asDouble(),
                            center.get(0).asDouble(),
                            item.path("place_name")
                                    .asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("Mapbox failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // NOMINATIM REVERSE
    // =========================================================

    private Optional<GeocodingResponse> reverseNominatim(
            double lat,
            double lng
    ) {

        try {

            URI uri = UriComponentsBuilder
                    .fromHttpUrl(
                            NOMINATIM_URL + "/reverse"
                    )
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("format", "jsonv2")
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);

            String displayName =
                    result.path("display_name")
                            .asText(null);

            if (displayName == null ||
                    displayName.isBlank()) {

                return Optional.empty();
            }

            return Optional.of(
                    new GeocodingResponse(
                            lat,
                            lng,
                            displayName
                    )
            );

        } catch (Exception e) {

            log.error("Reverse nominatim failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // GEOAPIFY REVERSE
    // =========================================================

    private Optional<GeocodingResponse> reverseGeoapify(
            double lat,
            double lng
    ) {

        try {

            if (GEOAPIFY_KEY.isBlank()) {
                return Optional.empty();
            }

            URI uri = UriComponentsBuilder
                    .fromHttpUrl(
                            "https://api.geoapify.com/v1/geocode/reverse"
                    )
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("apiKey", GEOAPIFY_KEY)
                    .build()
                    .encode()
                    .toUri();

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            return Optional.of(
                    new GeocodingResponse(
                            lat,
                            lng,
                            item.path("properties")
                                    .path("formatted")
                                    .asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("Reverse geoapify failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // MAPBOX REVERSE
    // =========================================================

    private Optional<GeocodingResponse> reverseMapbox(
            double lat,
            double lng
    ) {

        try {

            if (MAPBOX_KEY.isBlank()) {
                return Optional.empty();
            }

            URI uri = URI.create(
                    "https://api.mapbox.com/geocoding/v5/mapbox.places/"
                            + lng
                            + ","
                            + lat
                            + ".json?access_token="
                            + MAPBOX_KEY
            );

            JsonNode result = send(uri);

            JsonNode features =
                    result.path("features");

            if (!features.isArray() ||
                    features.isEmpty()) {

                return Optional.empty();
            }

            JsonNode item = features.get(0);

            return Optional.of(
                    new GeocodingResponse(
                            lat,
                            lng,
                            item.path("place_name")
                                    .asText(null)
                    )
            );

        } catch (Exception e) {

            log.error("Reverse mapbox failed", e);

            return Optional.empty();
        }
    }

    // =========================================================
    // HTTP SEND
    // =========================================================

    private JsonNode send(URI uri) throws Exception {

        log.info("CALLING API: {}", uri);

        HttpRequest request =
                HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(20))
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "application/json")
                        .GET()
                        .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        log.info(
                "API RESPONSE STATUS: {}",
                response.statusCode()
        );

        if (response.statusCode() < 200 ||
                response.statusCode() >= 300) {

            log.error(
                    "API FAILED: {}",
                    response.body()
            );

            throw new RuntimeException(
                    "API FAILED: "
                            + response.statusCode()
            );
        }

        return objectMapper.readTree(response.body());
    }

    // =========================================================
    // PARSE DOUBLE
    // =========================================================

    private Double parseDouble(String value) {

        try {

            return Double.parseDouble(value);

        } catch (Exception e) {

            log.error(
                    "Failed to parse double: {}",
                    value
            );

            return null;
        }
    }
}
