package org.routeguidance.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "guidance")
public class GuidanceProperties {

    private final Routing routing = new Routing();
    private final Defaults defaults = new Defaults();

    public Routing getRouting() {
        return routing;
    }

    public Defaults getDefaults() {
        return defaults;
    }

    public static class Routing {
        private String baseUrl;
        private String routePath;

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getRoutePath() {
            return routePath;
        }

        public void setRoutePath(String routePath) {
            this.routePath = routePath;
        }
    }

    public static class Defaults {
        private double speedKmh = 35.0;
        private double routeCorridorMeters = 75.0;

        public double getSpeedKmh() {
            return speedKmh;
        }

        public void setSpeedKmh(double speedKmh) {
            this.speedKmh = speedKmh;
        }

        public double getRouteCorridorMeters() {
            return routeCorridorMeters;
        }

        public void setRouteCorridorMeters(double routeCorridorMeters) {
            this.routeCorridorMeters = routeCorridorMeters;
        }
    }
}
