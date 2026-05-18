# Quick Fix Reference - Docker Communication Issues

## Summary of Changes Made

### 1. ✅ Backend → Routing Engine Communication Fixed
**File:** `gateway/src/main/resources/application.properties`
```properties
# BEFORE (hardcoded - fails in Docker):
routeops.routing.url=http://localhost:18080/route

# AFTER (uses environment variable):
routeops.routing.url=${ROUTEOPS_ROUTING_URL:http://localhost:18080/route}
```
**Why:** Inside Docker containers, `localhost` refers to the container itself, not the host or other containers. Using the environment variable `${ROUTEOPS_ROUTING_URL}` allows Docker Compose to inject the correct service name.

---

### 2. ✅ Frontend → Backend Communication Improved
**File:** `reactjs/src/utils/apiClient.ts`
```typescript
// IMPROVED: Better detection of Docker vs local environment
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // In Docker containers (non-localhost hostname)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return ''; // Use relative path - nginx proxies to gateway
    }
    
    // Local development - use full URL
    const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
    return baseUrl;
  }
  
  return 'http://localhost:8081';
};
```
**Why:** Ensures frontend uses relative paths when behind Nginx proxy (in Docker) and full URLs when in local development.

---

### 3. ✅ Port Mismatch Fixed
**File:** `gateway/Dockerfile`
```dockerfile
# BEFORE:
EXPOSE 8080

# AFTER:
EXPOSE 8081
```
**Why:** Spring Boot runs on port 8081 (per `application.properties`), so Dockerfile must expose the same port for proper documentation and health checks.

---

### 4. ✅ Docker Compose Configuration Updated
**File:** `docker-compose.yml`

**Database Connection (Backend):**
```yaml
# BEFORE:
SPRING_DATASOURCE_URL: jdbc:postgresql://routeops-db:5432/routeops

# AFTER:
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/routeops
```
**Why:** `postgres` is the service name in Docker Compose; `routeops-db` is just the container name. Services communicate via service names.

**Routing Engine Connection (Backend):**
```yaml
# BEFORE:
ROUTEOPS_ROUTING_URL: http://routing_engine:18080

# AFTER:
ROUTEOPS_ROUTING_URL: http://routing_engine:18080/route
```
**Why:** Must include the `/route` endpoint path that the Routing Engine exposes.

---

## Docker Service Communication Reference

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Nginx) - Port 4200                  │
│  - Serves static React app                             │
│  - Proxies /api/* → gateway:8081                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ /api/* requests
                     │ (via nginx proxy)
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Gateway (Spring Boot) - Port 8081             │
│  - REST API endpoints                                  │
│  - DB: jdbc:postgresql://postgres:5432/routeops       │
│  - Routing: http://routing_engine:18080/route         │
└──────────────┬─────────────────────────────┬───────────┘
               │                             │
               │ SQL queries                 │ HTTP GET /route
               │                             │
               ↓                             ↓
    ┌─────────────────────┐    ┌──────────────────────┐
    │ PostgreSQL (DB)     │    │ Routing Engine       │
    │ Port 5432           │    │ Port 18080           │
    │ (external: 5434)    │    │ (C++ Crow server)    │
    └─────────────────────┘    └──────────────────────┘
```

---

## Step-by-Step: Rebuild and Test

### 1. Stop Current Containers
```bash
docker-compose down -v
```

### 2. Rebuild from Scratch
```bash
docker-compose build --no-cache
```

### 3. Start Services
```bash
docker-compose up
```
Leave this running and open another terminal for diagnostics.

### 4. Run Diagnostic (Windows - PowerShell)
```powershell
./diagnose-docker.ps1 -Verbose
```

### 5. Run Diagnostic (Linux/Mac)
```bash
chmod +x diagnose-docker.sh
./diagnose-docker.sh
```

### 6. Test in Browser
- **Frontend:** http://localhost:4200
- **Backend Health:** http://localhost:8081/actuator/health
- **Route Engine:** http://localhost:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9

---

## Verification Checklist

- [ ] All 4 containers running: `docker ps`
- [ ] Frontend loads at http://localhost:4200
- [ ] Backend responds at http://localhost:8081/actuator/health
- [ ] Browser console shows no CORS/network errors
- [ ] Backend logs show no "Routing Engine unavailable" warnings
- [ ] Route calculation works (test endpoint returns JSON)
- [ ] Database queries work (user can login/register)

---

## Common Issues & Quick Fixes

| Issue | Quick Check | Fix |
|-------|------------|-----|
| Frontend can't reach backend | `docker exec routeops-frontend curl http://gateway:8081` | Check nginx proxy config, backend logs |
| Backend can't reach routing | `docker exec routeops-backend curl http://routing_engine:18080/route` | Check ROUTEOPS_ROUTING_URL env var |
| Backend can't reach database | `docker exec routeops-backend pg_isready -h postgres` | Check SPRING_DATASOURCE_URL env var |
| Services can't find each other | `docker network inspect route-network` | Ensure all services on same network |
| Port already in use | `netstat -tuln` (Linux) or `netstat -ano` (Windows) | Kill process or change docker-compose port mapping |

---

## Environment Variable Configuration

All services are configured via Docker Compose. Key variables for Backend:

```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/routeops
SPRING_DATASOURCE_USERNAME: user
# Password loaded from /run/secrets/db_password

ROUTEOPS_ROUTING_URL: http://routing_engine:18080/route

APPLICATION_SECURITY_JWT_SECRET_KEY: (loaded from /run/secrets/jwt_secret)
```

These are **NOT** hardcoded - they're injected by Docker at container startup.

---

## File Locations

| File | Purpose | Status |
|------|---------|--------|
| `gateway/src/main/resources/application.properties` | Backend config | ✅ Fixed |
| `gateway/Dockerfile` | Backend container definition | ✅ Fixed |
| `gateway/entrypoint.sh` | Backend startup script | ✓ Correct |
| `reactjs/src/utils/apiClient.ts` | Frontend API client | ✅ Fixed |
| `reactjs/nginx.conf` | Frontend proxy config | ✓ Correct |
| `docker-compose.yml` | Service orchestration | ✅ Updated |

---

## Next Steps After Rebuild

1. **Monitor logs** while testing:
   ```bash
   docker-compose logs -f
   ```

2. **Test user registration:**
   ```bash
   curl -X POST http://localhost:4200/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"123456"}'
   ```

3. **Test route calculation:**
   ```bash
   # First login to get JWT token
   # Then use it for route API calls
   ```

4. **Check browser console:**
   - Open http://localhost:4200
   - Press F12 for DevTools
   - Go to Console tab
   - Look for any red errors or warnings

5. **Review Routing Engine logs:**
   ```bash
   docker logs -f routing-engine
   ```
   Should show "--- [SERVER START] ---" and "Nodes loaded successfully"

---

## Advanced: Enable Debug Logging

Edit `gateway/src/main/resources/application.properties`:
```properties
logging.level.root=DEBUG
logging.level.org.springframework=DEBUG
logging.level.org.routeops.gateway=DEBUG
```

Then rebuild and check logs:
```bash
docker-compose build
docker-compose up
docker-compose logs -f routeops-backend | grep -i "routing\|route"
```

---

## Troubleshooting Resources

- **Detailed guide:** See `DOCKER_TROUBLESHOOTING.md`
- **Diagnostic script:** Windows `diagnose-docker.ps1` or Linux `diagnose-docker.sh`
- **Docker logs:** `docker logs <container-name>`
- **Container shell:** `docker exec -it <container-name> /bin/bash` (or cmd for Windows containers)

---

## Architecture Details

### DNS Resolution in Docker Compose

When Backend (running in `gateway` service) tries to connect to Routing Engine:
1. Backend makes request to `http://routing_engine:18080`
2. Docker DNS resolves `routing_engine` → internal IP (e.g., 172.20.0.4)
3. Traffic is routed through bridge network to routing_engine container

**This ONLY works because:**
- All services are on the same Docker network (`route-network`)
- Service names are used (not container names or IPs)
- Hostname is correctly set in environment variables

---

## Performance Notes

- **Nginx proxy:** Adds minimal overhead (<5ms) but enables service isolation
- **WebClient:** Spring Boot's WebClient (async) is used for Routing Engine calls
- **Database:** Connection pooling handled by Spring Boot automatically
- **Networking:** Bridge network mode is sufficient for local Docker setup

---

Generated: 2026-05-12 | Updated: After Docker communication fixes
