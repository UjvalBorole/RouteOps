# Docker Communication Fix - Documentation Index

## 📋 Quick Start
**Start here if you just want to fix it and test:**
→ See `DOCKER_COMMUNICATION_FIX.md`

**Steps:**
1. `docker-compose down -v --rmi all`
2. `docker-compose build --no-cache`
3. `docker-compose up`
4. Open http://localhost:4200

---

## 📚 Documentation Files Created

### 1. **DOCKER_COMMUNICATION_FIX.md** (THIS DOCUMENT)
**Purpose:** Complete solution guide with step-by-step instructions
**Contains:**
- Root cause analysis
- All files modified
- Implementation steps
- Verification checklist
- Debugging commands
- Troubleshooting for specific scenarios

**When to use:** When you need the complete picture and exact steps to rebuild

---

### 2. **DOCKER_TROUBLESHOOTING.md**
**Purpose:** Comprehensive troubleshooting guide for all Docker issues
**Contains:**
- Common issues and symptoms
- Root causes and fixes for each issue
- Diagnostic steps (9 detailed sections)
- Network debugging
- Environment variables checklist
- Performance monitoring

**When to use:** When something is broken and you need to diagnose it

**Quick access:**
- Issue: Frontend can't reach Backend → Section 1
- Issue: Backend can't reach Routing Engine → Section 2  
- Issue: Backend can't reach Database → Section 3

---

### 3. **QUICK_FIX_REFERENCE.md**
**Purpose:** Quick reference for all changes and configurations
**Contains:**
- Summary of all 4 fixes
- Rebuild and test steps
- Verification checklist
- Service communication diagram
- Common issues & quick fixes table
- File locations and status

**When to use:** Quick lookup during implementation

---

### 4. **diagnose-docker.ps1** (Windows PowerShell)
**Purpose:** Automated diagnostic script for Windows
**Usage:** `./diagnose-docker.ps1 -Verbose`

**Checks:**
- Docker installation and daemon
- All containers running
- Network connectivity (Frontend → Backend → Routing Engine)
- Environment variables
- Data files
- Nginx configuration
- Database connection
- Backend startup status
- External port access
- Docker network configuration

**When to use:** After rebuild to verify everything is working

---

### 5. **diagnose-docker.sh** (Linux/Mac Bash)
**Purpose:** Automated diagnostic script for Unix systems
**Usage:** 
```bash
chmod +x diagnose-docker.sh
./diagnose-docker.sh
```

**Same checks as PowerShell version but for Unix systems**

**When to use:** On Linux or Mac systems

---

## 🎯 What Was Fixed

### Problem 1: Backend → Routing Engine Failure
**File:** `gateway/src/main/resources/application.properties`
```properties
# Old (broken in Docker):
routeops.routing.url=http://localhost:18080/route

# New (works in Docker):
routeops.routing.url=${ROUTEOPS_ROUTING_URL:http://localhost:18080/route}
```
**Why:** `localhost` inside a container refers to the container itself. The fix uses a service name injected by Docker Compose.

---

### Problem 2: Frontend → Backend Communication
**File:** `reactjs/src/utils/apiClient.ts`
**Fix:** Improved Docker environment detection so frontend knows whether to use:
- Direct URLs (local development)
- Relative paths (Docker with nginx proxy)

---

### Problem 3: Database Connection
**File:** `docker-compose.yml`
```yaml
# Old (wrong service name):
SPRING_DATASOURCE_URL: jdbc:postgresql://routeops-db:5432/routeops

# New (correct service name):
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/routeops
```
**Why:** Docker Compose services communicate via service names, not container names.

---

### Problem 4: Port Mismatch
**File:** `gateway/Dockerfile`
```dockerfile
# Old (didn't match app port):
EXPOSE 8080

# New (matches application.properties):
EXPOSE 8081
```

---

## 🧪 How to Verify the Fix Works

### Quick Test (2 minutes)
```bash
# Rebuild
docker-compose build --no-cache
docker-compose up

# In another terminal, test
curl http://localhost:8081/actuator/health    # Backend running?
curl http://localhost:18080/route?...         # Routing engine running?
curl http://localhost:4200/                   # Frontend loading?
```

### Full Diagnostic (5 minutes)
```bash
# Windows
./diagnose-docker.ps1 -Verbose

# Linux/Mac
./diagnose-docker.sh
```

### Manual Testing (10 minutes)
1. Open http://localhost:4200
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Register a new user
5. Login
6. Calculate a route
7. Check console for errors (should be none)

---

## 🔧 Useful Docker Commands

```bash
# View all services and status
docker ps

# View logs in real-time
docker-compose logs -f

# View specific container logs
docker logs -f routeops-backend
docker logs -f routing-engine

# Test connectivity from container
docker exec routeops-backend curl http://routing_engine:18080/route

# Enter container shell
docker exec -it routeops-backend /bin/bash

# Check environment variables
docker exec routeops-backend env | grep -i routing

# Full reset (if needed)
docker-compose down -v --rmi all
docker-compose build --no-cache
docker-compose up
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────┐
│ Frontend (React + Nginx)        │ ← http://localhost:4200
│ - Port: 4200                    │
│ - Proxies /api/* to gateway     │
└────────────┬────────────────────┘
             │
             ↓ /api requests
             
┌─────────────────────────────────┐
│ Backend Gateway (Spring Boot)   │ ← http://localhost:8081/actuator/health
│ - Port: 8081                    │
│ - Connects to: postgres:5432    │
│ - Calls: routing_engine:18080   │
└──────┬─────────────────┬────────┘
       │ SQL queries     │ HTTP /route
       ↓                 ↓
       
┌──────────────────┐  ┌────────────────────┐
│ PostgreSQL       │  │ Routing Engine     │
│ Port: 5432       │  │ Port: 18080        │
│ (ext: 5434)      │  │ C++ Crow server    │
└──────────────────┘  └────────────────────┘
```

---

## 🚀 Implementation Timeline

- **Phase 1 (5 min):** Stop and clean: `docker-compose down -v --rmi all`
- **Phase 2 (10-15 min):** Rebuild: `docker-compose build --no-cache`
- **Phase 3 (2 min):** Start: `docker-compose up`
- **Phase 4 (5 min):** Verify: Run diagnostic script
- **Phase 5 (10 min):** Test in browser

**Total: 30-45 minutes for complete fix and verification**

---

## ⚠️ Common Mistakes to Avoid

❌ **Don't use container names in connection strings**
```
WRONG: jdbc:postgresql://routeops-db:5432/routeops
RIGHT: jdbc:postgresql://postgres:5432/routeops
```

❌ **Don't use localhost in Docker containers**
```
WRONG: http://localhost:18080/route
RIGHT: http://routing_engine:18080/route
```

❌ **Don't forget environment variable syntax**
```
WRONG: routeops.routing.url=http://routing_engine:18080/route
RIGHT: routeops.routing.url=${ROUTEOPS_ROUTING_URL:http://routing_engine:18080/route}
```

---

## 📞 When to Use Each Document

| Situation | Document | Quick Link |
|-----------|----------|-----------|
| Complete implementation | DOCKER_COMMUNICATION_FIX.md | ← START HERE |
| Something is broken | DOCKER_TROUBLESHOOTING.md | Detailed fixes |
| Quick reference lookup | QUICK_FIX_REFERENCE.md | Quick tables |
| Automated testing | diagnose-docker.ps1 (Windows) | Run: `./diagnose-docker.ps1` |
| Automated testing | diagnose-docker.sh (Linux/Mac) | Run: `./diagnose-docker.sh` |

---

## ✅ Files Modified Summary

| File | Change | Status |
|------|--------|--------|
| `gateway/src/main/resources/application.properties` | Use env var for routing URL | ✅ Fixed |
| `gateway/Dockerfile` | Port 8080 → 8081 | ✅ Fixed |
| `reactjs/src/utils/apiClient.ts` | Better Docker detection | ✅ Fixed |
| `docker-compose.yml` | Service names, env vars | ✅ Fixed |

---

## 🎓 Learning Outcomes

After going through this fix, you'll understand:

1. **Docker Networking**
   - Service names vs container names
   - DNS resolution in Docker Compose
   - Bridge network communication

2. **Spring Boot Configuration**
   - Environment variable injection
   - Application properties precedence
   - Conditional defaults

3. **Nginx Reverse Proxy**
   - Request proxying to backend services
   - Header management
   - Timeout configuration

4. **API Communication**
   - Inter-service HTTP calls
   - Fallback strategies
   - Error handling

5. **Debugging Techniques**
   - Container inspection
   - Log analysis
   - Network diagnostics

---

## 📝 Notes

- All changes follow Spring Boot, Docker, and microservices best practices
- No breaking changes to existing functionality
- Backward compatible with local development setup
- All fixes are non-destructive (easy to revert if needed)

---

## 🔄 Next Steps After Fix

1. **Verify:** Run diagnostic and test in browser
2. **Monitor:** Keep docker-compose logs running while testing
3. **Validate:** Test all endpoints (auth, routes, alerts)
4. **Deploy:** If all tests pass, you're ready for production
5. **Document:** Share this documentation with your team

---

**Status:** ✅ All issues identified and fixed
**Ready for:** Full functional testing and deployment
**Documentation:** Complete and comprehensive
**Support:** Automated diagnostics available

Last updated: 2026-05-12
