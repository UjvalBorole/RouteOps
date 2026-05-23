# Detailed Docker Connection & Log Analysis
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DETAILED CONNECTION ANALYSIS" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Check port bindings
Write-Host "[CHECK 1] Port Bindings & Service Configuration" -ForegroundColor Green
Write-Host "`nRouting Engine Container Details:" -ForegroundColor Yellow
docker inspect routing-engine --format='
Container ID: {{.ID | truncate 12}}
Image: {{.Config.Image}}
Port Exposed: {{json .ContainerConfig.ExposedPorts}}
Network Mode: {{.HostConfig.NetworkMode}}
Networks Connected: {{json .NetworkSettings.Networks}}
' 

Write-Host "`nGateway Container Details:" -ForegroundColor Yellow
docker inspect routeops-backend --format='
Container ID: {{.ID | truncate 12}}
Image: {{.Config.Image}}
Environment Variables (showing ROUTEOPS_ROUTING_URL):
' 
docker inspect routeops-backend --format='{{json .Config.Env}}' | ConvertFrom-Json | Where-Object {$_ -like '*ROUTEOPS*' -or $_ -like '*ROUTING*'}

Write-Host "`n" 

# Check if routing_engine is actually listening on 18080
Write-Host "[CHECK 2] Process Listening Verification" -ForegroundColor Green
Write-Host "Checking if routing_engine process is listening on port 18080..." -ForegroundColor Yellow
docker exec routing-engine sh -c "netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo 'netstat/ss not available'"
Write-Host ""

# Check routing_engine startup logs
Write-Host "[CHECK 3] Routing Engine Startup Logs (Full History)" -ForegroundColor Green
Write-Host "Checking for startup messages and errors..." -ForegroundColor Yellow
docker logs routing-engine 2>&1

Write-Host "`n[CHECK 4] Gateway Error Logs (search for connectivity issues)" -ForegroundColor Green
Write-Host "Looking for routing_engine connection errors..." -ForegroundColor Yellow
docker logs routeops-backend 2>&1 | Select-String -Pattern "routing|timeout|refused|unreachable|unavailable|Failed|error" -Context 1

Write-Host "`n================================================" -ForegroundColor Yellow
Write-Host "ANALYSIS COMPLETE" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
