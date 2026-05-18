# 🎯 Quick Reference Card - Routing Service Services

## 📋 Print This Page

Use this as a desk reference while working with the refactored services.

---

## Services at a Glance

### 1. RouteCalculationService
**Responsibility**: Route planning and rerouting
**Key Methods**:
- `planRoute(startLat, startLng, endLat, endLng, weight)` → RouteResponse
- `rerouteFromPosition(currentLat, currentLng, endLat, endLng, weight)` → RouteResponse
- `storeRouteNodes(session, routeResponse)` → void
- `convertVehicleTypeToWeight(vehicleType)` → Double

**When to use**:
- Need to calculate a route
- User deviated from route
- Need to reroute user
- Need to convert vehicle type to weight

---

### 2. RouteProgressService
**Responsibility**: Track user progress along route
**Key Methods**:
- `calculateProgress(session, lat, lng)` → RouteProgress
- `getRemainingPathNodes(session, nodeIndex)` → List<RouteNodeDto>

**When to use**:
- Need to get progress information
- Want remaining distance/waypoints
- Need completion percentage
- Check if on/off route

**Returns**: RouteProgress with:
- remainingDistance, completedDistance, currentNodeIndex
- isOnRoute, deviationDistance, nextInstruction

---

### 3. RouteStateService
**Responsibility**: Manage session lifecycle (PLANNED → ACTIVE → COMPLETED)
**Key Methods**:
- `startRoute(username, sessionId)` → void
- `pauseRoute(username, sessionId)` → void
- `resumeRoute(username, sessionId)` → void
- `cancelRoute(username, sessionId)` → void
- `completeRoute(username, sessionId)` → void
- `markAsReached(username, sessionId)` → void
- `getRouteHistory(username)` → List<RouteSession>
- `getAllUserSessions(username)` → List<RouteSession>

**State Transitions**:
```
PLANNED ──start──> ACTIVE
  ↑                  ↓
  └─────────────── PAUSED
                     ↓
                   REACHED ──complete──> COMPLETED
                     ↑
                     └─── pause ──> PAUSED
```

---

### 4. RouteAlertService
**Responsibility**: Manage destination approach alerts
**Key Methods**:
- `createDestinationAlert(session, thresholdDistance, thresholdSeconds)` → void
- `checkAndTriggerAlerts(session, remainingDist, estimatedTime, lat, lng)` → List<RouteAlertDto>
- `calculateNextAlarmTriggerTime(alertRules, remainingDist, estimatedTime, speed)` → NextAlarmInfo
- `disableAlert(alertId)` → void
- `getAlertRulesForSession(session)` → List<AlertRule>

**When to use**:
- Create alerts when planning route
- Check if alerts should trigger on location update
- Get next alarm time
- Disable an alert

---

### 5. RouteGeometryService
**Responsibility**: Geographic calculations and deviation detection
**Key Methods**:
- `calculateHaversineDistance(lat1, lng1, lat2, lng2)` → double (meters)
- `projectToRoute(routeNodes, currentLat, currentLng)` → RouteProjection
- `isOffRoute(deviationDistance)` → boolean

**Constants**:
- `OFF_ROUTE_THRESHOLD_METERS = 40.0`

**When to use**:
- Calculate distance between two points
- Project location onto route
- Detect if user is off route
- Get deviation distance

---

### 6. RouteMovementService
**Responsibility**: Detect movement and calculate speed
**Key Methods**:
- `calculateMovementMetrics(session, lat, lng, now)` → MovementMetrics
- `isUserMoving(distanceMeters, speedKmh)` → boolean
- `resolveSpeed(calculatedSpeed, requestedSpeed, defaultSpeed)` → double
- `updateSessionMovement(session, lat, lng, speed, distance, duration, now)` → void

**Thresholds**:
- Movement distance threshold: 4 meters
- Movement speed threshold: 2.5 km/h

**When to use**:
- Calculate speed from location updates
- Detect if user is stationary
- Resolve speed from multiple sources
- Update movement in session

---

### 7. RouteService (Main Coordinator)
**Responsibility**: Orchestrate all services
**Public API** (unchanged):
- `planRoute(username, request)` → RoutePlanResponse
- `updateLocation(username, request)` → RouteProgressResponse
- `startRoute(username, sessionId)` → void
- `pauseRoute(username, sessionId)` → void
- `resumeRoute(username, sessionId)` → void
- `cancelRoute(username, sessionId)` → void
- `completeRoute(username, sessionId)` → void
- `getRouteSession(username, sessionId)` → RouteSession
- `getUserRouteSessions(username)` → List<RouteSession>
- `getRouteHistory(username)` → List<RouteSession>

---

## 🔀 Which Service to Use?

| Need | Service | Method |
|------|---------|--------|
| Plan a route | RouteCalculationService | `planRoute()` |
| Reroute user | RouteCalculationService | `rerouteFromPosition()` |
| Track progress | RouteProgressService | `calculateProgress()` |
| Get waypoints | RouteProgressService | `getRemainingPathNodes()` |
| Start navigation | RouteStateService | `startRoute()` |
| Pause navigation | RouteStateService | `pauseRoute()` |
| Resume navigation | RouteStateService | `resumeRoute()` |
| Complete route | RouteStateService | `completeRoute()` |
| Create alert | RouteAlertService | `createDestinationAlert()` |
| Check alerts | RouteAlertService | `checkAndTriggerAlerts()` |
| Calculate distance | RouteGeometryService | `calculateHaversineDistance()` |
| Check if off-route | RouteGeometryService | `isOffRoute()` |
| Calculate speed | RouteMovementService | `calculateMovementMetrics()` |
| Detect movement | RouteMovementService | `isUserMoving()` |

---

## 📊 Service Dependencies

```
RouteService (Main Entry Point)
    │
    ├─── Uses: RouteSessionRepository, UserRepository
    ├─── Coordinates: RouteCalculationService
    ├─── Coordinates: RouteProgressService
    ├─── Coordinates: RouteStateService
    ├─── Coordinates: RouteAlertService
    └─── Coordinates: RouteMovementService
             │
             └─── Uses: RouteGeometryService
```

---

## 💻 Code Snippets

### Plan a Route
```java
RoutePlanResponse response = routeService.planRoute("alice", 
    new RoutePlanRequest(28.6139, 77.2090, 28.5244, 77.1855, "car"));
System.out.println("Distance: " + response.getTotalDistance());
System.out.println("ETA: " + response.getEstimatedDurationMinutes());
```

### Track User Progress
```java
RouteProgressResponse progress = routeService.updateLocation("alice",
    new RouteLocationUpdateRequest("session-123", 28.6100, 77.2100, 35.0));
System.out.println("Completed: " + progress.getCompletedDistancePercentage() + "%");
System.out.println("On Route: " + progress.isOnRoute());
```

### Control Navigation
```java
routeService.startRoute("alice", "session-123");
routeService.pauseRoute("alice", "session-123");
routeService.resumeRoute("alice", "session-123");
routeService.completeRoute("alice", "session-123");
```

### Calculate Distance
```java
double distance = geometryService.calculateHaversineDistance(28.6139, 77.2090, 28.5244, 77.1855);
System.out.println("Distance: " + distance + " meters");
```

### Check Movement
```java
MovementMetrics metrics = movementService.calculateMovementMetrics(session, lat, lng, now);
if (movementService.isUserMoving(metrics.getDistanceMeters(), metrics.getSpeedKmh())) {
    System.out.println("User is moving at " + metrics.getSpeedKmh() + " km/h");
}
```

---

## ⚙️ Configuration Values

| Setting | Value | Location |
|---------|-------|----------|
| Off-route threshold | 40.0 meters | RouteGeometryService |
| Movement distance threshold | 4.0 meters | RouteMovementService |
| Movement speed threshold | 2.5 km/h | RouteMovementService |
| Destination reached | 10.0 meters | RouteService |
| Default speed | 40.0 km/h | RouteMovementService |

---

## 🔍 Data Types Quick Reference

### RouteProgress (from ProgressService.calculateProgress())
```java
- remainingDistance: double (meters)
- completedDistance: double (meters)
- currentNodeIndex: int
- isOnRoute: boolean
- deviationDistance: double (meters)
- nextInstruction: String
- distanceToNext: double (meters)
```

### MovementMetrics (from MovementService.calculateMovementMetrics())
```java
- distanceMeters: double
- durationSeconds: long
- speedKmh: double
```

### RouteProjection (from GeometryService.projectToRoute())
```java
- distanceAlongRoute: double (meters)
- deviationDistance: double (meters)
- closestSegmentIndex: int
```

### NextAlarmInfo (from AlertService.calculateNextAlarmTriggerTime())
```java
- nextAlarmTriggerTimeSeconds: long
- nextAlarmThresholdMeters: double
```

---

## ✅ Checklist for Using Services

- [ ] Injected all required services via @Autowired
- [ ] Called correct service for your use case (see "Which Service to Use" table)
- [ ] Passed correct parameter types (see method signatures)
- [ ] Handled returned values correctly
- [ ] Added error handling for RouteNotFoundException, etc.
- [ ] Added logging for debugging
- [ ] Tested with actual data
- [ ] Verified behavior matches expectations

---

## 📚 Where to Find More Info

| Topic | Document |
|-------|----------|
| Service descriptions | [DISTRIBUTED_SERVICE_GUIDE.md](DISTRIBUTED_SERVICE_GUIDE.md) |
| Architecture details | [ROUTING_SERVICE_ARCHITECTURE.md](ROUTING_SERVICE_ARCHITECTURE.md) |
| How to read code | [SERVICE_DOCUMENTATION_GUIDE.md](SERVICE_DOCUMENTATION_GUIDE.md) |
| All details | [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) |
| Overview | [README_REFACTORING.md](README_REFACTORING.md) |
| Quick guide | [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) |
| Source code | [gateway/src/main/java/org/routeops/gateway/service/](gateway/src/main/java/org/routeops/gateway/service/) |

---

## 🎯 Remember

✅ Each service has a **single responsibility**
✅ Services are **independent** and can be tested alone
✅ All services have **comprehensive JavaDoc**
✅ **No breaking changes** - existing code works unchanged
✅ Services can be **extended or replaced**

---

**Print this page and keep it on your desk!** 📋

