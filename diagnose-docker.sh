#!/bin/bash

# RouteOps Docker Diagnostic Script
# This script performs comprehensive checks on the Docker setup

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== RouteOps Docker Diagnostic ===${NC}"
echo ""

# Check 1: Docker is running
echo -e "${BLUE}[1/10] Checking Docker daemon...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi
echo ""

# Check 2: All containers are running
echo -e "${BLUE}[2/10] Checking container status...${NC}"
containers=("routeops-db" "routing-engine" "routeops-backend" "routeops-frontend")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        echo -e "${GREEN}✓ $container is running${NC}"
    else
        echo -e "${RED}✗ $container is NOT running${NC}"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    echo -e "${YELLOW}Attempting to start containers...${NC}"
    docker-compose up -d
fi
echo ""

# Check 3: Network connectivity
echo -e "${BLUE}[3/10] Checking network connectivity...${NC}"

# Test Frontend → Backend
echo -n "Frontend (Nginx) → Backend (Gateway)... "
if docker exec routeops-frontend wget -q -O- http://gateway:8081/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test Backend → Routing Engine
echo -n "Backend (Gateway) → Routing Engine... "
if docker exec routeops-backend wget -q -O- "http://routing_engine:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test Backend → Database
echo -n "Backend (Gateway) → Database (PostgreSQL)... "
if docker exec routeops-backend pg_isready -h postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi
echo ""

# Check 4: Environment Variables
echo -e "${BLUE}[4/10] Checking environment variables in backend...${NC}"

echo -n "SPRING_DATASOURCE_URL... "
url=$(docker exec routeops-backend env | grep SPRING_DATASOURCE_URL || echo "")
if [[ $url == *"postgres"* ]] && [[ $url == *"5432"* ]]; then
    echo -e "${GREEN}✓ Correct${NC}"
else
    echo -e "${RED}✗ Incorrect (should use 'postgres' service)${NC}"
fi

echo -n "ROUTEOPS_ROUTING_URL... "
url=$(docker exec routeops-backend env | grep ROUTEOPS_ROUTING_URL || echo "")
if [[ $url == *"routing_engine"* ]] && [[ $url == *"18080"* ]]; then
    echo -e "${GREEN}✓ Correct${NC}"
else
    echo -e "${RED}✗ Incorrect (should use 'routing_engine' service)${NC}"
fi
echo ""

# Check 5: Routing Engine Data Files
echo -e "${BLUE}[5/10] Checking Routing Engine data files...${NC}"

echo -n "nodes.csv... "
if docker exec routing-engine test -f /app/nodes.csv; then
    echo -e "${GREEN}✓ Present${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
fi

echo -n "edges.csv... "
if docker exec routing-engine test -f /app/edges.csv; then
    echo -e "${GREEN}✓ Present${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
fi
echo ""

# Check 6: Nginx Configuration
echo -e "${BLUE}[6/10] Checking Nginx configuration...${NC}"

echo -n "Nginx config validity... "
if docker exec routeops-frontend nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Valid${NC}"
else
    echo -e "${RED}✗ Invalid${NC}"
fi

echo -n "API proxy configuration... "
if docker exec routeops-frontend grep -q "proxy_pass http://gateway:8081" /etc/nginx/conf.d/default.conf; then
    echo -e "${GREEN}✓ Configured${NC}"
else
    echo -e "${RED}✗ Not configured${NC}"
fi
echo ""

# Check 7: Database Connection
echo -e "${BLUE}[7/10] Checking database connection...${NC}"

db_password=$(cat ./secrets/db_password.txt 2>/dev/null || echo "unknown")

echo -n "Database responds to connection... "
if docker exec routeops-db pg_isready -U user > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Responding${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi

echo -n "Database 'routeops' exists... "
if docker exec routeops-db psql -U user -d routeops -c "\l" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${RED}✗ Does not exist${NC}"
fi
echo ""

# Check 8: Backend Logs
echo -e "${BLUE}[8/10] Checking backend startup status...${NC}"

echo -n "Spring Boot started successfully... "
if docker logs routeops-backend 2>&1 | grep -q "Started.*Application"; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${YELLOW}⚠ Check logs for details${NC}"
fi

echo -n "Routing URL configured... "
if docker logs routeops-backend 2>&1 | grep -q "routeops.routing.url"; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${YELLOW}⚠ Check logs for details${NC}"
fi
echo ""

# Check 9: External Port Access
echo -e "${BLUE}[9/10] Checking external port access...${NC}"

echo -n "Frontend accessible on :4200... "
if curl -s http://localhost:4200/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${RED}✗ No${NC}"
fi

echo -n "Backend accessible on :8081... "
if curl -s http://localhost:8081/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${RED}✗ No${NC}"
fi

echo -n "Routing Engine accessible on :18080... "
if curl -s "http://localhost:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${RED}✗ No${NC}"
fi
echo ""

# Check 10: Docker Network
echo -e "${BLUE}[10/10] Checking Docker network...${NC}"

echo -n "route-network exists... "
if docker network inspect route-network > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Yes${NC}"
else
    echo -e "${RED}✗ No${NC}"
fi

echo -n "All services on route-network... "
services_on_network=$(docker network inspect route-network --format='{{len .Containers}}')
if [ "$services_on_network" -eq 4 ]; then
    echo -e "${GREEN}✓ Yes (4 services)${NC}"
else
    echo -e "${RED}✗ Only $services_on_network services connected${NC}"
fi
echo ""

echo -e "${BLUE}=== Diagnostic Complete ===${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Access frontend: http://localhost:4200"
echo "2. Check browser console for API errors"
echo "3. Monitor logs: docker-compose logs -f"
echo "4. Review DOCKER_TROUBLESHOOTING.md for detailed fixes"
