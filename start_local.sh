#!/bin/bash

# RouteOps Local Development Startup Script
# Starts all services on localhost without Docker

echo "==============================================="
echo "RouteOps - Local Development Startup"
echo "==============================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Starting Routing Engine (Mock)${NC}"
if python --version > /dev/null 2>&1; then
    python mock_routing_engine.py &
    ROUTING_PID=$!
    echo -e "${GREEN}✓ Routing Engine started (PID: $ROUTING_PID)${NC}"
    echo "  URL: http://localhost:18080"
    sleep 2
else
    if python3 --version > /dev/null 2>&1; then
        python3 mock_routing_engine.py &
        ROUTING_PID=$!
        echo -e "${GREEN}✓ Routing Engine started (PID: $ROUTING_PID)${NC}"
        echo "  URL: http://localhost:18080"
        sleep 2
    else
        echo -e "${YELLOW}⚠ Python not found. Skipping Routing Engine.${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Step 2: Checking Backend Service${NC}"
if curl -s http://localhost:8081/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend already running${NC}"
    echo "  URL: http://localhost:8081"
else
    echo -e "${YELLOW}⚠ Backend not running${NC}"
    echo "  To start backend manually:"
    echo "    cd gateway && mvn spring-boot:run"
fi

echo ""
echo -e "${BLUE}Step 3: Frontend Setup${NC}"
if [ -d "fleetops-frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
else
    echo -e "${YELLOW}⚠ Frontend dependencies not installed${NC}"
    echo "  To install:"
    echo "    cd fleetops-frontend && npm install"
fi

echo ""
echo "==============================================="
echo -e "${GREEN}RouteOps Services Status${NC}"
echo "==============================================="
echo -e "${GREEN}✓${NC} Routing Engine:  http://localhost:18080"
echo -e "${GREEN}✓${NC} Backend API:     http://localhost:8081"
echo -e "${YELLOW}○${NC} Frontend:        http://localhost:4200 (start manually)"
echo ""
echo "Next Steps:"
echo "1. Start Backend (if not running):"
echo "   cd gateway && mvn spring-boot:run"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   cd fleetops-frontend && npm start"
echo ""
echo "3. Open browser:"
echo "   http://localhost:4200"
echo ""
echo "4. Test API:"
echo "   bash run_api_tests.sh"
echo ""
echo "==============================================="
