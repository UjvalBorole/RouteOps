# Service Documentation - How to Explore the Code

## Reading Code Structure

Each service follows this structure:

### 1. **Class Documentation**
Look at the class-level JavaDoc first to understand:
- What the service does
- Its responsibilities
- How it fits into the architecture
- Usage patterns

### 2. **Public Methods**
Then review public methods to see:
- The API each service exposes
- Parameters and return values
- Example usage

### 3. **Inner Classes**
Finally, understand inner classes that:
- Carry result data
- Encapsulate related concepts

## Quick Service Locator

### I need to understand...

**How routes are planned**
→ Read [RouteCalculationService.java](gateway/src/main/java/org/routeops/gateway/service/RouteCalculationService.java)
- Method: `planRoute()`
- Method: `rerouteFromPosition()`

**How user progress is tracked**
→ Read [RouteProgressService.java](gateway/src/main/java/org/routeops/gateway/service/RouteProgressService.java)
- Method: `calculateProgress()`
- Inner class: `RouteProgress`

**How sessions are managed**
→ Read [RouteStateService.java](gateway/src/main/java/org/routeops/gateway/service/RouteStateService.java)
- Methods: `startRoute()`, `pauseRoute()`, `resumeRoute()`, `cancelRoute()`, `completeRoute()`

**How alerts work**
→ Read [RouteAlertService.java](gateway/src/main/java/org/routeops/gateway/service/RouteAlertService.java)
- Method: `checkAndTriggerAlerts()`
- Method: `createDestinationAlert()`

**How distances are calculated**
→ Read [RouteGeometryService.java](gateway/src/main/java/org/routeops/gateway/service/RouteGeometryService.java)
- Method: `calculateHaversineDistance()`
- Method: `projectToRoute()`

**How movement is detected**
→ Read [RouteMovementService.java](gateway/src/main/java/org/routeops/gateway/service/RouteMovementService.java)
- Method: `calculateMovementMetrics()`
- Method: `isUserMoving()`

**How everything works together**
→ Read [RouteService.java](gateway/src/main/java/org/routeops/gateway/service/RouteService.java)
- Method: `updateLocation()` (core orchestration)
- Method: `planRoute()` (entry point)

## Understanding the Code Flow

### When a user plans a route:

```
1. RouteService.planRoute() (entry point)
   └─ RouteCalculationService.planRoute()
      └─ RoutingEngine.getOptimalRoute()
   └─ RouteCalculationService.storeRouteNodes()
   └─ RouteAlertService.createDestinationAlert()
   └─ Return RoutePlanResponse
```

### When a user updates their location:

```
1. RouteService.updateLocation() (entry point)
   ├─ RouteStateService.getRouteSession()
   ├─ RouteMovementService.calculateMovementMetrics()
   ├─ RouteMovementService.resolveSpeed()
   ├─ RouteProgressService.calculateProgress()
   │   └─ RouteGeometryService.projectToRoute()
   │       └─ RouteGeometryService.calculateHaversineDistance()
   ├─ If off-route:
   │   └─ RouteCalculationService.rerouteFromPosition()
   ├─ RouteAlertService.checkAndTriggerAlerts()
   └─ Return RouteProgressResponse
```

## Documentation Commands

### View Service Overview
Each service has a class-level JavaDoc comment. Look at the top of each file:

```
/**
 * [ServiceName] handles [responsibility].
 * 
 * Responsibilities:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * 
 * Usage Example:
 * <pre>
 *   // Code example
 * </pre>
 */
@Service
public class [ServiceName] { ... }
```

### Understand a Method
Every method has detailed JavaDoc:

```
/**
 * [Method description and purpose]
 * 
 * [Additional details about what the method does]
 * 
 * @param param1 [Description with units]
 * @param param2 [Description with units]
 * @return [What it returns and format]
 * 
 * Example:
 *   [Actual code example showing usage]
 */
public ReturnType methodName(ParamType param1, ParamType param2) { ... }
```

### See Usage Examples
Look for "Example:" or "Usage Example:" in JavaDoc comments:

```
Example:
   double distance = geometryService.calculateHaversineDistance(28.6139, 77.2090, 28.5244, 77.1855);
   // Returns distance between two Delhi locations in meters
```

### Understand Inner Classes
Find them at the bottom of each service file:

```
/**
 * [Inner class name] represents [what it represents]
 * 
 * Fields:
 * - [fieldName]: [What it stores]
 */
public static class [InnerClassName] {
    private final Type fieldName;
    
    public Type getFieldName() { return fieldName; }
}
```

## Reading Tips

### 1. **Start with the Class Documentation**
Read the top JavaDoc block to understand the service's purpose and responsibilities.

### 2. **Scan the Public Methods**
Look at method signatures and their documentation to see what the service exposes.

### 3. **Read Related Methods Together**
Methods often work together:
- `calculateMovementMetrics()` → `isUserMoving()` → `updateSessionMovement()`
- `planRoute()` → `storeRouteNodes()` → `buildRouteNodeDtos()`

### 4. **Look for Inner Classes**
Understand data structures that services return:
- `RouteProgress` - What progress contains
- `MovementMetrics` - What metrics are calculated
- `NextAlarmInfo` - What alarm info contains

### 5. **See How Services Connect**
Look at `RouteService.updateLocation()` to see how all services work together.

## Key Concepts to Understand

### RouteProgress
Located in RouteProgressService, contains:
- `remainingDistance` - How far to destination
- `completedDistance` - How far traveled
- `currentNodeIndex` - Current waypoint
- `isOnRoute` - Whether user is on planned route
- `deviationDistance` - How far off route (meters)
- `nextInstruction` - Direction for next segment
- `distanceToNext` - Distance to next waypoint

### MovementMetrics
Located in RouteMovementService, contains:
- `distanceMeters` - Distance traveled in last update
- `durationSeconds` - Time since last update
- `speedKmh` - Calculated speed from movement

### RouteProjection
Located in RouteGeometryService, contains:
- `distanceAlongRoute` - How far along route from start (meters)
- `deviationDistance` - How far from route (meters)
- `closestSegmentIndex` - Which route segment is closest

### NextAlarmInfo
Located in RouteAlertService, contains:
- `nextAlarmTriggerTimeSeconds` - When next alarm triggers
- `nextAlarmThresholdMeters` - Distance threshold for alert

## Testing Each Service

To understand a service, you can write a simple test:

```java
@Test
void testRouteGeometryService() {
    RouteGeometryService service = new RouteGeometryService();
    
    // Test method
    double distance = service.calculateHaversineDistance(28.6139, 77.2090, 28.5244, 77.1855);
    
    // Verify result
    assertTrue(distance > 0);
    assertTrue(distance < 1000000); // Less than 1000km
}
```

## Documentation Generation

If you want to generate HTML documentation:

```bash
# Generate JavaDoc
mvn javadoc:javadoc

# View generated docs
open target/site/apidocs/org/routeops/gateway/service/package-summary.html
```

## Quick Reference by Language Concept

### If learning about:

**Distance Calculations**
→ RouteGeometryService.calculateHaversineDistance()

**Location Projection**
→ RouteGeometryService.projectToRoute()

**Route Progress**
→ RouteProgressService.calculateProgress()

**Session Lifecycle**
→ RouteStateService (all methods)

**Speed Calculation**
→ RouteMovementService.calculateMovementMetrics()

**Moving vs Stopped Detection**
→ RouteMovementService.isUserMoving()

**Alert Triggering**
→ RouteAlertService.checkAndTriggerAlerts()

**Route Planning**
→ RouteCalculationService.planRoute()

**Rerouting**
→ RouteCalculationService.rerouteFromPosition()

## FAQ

**Q: Where is the calculation for distance to destination?**
A: RouteProgressService.calculateProgress() → RouteGeometryService.calculateHaversineDistance()

**Q: How does the system know if user is off route?**
A: RouteGeometryService.projectToRoute() calculates deviation, then isOffRoute() checks threshold

**Q: Where is rerouting triggered?**
A: RouteService.updateLocation() → doUpdateLocation() → handleOffRouteCondition()

**Q: How are alerts created?**
A: RouteService.planRoute() → RouteAlertService.createDestinationAlert()

**Q: How are alerts triggered?**
A: RouteService.updateLocation() → RouteAlertService.checkAndTriggerAlerts()

**Q: Where is session state managed?**
A: RouteStateService has all state methods

**Q: How is speed calculated?**
A: RouteMovementService.calculateMovementMetrics() from distance and time

**Q: Where is the Haversine formula?**
A: RouteGeometryService.calculateHaversineDistance()

**Q: How many meters off route triggers reroute?**
A: RouteGeometryService.OFF_ROUTE_THRESHOLD_METERS = 40.0

**Q: What's the minimum distance to destination threshold?**
A: RouteService.DESTINATION_REACHED_THRESHOLD = 10.0 meters

---

## Next Steps

1. **Read REFACTORING_SUMMARY.md** - High-level overview
2. **Read ROUTING_SERVICE_ARCHITECTURE.md** - Detailed architecture
3. **Read DISTRIBUTED_SERVICE_GUIDE.md** - Quick reference
4. **Read ServiceName.java** - For specific service details
5. **Run the code** - See it in action

## Files to Review in Order

1. [RouteService.java](gateway/src/main/java/org/routeops/gateway/service/RouteService.java) - Main coordinator
2. [RouteCalculationService.java](gateway/src/main/java/org/routeops/gateway/service/RouteCalculationService.java) - Route planning
3. [RouteProgressService.java](gateway/src/main/java/org/routeops/gateway/service/RouteProgressService.java) - Progress tracking
4. [RouteGeometryService.java](gateway/src/main/java/org/routeops/gateway/service/RouteGeometryService.java) - Calculations
5. [RouteMovementService.java](gateway/src/main/java/org/routeops/gateway/service/RouteMovementService.java) - Movement detection
6. [RouteStateService.java](gateway/src/main/java/org/routeops/gateway/service/RouteStateService.java) - Session management
7. [RouteAlertService.java](gateway/src/main/java/org/routeops/gateway/service/RouteAlertService.java) - Alerts

---

**Happy exploring! All code is well-documented with examples.** 🚀
