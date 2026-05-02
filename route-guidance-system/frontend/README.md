# Frontend Notes

This frontend scaffold is intentionally lightweight.

It focuses on the client-side behavior needed for your project:

- display the suggested route on the map
- start a guidance session
- send live location updates every 30 to 60 seconds
- refresh the route when the backend reroutes
- show a threshold alert when the user is close according to the remaining road route

## Suggested UI Flow

1. User selects current location and destination on a map.
2. Frontend calls `POST /api/guidance/sessions`.
3. Frontend draws the returned `activeRoute.path` on the map.
4. A tracker sends `POST /api/guidance/sessions/{id}/location` every 30 to 60 seconds.
5. If response says `rerouted = true`, redraw the map with the new path.
6. If `thresholdTriggered = true`, show an alert or alarm banner.

## Files

- `src/models/guidance.ts`
- `src/services/guidance-api.ts`
- `src/services/location-tracker.ts`
