# Distributed Routing Service Architecture

## Overview

The RouteService has been refactored from a monolithic 800+ line class into a clean, distributed architecture with 6 specialized, well-documented services. Each service has a single responsibility and clear purpose.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      RouteService (Coordinator)                  │
│                                                                   │
│  Public API: planRoute, startRoute, updateLocation,              │
│             pauseRoute, resumeRoute, cancelRoute, ...            │
└──────────────────────────────────────────────────────────────────┘
           │           │            │          │          │
           ↓           ↓            ↓          ↓          ↓
      ┌────────────────────────────────────────────────────────────┐
      │                  Specialized Services                       │
      │                                                             │
      ├─ RouteCalculationService    (Route planning & calculation)  │
      ├─ RouteProgressService       (Progress tracking)            │
      ├─ RouteStateService          (Session lifecycle)            │
      ├─ RouteAlertService          (Alert management)             │
      ├─ RouteGeometryService       (Geographic calculations)      │
      └─ RouteMovementService       (Movement detection)           │
      │                                                             │
      └────────────────────────────────────────────────────────────┘
```

## Service Descriptions

### 1. **RouteCalculationService**
**Purpose**: Route planning and calculation logic

**Responsibilities**:
- Plan optimal routes using routing engine
- Build and persist route nodes
- Calculate route statistics (distance, estimated time)
- Handle rerouting when user deviates

**Key Methods**:
```java
RouteResponse planRoute(double startLat, double startLng, double endLat, double endLng, Double vehicleWeight)
String storeRouteNodes(RouteSession session, RouteResponse routeResponse)
RouteResponse rerouteFromPosition(double currentLat, double currentLng, double endLat, double endLng, Double vehicleWeight)
Double convertVehicleTypeToWeight(String vehicleType)
```

**Example Usage**:
```java
// Plan a route
RouteResponse route = calculationService.planRoute(28.6139, 77.2090, 28.5244, 77.1855, 1500.0);
System.out.println("Distance: " + route.getTotalDistance() + "m");

// Store route nodes
String routeJson = calculationService.storeRouteNodes(session, route);

// Reroute when user deviates
RouteResponse newRoute = calculationService.rerouteFromPosition(
    currentLat, currentLng, endLat, endLng, vehicleWeight);
```

---

### 2. **RouteProgressService**
**Purpose**: Track user progress along the planned route

**Responsibilities**:
- Calculate remaining and completed distance
- Determine current node index and next instruction
- Detect route deviations
- Calculate progress percentage

**Key Methods**:
```java
RouteProgress calculateProgress(RouteSession session, double currentLat, double currentLng)
List<RouteNodeDto> getRemainingPathNodes(RouteSession session, int currentNodeIndex)
```

**Example Usage**:
```java
RouteProgress progress = progressService.calculateProgress(session, 28.6139, 77.2090);
System.out.println("Progress: " + progress.getCompletedDistance() + "m");
System.out.println("Remaining: " + progress.getRemainingDistance() + "m");
System.out.println("On route: " + progress.isOnRoute());
System.out.println("Deviation: " + progress.getDeviationDistance() + "m");
```

---

### 3. **RouteStateService**
**Purpose**: Manage session lifecycle and state transitions

**Responsibilities**:
- Start, pause, resume, cancel, complete route sessions
- Manage state transitions with validation
- Track session history
- Retrieve active and completed sessions

**State Diagram**:
```
PLANNED ──→ ACTIVE ──→ PAUSED ──→ ACTIVE ──→ REACHED ──→ COMPLETED
  ↓          ↓          ↓          ↓          ↓
  └──────────┴──────────┴──────────┴──────────┴─→ CANCELLED
```

**Key Methods**:
```java
RouteSession startRoute(String username, String sessionId)
RouteSession pauseRoute(String username, String sessionId)
RouteSession resumeRoute(String username, String sessionId)
RouteSession cancelRoute(String username, String sessionId)
RouteSession completeRoute(String username, String sessionId)
List<RouteSession> getRouteHistory(String username)
List<RouteSession> getAllUserSessions(String username)
```

**Example Usage**:
```java
// Start navigation
stateService.startRoute("alice", "route-123");

// Pause
stateService.pauseRoute("alice", "route-123");

// Resume
stateService.resumeRoute("alice", "route-123");

// Complete
stateService.completeRoute("alice", "route-123");

// Get history
List<RouteSession> history = stateService.getRouteHistory("alice");
```

---

### 4. **RouteAlertService**
**Purpose**: Manage destination approach alerts

**Responsibilities**:
- Create and manage alert rules
- Check alert conditions (distance/time thresholds)
- Track alert trigger status
- Calculate time until next alarm

**Key Methods**:
```java
AlertRule createDestinationAlert(RouteSession session, Double thresholdDistanceMeters, Long thresholdSeconds)
List<RouteAlertDto> checkAndTriggerAlerts(RouteSession session, double remainingDistance, 
                                          long estimatedTimeToDestinationSeconds, 
                                          double currentLat, double currentLng)
NextAlarmInfo calculateNextAlarmTriggerTime(List<AlertRule> alertRules, double remainingDistance,
                                           long estimatedTimeToDestinationSeconds, double currentSpeedKmh)
```

**Example Usage**:
```java
// Create an alert that triggers at 500m or 60 seconds
alertService.createDestinationAlert(session, 500.0, 60L);

// Check if alerts should trigger
List<RouteAlertDto> activeAlerts = alertService.checkAndTriggerAlerts(
    session, remainingDistance, estimatedTime, lat, lng);

if (!activeAlerts.isEmpty()) {
    sendNotification(activeAlerts.get(0).getMessage());
}

// Get next alarm time
NextAlarmInfo nextAlarm = alertService.calculateNextAlarmTriggerTime(
    rules, remainingDistance, estimatedTime, speedKmh);
System.out.println("Next alarm in " + nextAlarm.nextAlarmTriggerTimeSeconds + " seconds");
```

---

### 5. **RouteGeometryService**
**Purpose**: All geometric and distance calculations

**Responsibilities**:
- Calculate distances between coordinates (Haversine formula)
- Project user location onto route
- Determine route deviation
- Calculate route segments

**Key Methods**:
```java
double calculateHaversineDistance(double lat1, double lng1, double lat2, double lng2)
RouteProjection projectToRoute(List<RouteNodeDto> routeNodes, double currentLat, double currentLng)
boolean isOffRoute(double deviationDistance)
```

**Example Usage**:
```java
// Calculate distance
double distance = geometryService.calculateHaversineDistance(28.6139, 77.2090, 28.5244, 77.1855);
System.out.println("Distance: " + distance + "m");

// Project position onto route
RouteProjection proj = geometryService.projectToRoute(routeNodes, currentLat, currentLng);
System.out.println("Distance along route: " + proj.getDistanceAlongRoute() + "m");
System.out.println("Deviation: " + proj.getDeviationDistance() + "m");

// Check if off route
if (geometryService.isOffRoute(proj.getDeviationDistance())) {
    triggerReroute();
}
```

---

### 6. **RouteMovementService**
**Purpose**: Track movement and detect user motion

**Responsibilities**:
- Calculate speed from location deltas
- Detect when user is moving vs stopped
- Track movement history
- Calculate movement-based metrics

**Key Methods**:
```java
MovementMetrics calculateMovementMetrics(RouteSession session, double currentLat, double currentLng, Instant now)
boolean isUserMoving(double distanceMeters, double speedKmh)
double resolveSpeed(double calculatedSpeedKmh, Double requestedSpeedKmh, double defaultSpeedKmh)
void updateSessionMovement(RouteSession session, double currentLat, double currentLng, 
                          double speedKmh, double distanceMeters, long durationSeconds, Instant now)
```

**Example Usage**:
```java
// Calculate movement metrics
MovementMetrics metrics = movementService.calculateMovementMetrics(session, lat, lng, now);
System.out.println("Distance: " + metrics.getDistanceMeters() + "m");
System.out.println("Speed: " + metrics.getSpeedKmh() + "km/h");

// Detect movement
boolean isMoving = movementService.isUserMoving(metrics.getDistanceMeters(), metrics.getSpeedKmh());
if (isMoving) {
    // Resume navigation
    stateService.startRoute(username, sessionId);
}

// Resolve speed (calculated > requested > default)
double speed = movementService.resolveSpeed(calculatedSpeed, requestedSpeed, 40.0);
```

---

## Integration Points

### RouteService as Coordinator

The main `RouteService` orchestrates these services:

```java
@Transactional
public RouteProgressResponse updateLocation(String username, RouteLocationUpdateRequest request) {
    // 1. Get session (StateService)
    RouteSession session = stateService.getRouteSession(username, request.sessionId());
    
    // 2. Calculate movement (MovementService)
    MovementMetrics metrics = movementService.calculateMovementMetrics(session, lat, lng, now);
    
    // 3. Resolve speed (MovementService)
    double speed = movementService.resolveSpeed(metrics.getSpeedKmh(), request.getSpeedKmh(), DEFAULT_SPEED);
    
    // 4. Update movement (MovementService)
    movementService.updateSessionMovement(session, lat, lng, speed, ...);
    
    // 5. Calculate progress (ProgressService)
    RouteProgress progress = progressService.calculateProgress(session, lat, lng);
    
    // 6. Handle off-route (GeometryService + CalculationService)
    if (!progress.isOnRoute()) {
        RouteResponse newRoute = calculationService.rerouteFromPosition(...);
    }
    
    // 7. Check alerts (AlertService)
    List<RouteAlertDto> alerts = alertService.checkAndTriggerAlerts(session, ...);
    
    // 8. Update state (StateService)
    stateService.updateMovementStatus(session, isMoving);
    
    return response;
}
```

---

## Key Improvements

### Before (Monolithic)
- ❌ 800+ lines in single class
- ❌ Mixed concerns (geometry, state, alerts, progress)
- ❌ Difficult to understand responsibilities
- ❌ Hard to test individual components
- ❌ Unclear where to make changes

### After (Distributed)
- ✅ 6 focused services, ~200 lines each
- ✅ Clear separation of concerns
- ✅ Obvious what each service does
- ✅ Easy to test each service independently
- ✅ Clear where to make changes for specific features
- ✅ Comprehensive JavaDoc with examples
- ✅ Easy to reuse or replace services
- ✅ Better for microservices migration

---

## Adding Comments/Documentation

### To explain a service:
```java
/**
 * RouteGeometryService handles all geometric calculations.
 * 
 * Responsibilities:
 * - Calculate distances between coordinates
 * - Project user location onto route
 * - Detect route deviations
 * 
 * Usage Example:
 * <pre>
 *   double distance = geometryService.calculateHaversineDistance(lat1, lng1, lat2, lng2);
 * </pre>
 */
@Service
public class RouteGeometryService { ... }
```

### To explain a method:
```java
/**
 * Calculates distance in meters between two geographic points.
 * 
 * @param lat1 Latitude of first point (degrees)
 * @param lng1 Longitude of first point (degrees)
 * @param lat2 Latitude of second point (degrees)
 * @param lng2 Longitude of second point (degrees)
 * @return Distance in meters
 * 
 * Example:
 *   double d = calculateHaversineDistance(28.6139, 77.2090, 28.5244, 77.1855);
 */
public double calculateHaversineDistance(double lat1, double lng1, double lat2, double lng2) { ... }
```

---

## Testing Strategy

Each service can be tested independently:

```java
// Test RouteGeometryService
@Test
void testProjectToRoute() {
    RouteGeometryService service = new RouteGeometryService();
    RouteProjection proj = service.projectToRoute(nodes, lat, lng);
    assertEquals(40.0, proj.getDeviationDistance(), 0.1);
}

// Test RouteProgressService
@Test
void testCalculateProgress() {
    RouteProgressService service = new RouteProgressService(geometryService, objectMapper);
    RouteProgress progress = service.calculateProgress(session, lat, lng);
    assertTrue(progress.isOnRoute());
}

// Test RouteMovementService
@Test
void testIsUserMoving() {
    RouteMovementService service = new RouteMovementService(geometryService);
    boolean moving = service.isUserMoving(5.0, 3.0); // 5m, 3km/h
    assertTrue(moving);
}
```

---

## File Structure

```
gateway/src/main/java/org/routeops/gateway/service/
├── RouteService.java                    (Main Coordinator - 250 lines)
├── RouteCalculationService.java         (Route Planning - 180 lines)
├── RouteProgressService.java            (Progress Tracking - 150 lines)
├── RouteStateService.java               (State Management - 200 lines)
├── RouteAlertService.java               (Alert Management - 170 lines)
├── RouteGeometryService.java            (Geometry Calculations - 160 lines)
└── RouteMovementService.java            (Movement Detection - 140 lines)
```

---

## Migration Notes

### No Breaking Changes
- All public API methods remain the same
- Existing integrations continue to work
- Database schema unchanged
- DTOs unchanged

### Internal Changes Only
- Refactored internal method calls
- Distributed responsibility
- Enhanced documentation
- Added logging for better debugging

### Deployment Steps
1. Compile services (`mvn clean install`)
2. Run existing tests
3. Deploy updated gateway
4. No migration needed

---

## Future Enhancements

This architecture enables:
- **Microservices**: Each service could become a separate microservice
- **Caching**: Service-level caching (e.g., geometry calculations)
- **Async Processing**: AlertService can be made async
- **Monitoring**: Per-service metrics and monitoring
- **Alternative Implementations**: Easy to swap services (e.g., different routing algorithms)

---

## Quick Reference

| Task | Service | Method |
|------|---------|--------|
| Plan route | RouteCalculationService | `planRoute()` |
| Track progress | RouteProgressService | `calculateProgress()` |
| Start/Stop navigation | RouteStateService | `startRoute()`, `pauseRoute()`, etc |
| Create alerts | RouteAlertService | `createDestinationAlert()` |
| Calculate distance | RouteGeometryService | `calculateHaversineDistance()` |
| Detect movement | RouteMovementService | `isUserMoving()` |
| Coordinate all | RouteService | `planRoute()`, `updateLocation()`, etc |

