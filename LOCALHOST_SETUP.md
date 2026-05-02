# RouteOps - Local Development Setup Guide

This guide helps you run the complete RouteOps system on localhost without Docker.

## System Overview

RouteOps is a smart route guidance and tracking system with three main components:

1. **Routing Engine (C++)** - Port 18080
   - Calculates optimal routes based on real road networks
   - Uses graph algorithms to find best paths

2. **Backend API (Spring Boot)** - Port 8081
   - Manages user authentication and route sessions
   - Tracks live location updates from users
   - Detects route deviations and triggers rerouting
   - Monitors destination thresholds for alerts

3. **Frontend (Angular)** - Port 4200
   - Interactive map interface with Leaflet
   - Route planning and visualization
   - Live location tracking display

## Prerequisites

- **Java 21** - For Spring Boot backend ✅ (Already installed)
- **Maven 3.9.9** - For building Java projects ✅ (Already installed)
- **Node.js 18+** - For Angular frontend ⚠️ (Needs setup)
- **CMake 3.20+** - For C++ routing engine ⚠️ (Needs setup)
- **C++ Compiler** - For routing engine ⚠️ (Needs setup)

## Starting the System - Quick Start

### 1. Start Backend Server (Currently Running)

The backend is already running on **http://localhost:8081**

To verify it's working:
```bash
curl http://localhost:8081/actuator/health
```

Expected response:
```json
{"status":"UP"}
```

### 2. Setup and Start Routing Engine

The routing engine requires C++ compilation. Two options:

**Option A: Using CMake (Recommended)**
```bash
cd routing-engine
mkdir build
cd build
cmake ..
cmake --build . --config Release
cd ..
./build/Release/routing_engine
```

The engine will run on **http://localhost:18080**

**Option B: Skip Routing Engine (Mock Mode)**
If CMake/C++ isn't available, the backend can run with mock routing responses.

### 3. Setup and Start Frontend

First, install Node.js from: https://nodejs.org/ (LTS version)

Then run:
```bash
cd fleetops-frontend
npm install
npm start
```

The frontend will run on **http://localhost:4200**

## System Architecture - How It Works

### Route Planning Flow
1. User opens app and sees map (Angular frontend at 4200)
2. User selects destination
3. Frontend sends request to backend: `POST /api/routes/plan`
4. Backend calls routing engine to calculate optimal route based on real roads
5. Route is returned with detailed path nodes

### Live Tracking Flow
1. Frontend sends location updates every 30-60 seconds: `POST /api/routes/location`
2. Backend receives coordinates and checks against the planned route
3. System determines if user is still on the route or has deviated
4. If on-route: Updates progress based on remaining route distance
5. If off-route: Triggers automatic rerouting from current location
6. Progress and alerts are sent back to frontend for display

### Destination Alert Flow
1. As user approaches destination, remaining route distance decreases
2. When remaining distance < destination threshold (default 100m):
   - Backend triggers destination alert
   - Alert is sent to frontend
   - Frontend displays notification to user

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh auth token

### Route Management
- `POST /api/routes/plan` - Plan a new route
- `POST /api/routes/{sessionId}/start` - Start route session
- `GET /api/routes/{sessionId}` - Get route details
- `POST /api/routes/location` - Send live location update
- `POST /api/routes/{sessionId}/pause` - Pause route
- `POST /api/routes/{sessionId}/resume` - Resume route
- `POST /api/routes/{sessionId}/cancel` - Cancel route
- `GET /api/routes` - List user's routes

### Location Input Format
```json
{
  "sessionId": "uuid",
  "latitude": 45.6567,
  "longitude": 24.5679
}
```

### Route Plan Request
```json
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "sessionName": "My Route",
  "destinationThresholdMeters": 100.0
}
```

## Testing the API

Run the comprehensive test suite:

```bash
bash run_api_tests.sh
```

This runs 58+ test cases covering:
- Authentication (15 tests)
- Routing engine (3 tests)
- Route planning and tracking (15 tests)
- Navigation (8 tests)
- Alerts (15 tests)

## Troubleshooting

### Backend won't start
- Check port 8081 is free: `netstat -ano | findstr :8081`
- Kill process if needed: `taskkill /PID <PID> /F`

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -r node_modules && npm install`

### Routing engine won't build
- Install CMake: `choco install cmake` (Windows) or use appropriate installer
- Install C++ build tools if on Windows
- Ensure git is available for FetchContent to download ASIO and Crow

### Port conflicts
- Backend tries port 8081 by default
- Frontend tries port 4200
- Routing engine tries port 18080
- Change in environment variables or config files if needed

## Project Structure

```
FleetOps-main/
├── gateway/                    # Spring Boot backend
│   ├── src/main/java/
│   │   └── org/routeops/
│   │       ├── entity/        # JPA entities (RouteSession, RouteNode, etc.)
│   │       ├── service/       # Business logic (RouteService, etc.)
│   │       ├── controller/    # REST endpoints
│   │       └── repository/    # Database access
│   └── pom.xml
├── fleetops-frontend/         # Angular frontend
│   ├── src/
│   ├── package.json
│   └── angular.json
├── routing-engine/            # C++ routing service
│   ├── main.cpp
│   ├── Graph.cpp/h
│   ├── Node.cpp/h
│   ├── CMakeLists.txt
│   └── edges.csv, nodes.csv
└── README.md
```

## Key Configuration Files

### Backend - application.properties
- `server.port=8081`
- `routeops.routing.url=http://localhost:18080/route`
- Uses H2 in-memory database (auto-creates on startup)

### Frontend - environment.ts
- Backend API URL: `http://localhost:8081/api`
- Map center coordinates
- Leaflet map configuration

## Next Steps

1. Ensure routing engine is running (CMake setup required)
2. Verify backend is running on 8081
3. Install Node.js and start frontend on 4200
4. Open `http://localhost:4200` in browser
5. Register a user and test route planning
6. Monitor live location tracking and rerouting logic

## Performance Notes

- Route recalculation takes ~200-500ms
- Location updates every 30-60 seconds recommended
- H2 in-memory database stores all session data
- Each route session stores full path nodes for accurate tracking

---

For detailed API documentation, see [ROUTING_BACKEND_TESTCASES.md](./ROUTING_BACKEND_TESTCASES.md)
