package org.routeguidance.service;

import org.routeguidance.dto.GeoPoint;
import org.routeguidance.dto.RouteNode;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeoMathService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    public double haversineMeters(GeoPoint a, GeoPoint b) {
        double lat1 = Math.toRadians(a.lat());
        double lon1 = Math.toRadians(a.lng());
        double lat2 = Math.toRadians(b.lat());
        double lon2 = Math.toRadians(b.lng());

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;

        double x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        return EARTH_RADIUS_METERS * c;
    }

    public boolean isNearRoute(GeoPoint currentLocation, List<RouteNode> path, double corridorMeters) {
        if (path == null || path.size() < 2) {
            return false;
        }

        double minDistance = Double.MAX_VALUE;
        for (int i = 0; i < path.size() - 1; i++) {
            GeoPoint a = new GeoPoint(path.get(i).lat(), path.get(i).lng());
            GeoPoint b = new GeoPoint(path.get(i + 1).lat(), path.get(i + 1).lng());
            minDistance = Math.min(minDistance, distancePointToSegmentMeters(currentLocation, a, b));
        }
        return minDistance <= corridorMeters;
    }

    public double remainingRouteDistanceMeters(GeoPoint currentLocation, List<RouteNode> path) {
        if (path == null || path.isEmpty()) {
            return 0.0;
        }
        if (path.size() == 1) {
            return haversineMeters(currentLocation, new GeoPoint(path.get(0).lat(), path.get(0).lng()));
        }

        int nearestIndex = 0;
        double nearestDistance = Double.MAX_VALUE;
        for (int i = 0; i < path.size(); i++) {
            double nodeDistance = haversineMeters(currentLocation, new GeoPoint(path.get(i).lat(), path.get(i).lng()));
            if (nodeDistance < nearestDistance) {
                nearestDistance = nodeDistance;
                nearestIndex = i;
            }
        }

        double total = nearestDistance;
        for (int i = nearestIndex; i < path.size() - 1; i++) {
            GeoPoint a = new GeoPoint(path.get(i).lat(), path.get(i).lng());
            GeoPoint b = new GeoPoint(path.get(i + 1).lat(), path.get(i + 1).lng());
            total += haversineMeters(a, b);
        }
        return total;
    }

    private double distancePointToSegmentMeters(GeoPoint p, GeoPoint a, GeoPoint b) {
        double meanLat = Math.toRadians((a.lat() + b.lat() + p.lat()) / 3.0);
        double ax = metersX(a.lng(), meanLat);
        double ay = metersY(a.lat());
        double bx = metersX(b.lng(), meanLat);
        double by = metersY(b.lat());
        double px = metersX(p.lng(), meanLat);
        double py = metersY(p.lat());

        double abx = bx - ax;
        double aby = by - ay;
        double apx = px - ax;
        double apy = py - ay;
        double ab2 = abx * abx + aby * aby;

        if (ab2 == 0.0) {
            return Math.sqrt(apx * apx + apy * apy);
        }

        double t = (apx * abx + apy * aby) / ab2;
        t = Math.max(0.0, Math.min(1.0, t));

        double closestX = ax + (t * abx);
        double closestY = ay + (t * aby);
        double dx = px - closestX;
        double dy = py - closestY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private double metersX(double longitudeDegrees, double latitudeRadians) {
        return Math.toRadians(longitudeDegrees) * EARTH_RADIUS_METERS * Math.cos(latitudeRadians);
    }

    private double metersY(double latitudeDegrees) {
        return Math.toRadians(latitudeDegrees) * EARTH_RADIUS_METERS;
    }
}
