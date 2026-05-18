# Docker Communication Troubleshooting Guide

## Overview
This guide helps troubleshoot inter-service communication issues in the RouteOps Docker setup.

## Architecture Overview
```
Frontend (React/Nginx:4200)
    ↓ /api/* → (nginx proxy)
Backend Gateway (Java:8081)
    ↓ /route → (HTTP client)
Routing Engine (C++:18080)
```

## Common Issues & Fixes

### 1. Frontend Cannot Reach Backend (404 or Connection Refused)

**Symptoms:**
- Browser console shows API errors
- XHR/Fetch requests fail with CORS or connection errors
- Status: 504 Bad Gateway or 502

**Root Causes & Fixes:**

**Fix 1: Verify Docker Network**
```bash
# Check if services are on the same network
docker network ls
docker network inspect route-network

# Should show all 4 services: postgres, routing_engine, gateway, frontend
```

**Fix 2: Verify Backend is Running**
```bash
# Check gateway container logs
docker logs routeops-backend

# Look for "Started GatewayApplication" or Spring Boot startup messages
```

**Fix 3: Test Gateway Connectivity from Frontend**
```bash
# Enter frontend container
docker exec -it routeops-frontend sh

# Test connectivity to gateway
curl -v http://gateway:8081/actuator/health
```

**Fix 4: Check Nginx Configuration**
```bash
# Verify nginx config is valid
docker exec routeops-frontend nginx -t

# Check nginx error logs
docker exec routeops-frontend cat /var/log/nginx/error.log
```

---

### 2. Backend Cannot Reach Routing Engine (500 Error from /route Endpoint)

**Symptoms:**
- Route calculation endpoints return 500 errors
- Backend logs show "Routing Engine unavailable"
- Falls back to Haversine distance calculation

**Root Causes & Fixes:**

**Fix 1: Verify Routing Engine is Running**
```bash
# Check routing engine container logs
docker logs routing-engine

# Should show "--- [SERVER START] ---" and "Nodes loaded successfully"
```

**Fix 2: Verify Routing URL Configuration**
```bash
# Check if gateway has correct environment variable
docker exec routeops-backend env | grep ROUTING

# Output should be: ROUTEOPS_ROUTING_URL=http://routing_engine:18080/route
```

**Fix 3: Test Routing Engine Connectivity from Backend**
```bash
# Enter gateway container
docker exec -it routeops-backend sh

# Test routing engine directly
curl -v "http://routing_engine:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9"

# Should return a JSON route response
```

**Fix 4: Verify Data Files in Routing Engine**
```bash
# Check if CSV files are present
docker exec routing-engine ls -la /app/

# Should show: nodes.csv, edges.csv, routing_engine executable
```

---

### 3. Backend Cannot Reach Database

**Symptoms:**
- Backend logs show database connection errors
- Port 5434 not responding
- "Connection refused" errors

**Root Causes & Fixes:**

**Fix 1: Verify Database Service Name**
- Docker service name must be: `postgres` (not `routeops-db`)
- Connection string: `jdbc:postgresql://postgres:5432/routeops`

**Fix 2: Test Database Connectivity**
```bash
# Enter gateway container
docker exec -it routeops-backend sh

# Test database connectivity (assuming psql is available or use curl for health check)
curl -v http://postgres:5432/

# Or from host (external connection)
psql -h localhost -p 5434 -U user -d routeops
# Password: (from secrets/db_password.txt)
```

**Fix 3: Check Database Logs**
```bash
docker logs routeops-db

# Look for successful initialization messages
```

---

## Complete Diagnostic Steps

### Step 1: Verify All Containers are Running
```bash
docker ps

# Should show 4 containers:
# - routeops-db (postgres)
# - routing-engine (C++ app)
# - routeops-backend (Java gateway)
# - routeops-frontend (Nginx)
```

### Step 2: Test External Connectivity
```bash
# From Windows host machine:

# Frontend
curl http://localhost:4200/

# Backend (direct)
curl http://localhost:8081/actuator/health

# Routing Engine (direct)
curl "http://localhost:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9"

# Database
psql -h localhost -p 5434 -U user -d routeops
```

### Step 3: Test Internal Connectivity (from containers)
```bash
# Test from frontend container
docker exec routeops-frontend curl http://gateway:8081/actuator/health

# Test from backend container
docker exec routeops-backend curl http://routing_engine:18080/route

# Test database
docker exec routeops-backend curl http://postgres:5432/
```

### Step 4: Check Logs
```bash
# All container logs with timestamps
docker-compose logs --timestamps

# Follow logs in real-time
docker-compose logs -f

# Specific container logs
docker logs -f routeops-backend
docker logs -f routing-engine
docker logs -f routeops-frontend
```

---

## Network Debugging

### Verify DNS Resolution
```bash
# From gateway container, verify routing_engine hostname
docker exec routeops-backend getent hosts routing_engine

# Should return the internal IP: 172.x.x.x routing_engine
```

### Check Docker Network
```bash
# Inspect route-network
docker network inspect route-network

# Should show all 4 services with their IPs
```

---

## Environment Variables Checklist

### Gateway Container Must Have:
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/routeops
SPRING_DATASOURCE_USERNAME: user
ROUTEOPS_ROUTING_URL: http://routing_engine:18080/route
```

### Frontend Container Must Have:
```yaml
# Set in docker-compose, passed to nginx
GATEWAY_URL: http://gateway:8081
```

---

## Rebuild & Restart Procedure

If issues persist after debugging:

```bash
# Stop all containers
docker-compose down -v

# Remove all images (forces rebuild)
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose build --no-cache

# Start fresh
docker-compose up

# In another terminal, check logs
docker-compose logs -f
```

---

## Performance Monitoring

```bash
# Monitor container resource usage
docker stats

# Monitor network I/O between containers
docker exec routeops-backend tcpdump -i any -n "tcp port 18080"
```

---

## Port Reference

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| Frontend (Nginx) | 80 | 4200 | HTTP |
| Backend (Spring Boot) | 8081 | 8081 | HTTP |
| Routing Engine | 18080 | 18080 | HTTP |
| Database (PostgreSQL) | 5432 | 5434 | TCP |

---

## Configuration Files Modified

- ✅ `gateway/src/main/resources/application.properties` - Routing URL now uses environment variable
- ✅ `gateway/Dockerfile` - Port updated from 8080 to 8081
- ✅ `reactjs/src/utils/apiClient.ts` - Improved Docker hostname detection
- ✅ `docker-compose.yml` - Verified service names and configuration

---

## Quick Reference: What Each Service Does

**Frontend (Nginx on :4200)**
- Serves React SPA
- Proxies `/api/*` requests to Backend
- Handles static assets caching

**Backend Gateway (Spring Boot on :8081)**
- REST API endpoints
- Database operations via JPA/Hibernate
- Calls Routing Engine for route calculations
- WebSocket support for real-time updates

**Routing Engine (C++ on :18080)**
- Route optimization engine
- Takes start/end coordinates
- Returns optimal route via Dijkstra algorithm
- Requires nodes.csv and edges.csv data files

**Database (PostgreSQL on :5432)**
- Stores users, routes, alerts, sessions
- Connection string: `jdbc:postgresql://postgres:5432/routeops`

---

## Advanced Debugging: Enable Debug Logging

### Backend Java Logs
Edit `gateway/src/main/resources/application.properties`:
```properties
logging.level.root=DEBUG
logging.level.org.springframework=DEBUG
logging.level.org.routeops=DEBUG
```

### Nginx Access Logs
```bash
docker exec routeops-frontend tail -f /var/log/nginx/access.log
docker exec routeops-frontend tail -f /var/log/nginx/error.log
```

### Routing Engine
Already enables debug output to stdout, visible in:
```bash
docker logs routing-engine
```

---

## Common Misconfigurations

❌ **WRONG:**
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://routeops-db:5432/routeops
ROUTEOPS_ROUTING_URL: http://localhost:18080/route
```

✅ **CORRECT:**
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/routeops
ROUTEOPS_ROUTING_URL: http://routing_engine:18080/route
```

---

## Testing API Endpoints

```bash
# Register user
curl -X POST http://localhost:4200/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:4200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Calculate route (requires JWT token)
curl -X POST http://localhost:4200/api/routes/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startLat": 19.0,
    "startLng": 72.8,
    "endLat": 19.2,
    "endLng": 72.9,
    "vehicleWeight": 1000
  }'
