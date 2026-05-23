# Comprehensive Docker Connection Diagnostic
# Tests gateway -> routing_engine communication

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DOCKER CONNECTION DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Test 1: Check if containers are running
Write-Host "[TEST 1] Container Status" -ForegroundColor Green
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host ""

# Test 2: Check network
Write-Host "[TEST 2] Network Information" -ForegroundColor Green
docker network inspect route-network --format='{{json .}}'  | ConvertFrom-Json | Select-Object -ExpandProperty Containers | Format-Table Name, IPv4Address
Write-Host ""

# Test 3: Test DNS resolution from gateway to routing_engine
Write-Host "[TEST 3] DNS Resolution Test (from gateway container)" -ForegroundColor Green
docker exec routeops-backend nslookup routing_engine
Write-Host ""

# Test 4: Test ping to routing_engine from gateway
Write-Host "[TEST 4] Ping Test (from gateway container)" -ForegroundColor Green
docker exec routeops-backend ping -c 4 routing_engine 2>&1
Write-Host ""

# Test 5: Test curl to routing_engine from gateway
Write-Host "[TEST 5] HTTP Connectivity Test - Basic" -ForegroundColor Green
Write-Host "Attempting: curl http://routing_engine:18080/route"
docker exec routeops-backend curl -v http://routing_engine:18080/route 2>&1 | Select-Object -First 30
Write-Host ""

# Test 6: Test with parameters
Write-Host "[TEST 6] HTTP Connectivity Test - With Parameters" -ForegroundColor Green
Write-Host "Attempting: curl with route parameters"
docker exec routeops-backend curl -v "http://routing_engine:18080/route?startLat=19.0760&startLng=72.8777&endLat=19.1136&endLng=72.8697" 2>&1 | Select-Object -First 40
Write-Host ""

# Test 7: Check routing_engine logs
Write-Host "[TEST 7] Routing Engine Container Logs (last 20 lines)" -ForegroundColor Green
docker logs routing-engine 2>&1 | tail -20
Write-Host ""

# Test 8: Check gateway logs for errors
Write-Host "[TEST 8] Gateway Container Logs (search for Routing/routing_engine)" -ForegroundColor Green
docker logs routeops-backend 2>&1 | Select-String -Pattern "routing|Routing|routing_engine" -Context 2 | Select-Object -Last 30
Write-Host ""

# Test 9: Inspect routing_engine container networking
Write-Host "[TEST 9] Routing Engine Network Details" -ForegroundColor Green
docker inspect routing-engine --format='{{ json .NetworkSettings }}' | ConvertFrom-Json | Format-List
Write-Host ""

# Test 10: Test from routing_engine perspective
Write-Host "[TEST 10] Test Connection From Routing Engine Container" -ForegroundColor Green
docker exec routing-engine curl -v http://localhost:18080/route 2>&1 | Select-Object -First 20
Write-Host ""

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "DIAGNOSTIC COMPLETE" -ForegroundColor Yellow
Write-Host "================================================`n" -ForegroundColor Yellow
