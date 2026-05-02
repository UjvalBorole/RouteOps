#!/usr/bin/env pwsh

# Test RouteOps Local Services

Write-Host "================================" -ForegroundColor Cyan
Write-Host "RouteOps Service Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test Routing Engine
Write-Host "Testing Routing Engine (port 18080)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:18080/health" -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Routing Engine: ONLINE" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  Status: $($data.status)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Routing Engine: OFFLINE" -ForegroundColor Red
}
Write-Host ""

# Test Backend
Write-Host "Testing Backend API (port 8081)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/actuator/health" -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend API: ONLINE" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  Status: $($data.status)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend API: OFFLINE" -ForegroundColor Red
}
Write-Host ""

# Test Frontend
Write-Host "Testing Frontend (port 4200)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200/" -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Frontend: ONLINE" -ForegroundColor Green
    }
} catch {
    Write-Host "○ Frontend: NOT YET STARTED (Run: cd fleetops-frontend && npm start)" -ForegroundColor Yellow
}
Write-Host ""

# Test Backend to Routing Engine Communication
Write-Host "Testing Backend -> Routing Engine Connection..." -ForegroundColor Yellow
try {
    $routeData = @{
        startLat = 45.6567
        startLng = 24.5679
        endLat = 45.6600
        endLng = 24.5700
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:18080/route" `
        -Method POST `
        -ContentType "application/json" `
        -Body $routeData `
        -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Routing Engine API: WORKING" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  Distance: $($data.distance)m" -ForegroundColor Green
        Write-Host "  Duration: $($data.duration)s" -ForegroundColor Green
        Write-Host "  Waypoints: $($data.nodes)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Routing Engine API: NOT RESPONDING" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Service Status Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Routing Engine:  http://localhost:18080" -ForegroundColor Green
Write-Host "Backend API:     http://localhost:8081" -ForegroundColor Green
Write-Host "Frontend:        http://localhost:4200 (Start manually)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next: Start Frontend with: cd fleetops-frontend && npm start" -ForegroundColor Cyan
