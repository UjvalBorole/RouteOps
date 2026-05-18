$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJCb3JvbGV1anZhbDQiLCJpYXQiOjE3Nzg5MjYyNTgsImV4cCI6MTc3OTAxMjY1OH0.su-EGBPHhlWMkKGOTKLLmeQh-i-GrcaB7tcSg_g6LoxSdQPkP0EQaFkWCcnl7uh1'
    'Content-Type' = 'application/json'
}

$body = @{
    startLat = 19.0186
    startLng = 72.8436
    endLat = 19.0728
    endLng = 72.8826
    startAddress = 'Panvel'
    destinationAddress = 'Kurla'
    vehicleType = 'car'
    sessionName = 'Daily Commute'
    destinationThresholdMeters = 80
    destinationThresholdSeconds = 0
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:8081/api/routes/plan' -Method POST -Headers $headers -Body $body -UseBasicParsing -ErrorAction Stop
    Write-Host "=== API RESPONSE ===" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Distance: $($content.totalDistance)"
    Write-Host "Status Message: $($content.status)"
} catch {
    Write-Host "=== ERROR ===" -ForegroundColor Red
    Write-Host "Error: $_"
    Write-Host "
=== BACKEND LOGS ===" -ForegroundColor Yellow
    docker logs routeops-backend 2>&1 | Select-String "Routing Engine" -Context 1,3 | Select-Object -Last 30
}
