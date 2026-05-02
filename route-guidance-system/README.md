# Route Guidance System

This folder contains a fresh codebase scaffold for the project you described:

- the user chooses a destination on a map
- the system calculates the best road-based route
- the frontend sends live latitude and longitude every 30 to 60 seconds
- the backend checks whether the user is still following the planned route
- if the user goes off-route, the backend recalculates from the new live position
- alerts are triggered using route-aware remaining distance or ETA, not straight-line shortcuts

## Core Idea

This is not a ride-booking system.

It is a smart route-following and monitoring system centered on one moving user.

## Folder Layout

- `backend/`
  - Spring Boot scaffold for route sessions, live tracking, rerouting, and threshold alerts
- `frontend/`
  - lightweight TypeScript client models and services for map-driven guidance

## Main Backend Flow

1. `POST /api/guidance/sessions`
   - create a guidance session
   - compute the first road route from current location to destination

2. `POST /api/guidance/sessions/{sessionId}/location`
   - send the next live user position
   - check whether the user is still near the planned route corridor
   - if not, reroute from the new live position
   - compute route-aware remaining distance and ETA
   - trigger threshold alert when remaining route distance or ETA is small enough

3. `GET /api/guidance/sessions/{sessionId}`
   - fetch the current session snapshot

## Why This Matches Your Idea

- route progress is based on route nodes and road segments
- off-route detection is based on distance to the planned route corridor
- rerouting starts from the latest user location
- alert logic uses remaining route distance and ETA instead of direct straight-line distance

## Notes

- this scaffold uses in-memory session storage so the workflow is easy to understand
- it is ready for extension with a database, WebSocket streaming, and a real Angular UI
- the backend is wired to call an external routing engine with the same `startLat/startLng/endLat/endLng` style contract used elsewhere in this repo
