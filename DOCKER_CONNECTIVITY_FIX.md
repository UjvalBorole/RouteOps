# Docker Inter-Container Communication Fix

## Problem Summary
**Symptom:** Gateway service could not communicate with Routing Engine when both ran in Docker, but they could communicate when running locally (without Docker).

**Root Cause:** The Crow C++ HTTP server in the routing engine was binding to `127.0.0.1` (localhost only) instead of `0.0.0.0` (all network interfaces).

```
🔴 Without Fix: localhost:18080 - NOT accessible from other containers
🟢 With Fix:    0.0.0.0:18080   - Accessible from other containers
```

## Why This Happens

### How Docker Networking Works
- **Locally (without Docker):** `localhost` = `127.0.0.1` on your machine
- **In Docker Containers:** `localhost` = `127.0.0.1` **inside that container only**
- **Between Containers:** Need to bind to `0.0.0.0` to be reachable by other containers on the network

### The Default Crow Behavior
The Crow C++ web framework by default binds to `127.0.0.1`:
```cpp
app.port(18080).multithreaded().run();  // Binds to 127.0.0.1:18080 by default
```

When the gateway tries to reach `http://routing_engine:18080`:
- DNS resolves `routing_engine` → `172.18.0.3` ✅ (works)
- TCP connection to `172.18.0.3:18080` ❌ (fails - not listening)

## The Solution

### Code Change
**File:** `routing-engine/main.cpp` (Line ~78)

**Before:**
```cpp
app.port(18080).multithreaded().run();
```

**After:**
```cpp
app.port(18080).bindaddr("0.0.0.0").multithreaded().run();
```

The `.bindaddr("0.0.0.0")` method tells Crow to listen on all network interfaces.

### Rebuild & Restart
```bash
docker-compose down routing_engine
docker-compose build routing_engine
docker-compose up -d routing_engine
```

## Verification

### Test 1: Verify Port Binding
```bash
docker exec routing-engine netstat -tlnp | grep 18080
# Should show: tcp 0.0.0.0:18080 LISTEN
```

### Test 2: Test from Gateway Container
```bash
docker exec routeops-backend wget -O- \
  'http://routing_engine:18080/route?startLat=19.0760&startLng=72.8777&endLat=19.1136&endLng=72.8697'
# Should return JSON with route data
```

### Test 3: Check Gateway Logs
```bash
docker logs routeops-backend | grep -i routing
# Should show no "unavailable" or "timeout" messages
```

## Current Status
✅ **FIXED** - Routing engine now binds to 0.0.0.0:18080  
✅ Gateway can successfully communicate with routing_engine  
✅ API requests complete successfully  

## Docker Networking Architecture

```
┌─────────────────────────────────────────┐
│      Docker Bridge Network               │
│      (route-network - 172.18.0.0/16)    │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────┐                   │
│  │  routeops-db     │                   │
│  │  172.18.0.2:5432 │                   │
│  └──────────────────┘                   │
│                                          │
│  ┌──────────────────────────┐            │
│  │  routing-engine          │            │
│  │  172.18.0.3:18080        │            │
│  │  (0.0.0.0:18080 inside)  │ ← FIXED   │
│  └──────────────────────────┘            │
│           ↑ (makes requests to)          │
│           │                              │
│  ┌──────────────────────────┐            │
│  │  routeops-backend        │            │
│  │  (gateway)               │            │
│  │  172.18.0.4:8081         │            │
│  └──────────────────────────┘            │
│                                          │
│  ┌──────────────────────────┐            │
│  │  routeops-frontend       │            │
│  │  172.18.0.5:80           │            │
│  └──────────────────────────┘            │
│                                          │
└─────────────────────────────────────────┘
```

## Key Takeaways

1. **Always bind to 0.0.0.0** in containerized applications if they need to be reachable by other containers
2. **localhost is NOT visible** from other containers - it refers to the container's own loopback interface
3. **Service names work** (DNS resolution to container IPs) but only if the service is listening on the right interface
4. **Test in Docker before deployment** - local testing may mask networking issues

## Related Configuration
- **Docker Compose:** `docker-compose.yml` - Defines `route-network: bridge`
- **Gateway Config:** `gateway/src/main/resources/application.properties`
  ```properties
  routeops.routing.url=${ROUTEOPS_ROUTING_URL:http://localhost:18080/route}
  ```
- **Runtime Override:** `docker-compose.yml` environment variable
  ```yaml
  ROUTEOPS_ROUTING_URL: http://routing_engine:18080/route
  ```

## Troubleshooting

### If gateway still can't reach routing_engine:

1. **Verify containers are on the same network:**
   ```bash
   docker network inspect route-network
   ```

2. **Check actual port binding inside container:**
   ```bash
   docker exec routing-engine ss -tlnp
   ```

3. **Test DNS resolution:**
   ```bash
   docker exec routeops-backend nslookup routing_engine
   ```

4. **Test basic connectivity:**
   ```bash
   docker exec routeops-backend ping -c 4 routing_engine
   ```

5. **Check firewall (less common in Docker):**
   ```bash
   docker logs routing-engine | tail -50
   ```
