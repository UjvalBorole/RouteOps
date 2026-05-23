# RouteOps Docker Diagnostic Script for Windows (PowerShell)
# This script performs comprehensive checks on the Docker setup

param(
    [switch]$AutoFix = $false,
    [switch]$Verbose = $false
)

# Color codes
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message, [string]$Status = "INFO", [string]$Color = $Blue)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [$Status] $Message" -ForegroundColor $Color
}

Write-Status "RouteOps Docker Diagnostic Started" -Status "START" -Color $Blue
Write-Host ""

# Check 1: Docker is installed and running
Write-Status "Checking Docker installation..." -Status "1/11" -Color $Blue

try {
    $dockerVersion = docker --version
    Write-Status "Docker is installed: $dockerVersion" -Status "✓" -Color $Green
} catch {
    Write-Status "Docker is not installed or not in PATH" -Status "✗" -Color $Red
    exit 1
}

# Check if Docker daemon is running
try {
    docker ps > $null 2>&1
    Write-Status "Docker daemon is running" -Status "✓" -Color $Green
} catch {
    Write-Status "Docker daemon is NOT running" -Status "✗" -Color $Red
    Write-Status "Please start Docker Desktop or Docker daemon" -Status "ACTION" -Color $Yellow
    exit 1
}
Write-Host ""

# Check 2: Docker Compose is available
Write-Status "Checking Docker Compose..." -Status "2/11" -Color $Blue

try {
    $composeVersion = docker-compose --version
    Write-Status "Docker Compose: $composeVersion" -Status "✓" -Color $Green
} catch {
    Write-Status "Docker Compose not available" -Status "✗" -Color $Red
    exit 1
}
Write-Host ""

# Check 3: All containers running
Write-Status "Checking container status..." -Status "3/11" -Color $Blue

$requiredContainers = @("routeops-db", "routing-engine", "routeops-backend", "routeops-frontend")
$allRunning = $true

foreach ($container in $requiredContainers) {
    $running = docker ps --filter "name=$container" --format "{{.Names}}" 2>/dev/null | Select-String $container
    if ($running) {
        Write-Status "$container is running" -Status "✓" -Color $Green
    } else {
        Write-Status "$container is NOT running" -Status "✗" -Color $Red
        $allRunning = $false
    }
}

if (-not $allRunning) {
    if ($AutoFix) {
        Write-Status "Attempting to start containers..." -Status "ACTION" -Color $Yellow
        docker-compose up -d
    } else {
        Write-Status "Run: docker-compose up -d" -Status "ACTION" -Color $Yellow
    }
}
Write-Host ""

# Check 4: Frontend → Backend connectivity
Write-Status "Testing Frontend → Backend communication..." -Status "4/11" -Color $Blue

try {
    $health = docker exec routeops-frontend powershell -Command "Invoke-WebRequest -Uri 'http://gateway:8081/actuator/health' -UseBasicParsing" 2>$null
    Write-Status "Frontend can reach Backend Gateway ✓" -Status "✓" -Color $Green
} catch {
    Write-Status "Frontend CANNOT reach Backend Gateway ✗" -Status "✗" -Color $Red
    Write-Status "Check Backend container logs: docker logs routeops-backend" -Status "DEBUG" -Color $Yellow
}
Write-Host ""

# Check 5: Backend → Routing Engine connectivity
Write-Status "Testing Backend → Routing Engine communication..." -Status "5/11" -Color $Blue

try {
    $route = docker exec routeops-backend powershell -Command "Invoke-WebRequest -Uri 'http://routing_engine:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9' -UseBasicParsing" 2>$null
    if ($route.StatusCode -eq 200) {
        Write-Status "Backend can reach Routing Engine ✓" -Status "✓" -Color $Green
    } else {
        Write-Status "Backend received: $($route.StatusCode)" -Status "⚠" -Color $Yellow
    }
} catch {
    Write-Status "Backend CANNOT reach Routing Engine ✗" -Status "✗" -Color $Red
    Write-Status "Verify ROUTEOPS_ROUTING_URL environment variable" -Status "DEBUG" -Color $Yellow
}
Write-Host ""

# Check 6: Backend → Database connectivity
Write-Status "Testing Backend → Database communication..." -Status "6/11" -Color $Blue

try {
    $dbTest = docker exec routeops-backend powershell -Command "Test-NetConnection -ComputerName postgres -Port 5432 -InformationLevel Quiet" 2>$null
    if ($dbTest -or $LASTEXITCODE -eq 0) {
        Write-Status "Backend can reach Database ✓" -Status "✓" -Color $Green
    } else {
        Write-Status "Backend CANNOT reach Database ✗" -Status "✗" -Color $Red
    }
} catch {
    Write-Status "Database connectivity test error" -Status "⚠" -Color $Yellow
}
Write-Host ""

# Check 7: Environment variables
Write-Status "Checking environment variables in Backend..." -Status "7/11" -Color $Blue

$dsUrl = docker exec routeops-backend cmd /c "echo %SPRING_DATASOURCE_URL%" 2>$null
if ($dsUrl -match "postgres.*5432") {
    Write-Status "SPRING_DATASOURCE_URL is correct ✓" -Status "✓" -Color $Green
    if ($Verbose) { Write-Status "  $dsUrl" -Status "  " -Color $Blue }
} else {
    Write-Status "SPRING_DATASOURCE_URL may be incorrect ✗" -Status "✗" -Color $Red
    if ($Verbose) { Write-Status "  $dsUrl" -Status "  " -Color $Red }
}

$routingUrl = docker exec routeops-backend cmd /c "echo %ROUTEOPS_ROUTING_URL%" 2>$null
if ($routingUrl -match "routing_engine.*18080.*route") {
    Write-Status "ROUTEOPS_ROUTING_URL is correct ✓" -Status "✓" -Color $Green
    if ($Verbose) { Write-Status "  $routingUrl" -Status "  " -Color $Blue }
} else {
    Write-Status "ROUTEOPS_ROUTING_URL may be incorrect ✗" -Status "✗" -Color $Red
    if ($Verbose) { Write-Status "  $routingUrl" -Status "  " -Color $Red }
}
Write-Host ""

# Check 8: Routing Engine data files
Write-Status "Checking Routing Engine data files..." -Status "8/11" -Color $Blue

$nodesExist = docker exec routing-engine cmd /c "if exist C:\app\nodes.csv (echo YES) else (echo NO)" 2>/dev/null | Select-String "YES"
$edgesExist = docker exec routing-engine cmd /c "if exist C:\app\edges.csv (echo YES) else (echo NO)" 2>/dev/null | Select-String "YES"

if ($nodesExist) {
    Write-Status "nodes.csv exists ✓" -Status "✓" -Color $Green
} else {
    # Try Linux path
    $nodesExist = docker exec routing-engine test -f /app/nodes.csv 2>$null
    if ($?) {
        Write-Status "nodes.csv exists ✓" -Status "✓" -Color $Green
    } else {
        Write-Status "nodes.csv NOT found ✗" -Status "✗" -Color $Red
    }
}

if ($edgesExist) {
    Write-Status "edges.csv exists ✓" -Status "✓" -Color $Green
} else {
    # Try Linux path
    $edgesExist = docker exec routing-engine test -f /app/edges.csv 2>$null
    if ($?) {
        Write-Status "edges.csv exists ✓" -Status "✓" -Color $Green
    } else {
        Write-Status "edges.csv NOT found ✗" -Status "✗" -Color $Red
    }
}
Write-Host ""

# Check 9: External port access
Write-Status "Checking external port access..." -Status "9/11" -Color $Blue

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:4200/" -UseBasicParsing -TimeoutSec 5
    Write-Status "Frontend accessible on http://localhost:4200 ✓" -Status "✓" -Color $Green
} catch {
    Write-Status "Frontend NOT accessible on :4200 ✗" -Status "✗" -Color $Red
}

try {
    $backend = Invoke-WebRequest -Uri "http://localhost:8081/actuator/health" -UseBasicParsing -TimeoutSec 5
    Write-Status "Backend accessible on http://localhost:8081 ✓" -Status "✓" -Color $Green
} catch {
    Write-Status "Backend NOT accessible on :8081 ✗" -Status "✗" -Color $Red
}

try {
    $routing = Invoke-WebRequest -Uri "http://localhost:18080/route?startLat=19.0&startLng=72.8&endLat=19.2&endLng=72.9" -UseBasicParsing -TimeoutSec 5
    Write-Status "Routing Engine accessible on :18080 ✓" -Status "✓" -Color $Green
} catch {
    Write-Status "Routing Engine NOT accessible on :18080 ✗" -Status "✗" -Color $Red
}
Write-Host ""

# Check 10: Docker Network
Write-Status "Checking Docker network configuration..." -Status "10/11" -Color $Blue

try {
    $network = docker network inspect route-network 2>$null
    if ($network) {
        Write-Status "route-network exists ✓" -Status "✓" -Color $Green
        
        $containerCount = (docker network inspect route-network --format='{{len .Containers}}' 2>$null)
        Write-Status "Services on network: $containerCount/4" -Status "INFO" -Color $Blue
    } else {
        Write-Status "route-network NOT found ✗" -Status "✗" -Color $Red
    }
} catch {
    Write-Status "Error checking network" -Status "⚠" -Color $Yellow
}
Write-Host ""

# Check 11: Container logs for errors
Write-Status "Checking container logs for startup issues..." -Status "11/11" -Color $Blue

$backendLogs = docker logs --tail 20 routeops-backend 2>$null | Select-String -Pattern "ERROR|Exception|Failed" -List
$routingLogs = docker logs --tail 20 routing-engine 2>$null | Select-String -Pattern "ERROR|error" -List

if ($backendLogs) {
    Write-Status "Backend has potential errors in logs ⚠" -Status "⚠" -Color $Yellow
    Write-Status "Check: docker logs routeops-backend" -Status "ACTION" -Color $Yellow
} else {
    Write-Status "Backend logs look clean ✓" -Status "✓" -Color $Green
}

if ($routingLogs) {
    Write-Status "Routing Engine has potential errors ⚠" -Status "⚠" -Color $Yellow
    Write-Status "Check: docker logs routing-engine" -Status "ACTION" -Color $Yellow
} else {
    Write-Status "Routing Engine logs look clean ✓" -Status "✓" -Color $Green
}

Write-Host ""
Write-Status "Diagnostic Complete" -Status "DONE" -Color $Green

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Frontend URL:        http://localhost:4200" -ForegroundColor Green
Write-Host "Backend URL:         http://localhost:8081" -ForegroundColor Green
Write-Host "Routing Engine URL:  http://localhost:18080" -ForegroundColor Green
Write-Host "Database Port:       5434" -ForegroundColor Green
Write-Host ""
Write-Host "=== Useful Commands ===" -ForegroundColor Cyan
Write-Host "View all logs:       docker-compose logs -f" -ForegroundColor Cyan
Write-Host "Backend logs:        docker logs -f routeops-backend" -ForegroundColor Cyan
Write-Host "Routing Engine:      docker logs -f routing-engine" -ForegroundColor Cyan
Write-Host "Stop all services:   docker-compose down" -ForegroundColor Cyan
Write-Host "Rebuild and restart: docker-compose down -v --rmi all && docker-compose up --build" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed troubleshooting, see: DOCKER_TROUBLESHOOTING.md" -ForegroundColor Yellow
