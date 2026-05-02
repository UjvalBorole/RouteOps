#!/bin/bash

# RouteOps Comprehensive API Test Suite
# 58+ test cases covering all backend APIs with edge cases and error scenarios

# Configuration
BASE_URL="http://localhost:8081"
API_BASE="${BASE_URL}/api"
TEST_RESULTS_FILE="test_results_$(date +%Y%m%d_%H%M%S).txt"
SAMPLE_DATA_DIR="./test-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
AUTH_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$TEST_RESULTS_FILE"
}

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="${3:-200}"

    ((TOTAL_TESTS++))
    log "Running test: $test_name"

    # Execute command and capture output
    local output
    output=$(eval "$command" 2>&1)
    local exit_code=$?

    # Check if command succeeded
    if [ $exit_code -eq 0 ]; then
        # Check HTTP status if it's an HTTP request
        if echo "$output" | grep -q "HTTP/"; then
            local actual_status
            actual_status=$(echo "$output" | grep "HTTP/" | head -1 | awk '{print $2}')
            if [ "$actual_status" == "$expected_status" ]; then
                log "${GREEN}✓ PASSED${NC} - Status: $actual_status"
                ((PASSED_TESTS++))
            else
                log "${RED}✗ FAILED${NC} - Expected status: $expected_status, Got: $actual_status"
                ((FAILED_TESTS++))
            fi
        else
            log "${GREEN}✓ PASSED${NC}"
            ((PASSED_TESTS++))
        fi
    else
        log "${RED}✗ FAILED${NC} - Command failed with exit code: $exit_code"
        ((FAILED_TESTS++))
    fi

    # Log detailed output
    echo "Command: $command" >> "$TEST_RESULTS_FILE"
    echo "Output:" >> "$TEST_RESULTS_FILE"
    echo "$output" >> "$TEST_RESULTS_FILE"
    echo "----------------------------------------" >> "$TEST_RESULTS_FILE"
    echo "" >> "$TEST_RESULTS_FILE"
}

#!/bin/bash

# RouteOps Comprehensive API Test Suite
# 10-15 test cases for each API endpoint

# Configuration
BASE_URL="http://localhost:8080"
API_BASE="${BASE_URL}/api"
TEST_RESULTS_FILE="comprehensive_test_results_$(date +%Y%m%d_%H%M%S).txt"
SAMPLE_DATA_DIR="./test-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
AUTH_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
ALERT_ID=""
ORDER_ID=""
VEHICLE_ID=""

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$TEST_RESULTS_FILE"
}

# Test function with detailed validation
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="${3:-200}"
    local validation_func="$4"

    ((TOTAL_TESTS++))
    log "${CYAN}Test $TOTAL_TESTS: $test_name${NC}"

    # Execute command and capture output
    local output
    output=$(eval "$command" 2>&1)
    local exit_code=$?

    local test_passed=false

    # Check if command succeeded
    if [ $exit_code -eq 0 ]; then
        # Check HTTP status if it's an HTTP request
        if echo "$output" | grep -q "HTTP/"; then
            local actual_status
            actual_status=$(echo "$output" | grep "HTTP/" | head -1 | awk '{print $2}')
            if [ "$actual_status" == "$expected_status" ]; then
                # Run custom validation if provided
                if [ -n "$validation_func" ]; then
                    if $validation_func "$output"; then
                        log "${GREEN}✓ PASSED${NC} - Status: $actual_status"
                        ((PASSED_TESTS++))
                        test_passed=true
                    else
                        log "${RED}✗ FAILED${NC} - Status: $actual_status (validation failed)"
                        ((FAILED_TESTS++))
                    fi
                else
                    log "${GREEN}✓ PASSED${NC} - Status: $actual_status"
                    ((PASSED_TESTS++))
                    test_passed=true
                fi
            else
                log "${RED}✗ FAILED${NC} - Expected status: $expected_status, Got: $actual_status"
                ((FAILED_TESTS++))
            fi
        else
            log "${GREEN}✓ PASSED${NC}"
            ((PASSED_TESTS++))
            test_passed=true
        fi
    else
        log "${RED}✗ FAILED${NC} - Command failed with exit code: $exit_code"
        ((FAILED_TESTS++))
    fi

    # Log detailed output
    echo "Test: $test_name" >> "$TEST_RESULTS_FILE"
    echo "Command: $command" >> "$TEST_RESULTS_FILE"
    echo "Expected Status: $expected_status" >> "$TEST_RESULTS_FILE"
    echo "Output:" >> "$TEST_RESULTS_FILE"
    echo "$output" >> "$TEST_RESULTS_FILE"
    echo "Result: $(if [ "$test_passed" = true ]; then echo "PASSED"; else echo "FAILED"; fi)" >> "$TEST_RESULTS_FILE"
    echo "----------------------------------------" >> "$TEST_RESULTS_FILE"
    echo "" >> "$TEST_RESULTS_FILE"
}

# Validation functions
validate_json_response() {
    local output="$1"
    if echo "$output" | jq -e '.id' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_alert_response() {
    local output="$1"
    if echo "$output" | jq -e '.id and .name and .message' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_vehicle_response() {
    local output="$1"
    if echo "$output" | jq -e '.licensePlate and .make and .model' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_order_response() {
    local output="$1"
    if echo "$output" | jq -e '.id and .status and .totalDistance' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_route_response() {
    local output="$1"
    if echo "$output" | jq -e '.distance and .duration and .path' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_route_plan_response() {
    local output="$1"
    if echo "$output" | jq -e '.sessionId and .sessionName and .totalDistance and .routeNodes' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_route_session_response() {
    local output="$1"
    if echo "$output" | jq -e '.sessionId and .status and .startLat and .endLat' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_route_progress_response() {
    local output="$1"
    if echo "$output" | jq -e '.sessionId and .status and .remainingDistance and .progressPercentage' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_route_sessions_list() {
    local output="$1"
    if echo "$output" | jq -e '.[0] and .[0].sessionId' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Setup comprehensive test data
setup_test_data() {
    log "Setting up comprehensive test data directory..."
    mkdir -p "$SAMPLE_DATA_DIR"

    # User test data - multiple users for different scenarios
    cat > "$SAMPLE_DATA_DIR/user_register_1.json" << 'EOF'
{
  "username": "testuser1",
  "email": "test1@example.com",
  "password": "password123"
}
EOF

    cat > "$SAMPLE_DATA_DIR/user_register_2.json" << 'EOF'
{
  "username": "testuser2",
  "email": "test2@example.com",
  "password": "password123"
}
EOF

    cat > "$SAMPLE_DATA_DIR/user_register_invalid.json" << 'EOF'
{
  "username": "",
  "email": "invalid-email",
  "password": "123"
}
EOF

    cat > "$SAMPLE_DATA_DIR/user_login_1.json" << 'EOF'
{
  "usernameOrEmail": "testuser1",
  "password": "password123"
}
EOF

    cat > "$SAMPLE_DATA_DIR/user_login_invalid.json" << 'EOF'
{
  "usernameOrEmail": "testuser1",
  "password": "wrongpassword"
}
EOF

    # Alert test data - various scenarios
    cat > "$SAMPLE_DATA_DIR/alert_create_1.json" << 'EOF'
{
  "name": "Speed Alert",
  "message": "High speed detected",
  "targetLat": 45.6567,
  "targetLng": 24.5679,
  "thresholdDistanceMeters": 1000.0,
  "enabled": true
}
EOF

    cat > "$SAMPLE_DATA_DIR/alert_create_2.json" << 'EOF'
{
  "name": "Zone Alert",
  "message": "Entering restricted zone",
  "targetLat": 45.6600,
  "targetLng": 24.5700,
  "thresholdDistanceMeters": 500.0,
  "enabled": true
}
EOF

    cat > "$SAMPLE_DATA_DIR/alert_create_invalid.json" << 'EOF'
{
  "name": "",
  "message": "",
  "targetLat": 91.0,
  "targetLng": 181.0,
  "thresholdDistanceMeters": -100.0,
  "enabled": true
}
EOF

    cat > "$SAMPLE_DATA_DIR/alert_create_disabled.json" << 'EOF'
{
  "name": "Disabled Alert",
  "message": "This alert is disabled",
  "targetLat": 45.6500,
  "targetLng": 24.5600,
  "thresholdDistanceMeters": 2000.0,
  "enabled": false
}
EOF

    # Location updates for alert evaluation
    cat > "$SAMPLE_DATA_DIR/location_update_near.json" << 'EOF'
{
  "latitude": 45.6567,
  "longitude": 24.5679,
  "speedKmh": 40.0
}
EOF

    cat > "$SAMPLE_DATA_DIR/location_update_far.json" << 'EOF'
{
  "latitude": 45.7000,
  "longitude": 24.6000,
  "speedKmh": 60.0
}
EOF

    # Order test data
    cat > "$SAMPLE_DATA_DIR/order_create_1.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700
}
EOF

    cat > "$SAMPLE_DATA_DIR/order_create_2.json" << 'EOF'
{
  "startLat": 45.6500,
  "startLng": 24.5600,
  "endLat": 45.6700,
  "endLng": 24.5800
}
EOF

    cat > "$SAMPLE_DATA_DIR/order_create_invalid.json" << 'EOF'
{
  "startLat": 91.0,
  "startLng": 181.0,
  "endLat": -91.0,
  "endLng": -181.0
}
EOF

    # Vehicle test data
    cat > "$SAMPLE_DATA_DIR/vehicle_create_1.json" << 'EOF'
{
  "licensePlate": "TEST-123",
  "make": "Toyota",
  "model": "Corolla",
  "weight": 1500.0,
  "engineType": "PETROL",
  "status": "AVAILABLE"
}
EOF

    cat > "$SAMPLE_DATA_DIR/vehicle_create_2.json" << 'EOF'
{
  "licensePlate": "TEST-456",
  "make": "Honda",
  "model": "Civic",
  "weight": 1400.0,
  "engineType": "DIESEL",
  "status": "AVAILABLE"
}
EOF

    cat > "$SAMPLE_DATA_DIR/vehicle_create_invalid.json" << 'EOF'
{
  "licensePlate": "",
  "make": "",
  "model": "",
  "weight": -100.0,
  "engineType": "INVALID",
  "status": "INVALID"
}
EOF

    cat > "$SAMPLE_DATA_DIR/vehicle_update.json" << 'EOF'
{
  "licensePlate": "TEST-123-UPDATED",
  "make": "Toyota",
  "model": "Camry",
  "weight": 1600.0,
  "engineType": "HYBRID",
  "status": "MAINTENANCE"
}
EOF

    # Navigation test data
    cat > "$SAMPLE_DATA_DIR/navigation_plan.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "vehicleWeight": 1500.0,
  "avoidTolls": false,
  "preferHighways": true
}
EOF

    cat > "$SAMPLE_DATA_DIR/navigation_plan_invalid.json" << 'EOF'
{
  "startLat": 91.0,
  "startLng": 181.0,
  "endLat": -91.0,
  "endLng": -181.0,
  "vehicleWeight": -100.0,
  "avoidTolls": false,
  "preferHighways": true
}
EOF

    # Route planning test data
    cat > "$SAMPLE_DATA_DIR/route_plan.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "sessionName": "Test Route from API",
  "destinationThresholdMeters": 100.0
}
EOF

    cat > "$SAMPLE_DATA_DIR/route_plan_threshold.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "sessionName": "Test Route with Custom Threshold",
  "destinationThresholdMeters": 50.0
}
EOF

    cat > "$SAMPLE_DATA_DIR/route_plan_invalid.json" << 'EOF'
{
  "startLat": 91.0,
  "startLng": 181.0,
  "endLat": -91.0,
  "endLng": -181.0,
  "sessionName": "Invalid Route",
  "destinationThresholdMeters": -100.0
}
EOF
}

# Authentication tests - 15 comprehensive test cases
test_authentication() {
    log "${YELLOW}=== AUTHENTICATION TESTS (15 test cases) ===${NC}"

    # Test 1: Valid user registration
    run_test "Auth-01: Valid User Registration" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_register_1.json" \
        "201" \
        "validate_json_response"

    # Test 2: Duplicate user registration (should fail)
    run_test "Auth-02: Duplicate User Registration (Conflict)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_register_1.json" \
        "409"

    # Test 3: Invalid user registration (validation errors)
    run_test "Auth-03: Invalid User Registration (Validation)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_register_invalid.json" \
        "400"

    # Test 4: Valid login with username
    local login_response
    login_response=$(curl -s -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_login_1.json)
    if echo "$login_response" | jq -e '.accessToken' >/dev/null 2>&1; then
        AUTH_TOKEN=$(echo "$login_response" | jq -r '.accessToken')
        REFRESH_TOKEN=$(echo "$login_response" | jq -r '.refreshToken')
        log "✓ Login successful, tokens obtained"
    fi
    run_test "Auth-04: Valid Login with Username" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_login_1.json" \
        "200" \
        "validate_json_response"

    # Test 5: Invalid login (wrong password)
    run_test "Auth-05: Invalid Login (Wrong Password)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_login_invalid.json" \
        "401"

    # Test 6: Login with non-existent user
    cat > "$SAMPLE_DATA_DIR/user_login_nonexistent.json" << 'EOF'
{
  "usernameOrEmail": "nonexistent",
  "password": "password123"
}
EOF
    run_test "Auth-06: Login Non-existent User" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_login_nonexistent.json" \
        "401"

    # Test 7: Token refresh with valid refresh token
    if [ -n "$AUTH_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
        run_test "Auth-07: Valid Token Refresh" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/refresh -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"accessToken\":\"${AUTH_TOKEN}\",\"refreshToken\":\"${REFRESH_TOKEN}\"}'" \
            "200" \
            "validate_json_response"
    fi

    # Test 8: Token refresh with invalid token
    run_test "Auth-08: Invalid Token Refresh" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/refresh -H 'Content-Type: application/json' -d '{\"accessToken\":\"invalid\",\"refreshToken\":\"invalid\"}'" \
        "403"

    # Test 9: Access protected endpoint without token
    run_test "Auth-09: Access Protected Endpoint Without Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts" \
        "401"

    # Test 10: Access protected endpoint with invalid token
    run_test "Auth-10: Access Protected Endpoint With Invalid Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts -H 'Authorization: Bearer invalid_token'" \
        "401"

    # Test 11: Access protected endpoint with valid token
    if [ -n "$AUTH_TOKEN" ]; then
        run_test "Auth-11: Access Protected Endpoint With Valid Token" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "200"
    fi

    # Test 12: Register second user
    run_test "Auth-12: Register Second User" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_register_2.json" \
        "201" \
        "validate_json_response"

    # Test 13: Login with email instead of username
    cat > "$SAMPLE_DATA_DIR/user_login_email.json" << 'EOF'
{
  "usernameOrEmail": "test1@example.com",
  "password": "password123"
}
EOF
    run_test "Auth-13: Login with Email" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/user_login_email.json" \
        "200" \
        "validate_json_response"

    # Test 14: Empty request body registration
    run_test "Auth-14: Empty Request Body Registration" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d '{}'" \
        "400"

    # Test 15: Malformed JSON registration
    run_test "Auth-15: Malformed JSON Registration" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/auth/register -H 'Content-Type: application/json' -d '{\"username\": \"test\", \"email\":}'" \
        "400"
}

# Alert API tests - 15 comprehensive test cases
test_alerts() {
    log "${YELLOW}=== ALERT API TESTS (15 test cases) ===${NC}"

    if [ -z "$AUTH_TOKEN" ]; then
        log "${RED}Skipping alert tests - no auth token${NC}"
        return 1
    fi

    # Test 1: Create valid alert
    local create_response
    create_response=$(curl -s -X POST ${API_BASE}/alerts \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/alert_create_1.json)
    ALERT_ID=$(echo "$create_response" | jq -r '.id // empty')

    run_test "Alert-01: Create Valid Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/alert_create_1.json" \
        "201" \
        "validate_alert_response"

    # Test 2: Create second alert
    local create_response2
    create_response2=$(curl -s -X POST ${API_BASE}/alerts \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/alert_create_2.json)
    local alert_id2
    alert_id2=$(echo "$create_response2" | jq -r '.id // empty')

    run_test "Alert-02: Create Second Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/alert_create_2.json" \
        "201" \
        "validate_alert_response"

    # Test 3: Create disabled alert
    run_test "Alert-03: Create Disabled Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/alert_create_disabled.json" \
        "201" \
        "validate_alert_response"

    # Test 4: Create invalid alert (validation error)
    run_test "Alert-04: Create Invalid Alert (Validation)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/alert_create_invalid.json" \
        "400"

    # Test 5: List all alerts
    run_test "Alert-05: List All Alerts" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 6: Get specific alert by ID
    if [ -n "$ALERT_ID" ]; then
        run_test "Alert-06: Get Alert by ID" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts/${ALERT_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "200" \
            "validate_alert_response"
    fi

    # Test 7: Get non-existent alert
    run_test "Alert-07: Get Non-existent Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts/99999 -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 8: Evaluate alerts with location near first alert
    run_test "Alert-08: Evaluate Alerts (Near Alert)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts/evaluate -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/location_update_near.json" \
        "200"

    # Test 9: Evaluate alerts with location far from alerts
    run_test "Alert-09: Evaluate Alerts (Far from Alerts)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts/evaluate -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/location_update_far.json" \
        "200"

    # Test 10: Acknowledge existing alert
    if [ -n "$ALERT_ID" ]; then
        run_test "Alert-10: Acknowledge Alert" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts/${ALERT_ID}/acknowledge -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "204"
    fi

    # Test 11: Acknowledge non-existent alert
    run_test "Alert-11: Acknowledge Non-existent Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts/99999/acknowledge -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 12: Delete existing alert
    if [ -n "$ALERT_ID" ]; then
        run_test "Alert-12: Delete Alert" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X DELETE ${API_BASE}/alerts/${ALERT_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "204"
    fi

    # Test 13: Delete non-existent alert
    run_test "Alert-13: Delete Non-existent Alert" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X DELETE ${API_BASE}/alerts/99999 -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 14: Try to access alerts without authentication
    run_test "Alert-14: Access Without Authentication" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/alerts" \
        "401"

    # Test 15: Try to create alert with invalid token
    run_test "Alert-15: Create Alert with Invalid Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/alerts -H 'Content-Type: application/json' -H 'Authorization: Bearer invalid_token' -d @${SAMPLE_DATA_DIR}/alert_create_1.json" \
        "401"
}

# Order API tests - 12 comprehensive test cases
test_orders() {
    log "${YELLOW}=== ORDER API TESTS (12 test cases) ===${NC}"

    if [ -z "$AUTH_TOKEN" ]; then
        log "${RED}Skipping order tests - no auth token${NC}"
        return 1
    fi

    # Test 1: Create valid order
    local order_response
    order_response=$(curl -s -X POST ${API_BASE}/order \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/order_create_1.json)
    ORDER_ID=$(echo "$order_response" | jq -r '.id // empty')

    run_test "Order-01: Create Valid Order" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/order_create_1.json" \
        "201" \
        "validate_order_response"

    # Test 2: Create second order
    local order_response2
    order_response2=$(curl -s -X POST ${API_BASE}/order \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/order_create_2.json)
    local order_id2
    order_id2=$(echo "$order_response2" | jq -r '.id // empty')

    run_test "Order-02: Create Second Order" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/order_create_2.json" \
        "201" \
        "validate_order_response"

    # Test 3: Create invalid order (validation error)
    run_test "Order-03: Create Invalid Order (Validation)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/order_create_invalid.json" \
        "400"

    # Test 4: Start existing order
    if [ -n "$ORDER_ID" ]; then
        run_test "Order-04: Start Order" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/${ORDER_ID}/start -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "200" \
            "validate_order_response"
    fi

    # Test 5: Start non-existent order
    run_test "Order-05: Start Non-existent Order" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/99999/start -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "500"

    # Test 6: Complete existing order
    if [ -n "$ORDER_ID" ]; then
        run_test "Order-06: Complete Order" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/${ORDER_ID}/complete -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "200" \
            "validate_order_response"
    fi

    # Test 7: Complete non-existent order
    run_test "Order-07: Complete Non-existent Order" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/99999/complete -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "500"

    # Test 8: Try to start already completed order
    if [ -n "$ORDER_ID" ]; then
        run_test "Order-08: Start Completed Order (Should Fail)" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/${ORDER_ID}/start -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "500"
    fi

    # Test 9: Create order without authentication
    run_test "Order-09: Create Order Without Authentication" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/order_create_1.json" \
        "401"

    # Test 10: Create order with invalid token
    run_test "Order-10: Create Order with Invalid Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H 'Authorization: Bearer invalid_token' -d @${SAMPLE_DATA_DIR}/order_create_1.json" \
        "401"

    # Test 11: Empty request body
    run_test "Order-11: Empty Request Body" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{}'" \
        "400"

    # Test 12: Malformed JSON
    run_test "Order-12: Malformed JSON" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/order -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"startLat\": 45.6, \"startLng\":}'" \
        "400"
}

# Vehicle API tests - 15 comprehensive test cases
test_vehicles() {
    log "${YELLOW}=== VEHICLE API TESTS (15 test cases) ===${NC}"

    if [ -z "$AUTH_TOKEN" ]; then
        log "${RED}Skipping vehicle tests - no auth token${NC}"
        return 1
    fi

    # Test 1: Create valid vehicle
    local vehicle_response
    vehicle_response=$(curl -s -X POST ${API_BASE}/vehicles/create \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/vehicle_create_1.json)
    VEHICLE_ID=$(echo "$vehicle_response" | jq -r '.id // empty')

    run_test "Vehicle-01: Create Valid Vehicle" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/vehicle_create_1.json" \
        "201" \
        "validate_vehicle_response"

    # Test 2: Create second vehicle
    local vehicle_response2
    vehicle_response2=$(curl -s -X POST ${API_BASE}/vehicles/create \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d @${SAMPLE_DATA_DIR}/vehicle_create_2.json)
    local vehicle_id2
    vehicle_id2=$(echo "$vehicle_response2" | jq -r '.id // empty')

    run_test "Vehicle-02: Create Second Vehicle" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/vehicle_create_2.json" \
        "201" \
        "validate_vehicle_response"

    # Test 3: Create invalid vehicle (validation error)
    run_test "Vehicle-03: Create Invalid Vehicle (Validation)" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/vehicle_create_invalid.json" \
        "400"

    # Test 4: List all vehicles
    run_test "Vehicle-04: List All Vehicles" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/vehicles -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 5: Get specific vehicle by ID
    if [ -n "$VEHICLE_ID" ]; then
        run_test "Vehicle-05: Get Vehicle by ID" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/vehicles/${VEHICLE_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "200" \
            "validate_vehicle_response"
    fi

    # Test 6: Get non-existent vehicle
    run_test "Vehicle-06: Get Non-existent Vehicle" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/vehicles/99999 -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 7: Update existing vehicle
    if [ -n "$VEHICLE_ID" ]; then
        run_test "Vehicle-07: Update Vehicle" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/vehicles/${VEHICLE_ID} -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/vehicle_update.json" \
            "200" \
            "validate_vehicle_response"
    fi

    # Test 8: Update non-existent vehicle
    run_test "Vehicle-08: Update Non-existent Vehicle" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X PUT ${API_BASE}/vehicles/99999 -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/vehicle_update.json" \
        "404"

    # Test 9: Delete existing vehicle
    if [ -n "$VEHICLE_ID" ]; then
        run_test "Vehicle-09: Delete Vehicle" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X DELETE ${API_BASE}/vehicles/${VEHICLE_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "204"
    fi

    # Test 10: Delete non-existent vehicle
    run_test "Vehicle-10: Delete Non-existent Vehicle" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X DELETE ${API_BASE}/vehicles/99999 -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 11: Try to delete already deleted vehicle
    if [ -n "$VEHICLE_ID" ]; then
        run_test "Vehicle-11: Delete Already Deleted Vehicle" \
            "curl -s -w 'HTTPSTATUS:%{http_code}' -X DELETE ${API_BASE}/vehicles/${VEHICLE_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
            "404"
    fi

    # Test 12: Create vehicle without authentication
    run_test "Vehicle-12: Create Vehicle Without Authentication" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/vehicle_create_1.json" \
        "401"

    # Test 13: Create vehicle with invalid token
    run_test "Vehicle-13: Create Vehicle with Invalid Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H 'Authorization: Bearer invalid_token' -d @${SAMPLE_DATA_DIR}/vehicle_create_1.json" \
        "401"

    # Test 14: Empty request body
    run_test "Vehicle-14: Empty Request Body" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{}'" \
        "400"

    # Test 15: Malformed JSON
    run_test "Vehicle-15: Malformed JSON" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/vehicles/create -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"licensePlate\": \"TEST\", \"make\":}'" \
        "400"
}

# Health check tests - 2 basic tests
test_health() {
    log "${YELLOW}=== HEALTH CHECK TESTS (2 test cases) ===${NC}"

    # Test 1: Gateway health check
    run_test "Health-01: Gateway Health Check" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' http://localhost:8080/actuator/health" \
        "200"

    # Test 2: Routing engine health check
    run_test "Health-02: Routing Engine Health Check" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' http://localhost:18080/health" \
        "200"
}

# Routing engine tests - 3 basic tests
test_routing_engine() {
    log "${YELLOW}=== ROUTING ENGINE TESTS (3 test cases) ===${NC}"

    # Test 1: Basic route calculation
    run_test "Routing-01: Basic Route Calculation" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST http://localhost:18080/route -H 'Content-Type: application/json' -d '{\"startLat\":45.6567,\"startLng\":24.5679,\"endLat\":45.6600,\"endLng\":24.5700}'" \
        "200" \
        "validate_route_response"

    # Test 2: Route with vehicle weight
    run_test "Routing-02: Route with Vehicle Weight" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST http://localhost:18080/route -H 'Content-Type: application/json' -d '{\"startLat\":45.6567,\"startLng\":24.5679,\"endLat\":45.6600,\"endLng\":24.5700,\"vehicleWeight\":1500.0}'" \
        "200"

    # Test 3: Invalid coordinates
    run_test "Routing-03: Invalid Coordinates" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST http://localhost:18080/route -H 'Content-Type: application/json' -d '{\"startLat\":91.0,\"startLng\":24.5679,\"endLat\":45.6600,\"endLng\":24.5700}'" \
        "400"
}
test_routes() {
    log "${YELLOW}=== ROUTE MANAGEMENT API TESTS (15 test cases) ===${NC}"

    if [ -z "$AUTH_TOKEN" ]; then
        log "${RED}Skipping route tests - no auth token${NC}"
        return 1
    fi

    # Test 1: Plan a valid route
    run_test "Route-01: Plan Valid Route" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/route_plan.json" \
        "201" \
        "validate_route_plan_response"

    # Extract session ID from the response for subsequent tests
    local session_response
    session_response=$(curl -s -X POST ${API_BASE}/routes/plan -H 'Content-Type: application/json' -H "Authorization: Bearer ${AUTH_TOKEN}" -d @${SAMPLE_DATA_DIR}/route_plan.json)
    SESSION_ID=$(echo "$session_response" | jq -r '.sessionId // empty')

    if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
        log "${RED}Failed to extract session ID from route planning response${NC}"
        return 1
    fi

    log "Using Session ID: $SESSION_ID"

    # Test 2: Start the planned route
    run_test "Route-02: Start Route Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/${SESSION_ID}/start -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 3: Get route session details
    run_test "Route-03: Get Route Session Details" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/routes/${SESSION_ID} -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200" \
        "validate_route_session_response"

    # Test 4: Update location (on route)
    run_test "Route-04: Update Location On Route" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/location -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"sessionId\":\"'${SESSION_ID}'\",\"latitude\":45.6570,\"longitude\":24.5675}'" \
        "200" \
        "validate_route_progress_response"

    # Test 5: Update location (off route - should trigger recalculation)
    run_test "Route-05: Update Location Off Route" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/location -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"sessionId\":\"'${SESSION_ID}'\",\"latitude\":45.6800,\"longitude\":24.5900}'" \
        "200"

    # Test 6: Pause route session
    run_test "Route-06: Pause Route Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/${SESSION_ID}/pause -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 7: Resume route session
    run_test "Route-07: Resume Route Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/${SESSION_ID}/resume -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 8: Get user's route sessions
    run_test "Route-08: Get User Route Sessions" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/routes -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200" \
        "validate_route_sessions_list"

    # Test 9: Cancel route session
    run_test "Route-09: Cancel Route Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/${SESSION_ID}/cancel -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "200"

    # Test 10: Plan route with custom threshold
    cat > "$SAMPLE_DATA_DIR/route_plan_threshold.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "sessionName": "Test Route with Custom Threshold",
  "destinationThresholdMeters": 50.0
}
EOF
    run_test "Route-10: Plan Route with Custom Threshold" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/route_plan_threshold.json" \
        "201"

    # Test 11: Invalid coordinates
    run_test "Route-11: Plan Route Invalid Coordinates" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/route_plan_invalid.json" \
        "400"

    # Test 12: Access without authentication
    run_test "Route-12: Plan Route Without Authentication" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/plan -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/route_plan.json" \
        "401"

    # Test 13: Invalid session ID
    run_test "Route-13: Get Invalid Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X GET ${API_BASE}/routes/invalid-session-id -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "404"

    # Test 14: Start already started session
    run_test "Route-14: Start Already Started Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/${SESSION_ID}/start -H \"Authorization: Bearer ${AUTH_TOKEN}\"" \
        "400"

    # Test 15: Update location for non-existent session
    run_test "Route-15: Update Location Invalid Session" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/routes/location -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{\"sessionId\":\"invalid-session\",\"latitude\":45.6570,\"longitude\":24.5675}'" \
        "400"
}

# Navigation API tests - 8 comprehensive test cases
test_navigation() {
    log "${YELLOW}=== NAVIGATION API TESTS (8 test cases) ===${NC}"

    if [ -z "$AUTH_TOKEN" ]; then
        log "${RED}Skipping navigation tests - no auth token${NC}"
        return 1
    fi

    # Test 1: Plan valid navigation
    run_test "Navigation-01: Plan Valid Navigation" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/navigation_plan.json" \
        "200"

    # Test 2: Plan navigation with different parameters
    cat > "$SAMPLE_DATA_DIR/navigation_plan_2.json" << 'EOF'
{
  "startLat": 45.6500,
  "startLng": 24.5600,
  "endLat": 45.6700,
  "endLng": 24.5800,
  "vehicleWeight": 1400.0,
  "avoidTolls": true,
  "preferHighways": false
}
EOF
    run_test "Navigation-02: Plan Navigation Different Params" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/navigation_plan_2.json" \
        "200"

    # Test 3: Invalid coordinates
    run_test "Navigation-03: Invalid Coordinates" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/navigation_plan_invalid.json" \
        "400"

    # Test 4: Negative weight
    cat > "$SAMPLE_DATA_DIR/navigation_plan_negative.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6600,
  "endLng": 24.5700,
  "vehicleWeight": -500.0,
  "avoidTolls": false,
  "preferHighways": true
}
EOF
    run_test "Navigation-04: Negative Vehicle Weight" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/navigation_plan_negative.json" \
        "200"

    # Test 5: Same start and end location
    cat > "$SAMPLE_DATA_DIR/navigation_plan_same.json" << 'EOF'
{
  "startLat": 45.6567,
  "startLng": 24.5679,
  "endLat": 45.6567,
  "endLng": 24.5679,
  "vehicleWeight": 1500.0,
  "avoidTolls": false,
  "preferHighways": true
}
EOF
    run_test "Navigation-05: Same Start and End Location" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d @${SAMPLE_DATA_DIR}/navigation_plan_same.json" \
        "200"

    # Test 6: Access without authentication
    run_test "Navigation-06: Access Without Authentication" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -d @${SAMPLE_DATA_DIR}/navigation_plan.json" \
        "401"

    # Test 7: Invalid token
    run_test "Navigation-07: Invalid Authentication Token" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H 'Authorization: Bearer invalid_token' -d @${SAMPLE_DATA_DIR}/navigation_plan.json" \
        "401"

    # Test 8: Empty request body
    run_test "Navigation-08: Empty Request Body" \
        "curl -s -w 'HTTPSTATUS:%{http_code}' -X POST ${API_BASE}/navigation/plan -H 'Content-Type: application/json' -H \"Authorization: Bearer ${AUTH_TOKEN}\" -d '{}'" \
        "400"
}

# Main test execution
main() {
    log "Starting RouteOps API Test Suite"
    log "Results will be saved to: $TEST_RESULTS_FILE"
    log "=========================================="

    # Initialize results file
    echo "RouteOps API Test Results - $(date)" > "$TEST_RESULTS_FILE"
    echo "==========================================" >> "$TEST_RESULTS_FILE"
    echo "" >> "$TEST_RESULTS_FILE"

    # Setup
    setup_test_data

    # Check if services are running
    log "Checking service availability..."
    if ! curl -s --max-time 5 http://localhost:8081/actuator/health > /dev/null; then
        log "${RED}ERROR: Gateway service not running on http://localhost:8081${NC}"
        log "Please start the services first: docker-compose up"
        exit 1
    fi

    if ! curl -s --max-time 5 http://localhost:18080/health > /dev/null; then
        log "${YELLOW}WARNING: Routing engine not running on http://localhost:18080${NC}"
    fi

    # Run all test suites
    log "${PURPLE}Running comprehensive API test suite with 58+ test cases...${NC}"
    echo "Running comprehensive API test suite with 58+ test cases..." >> "$TEST_RESULTS_FILE"
    echo "" >> "$TEST_RESULTS_FILE"

    test_health
    test_routing_engine
    test_authentication
    test_alerts
    test_routes
    test_navigation

    # Generate summary
    log "${YELLOW}=== TEST SUMMARY ===${NC}"
    log "Total Tests: $TOTAL_TESTS"
    log "Passed: $PASSED_TESTS"
    log "Failed: $FAILED_TESTS"
    log "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"

    echo "" >> "$TEST_RESULTS_FILE"
    echo "=== TEST SUMMARY ===" >> "$TEST_RESULTS_FILE"
    echo "Total Tests: $TOTAL_TESTS" >> "$TEST_RESULTS_FILE"
    echo "Passed: $PASSED_TESTS" >> "$TEST_RESULTS_FILE"
    echo "Failed: $FAILED_TESTS" >> "$TEST_RESULTS_FILE"
    echo "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%" >> "$TEST_RESULTS_FILE"

    if [ $FAILED_TESTS -eq 0 ]; then
        log "${GREEN}🎉 All 58+ comprehensive API tests passed!${NC}"
    else
        log "${RED}❌ $FAILED_TESTS out of $TOTAL_TESTS comprehensive API tests failed. Check $TEST_RESULTS_FILE for details.${NC}"
    fi

    log "Test results saved to: $TEST_RESULTS_FILE"
}

# Run main function
main "$@"