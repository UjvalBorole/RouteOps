# Routing Backend Test Cases

This file covers only the backend routing-related APIs.

## Base URLs

- Gateway API (local Spring Boot default): `http://localhost:8081`
- Gateway API (Docker intent in compose): `http://localhost:8080`
- C++ Routing Engine: `http://localhost:18080`

Use the URL that matches how you started the backend.

## Important Auth Note

- `GET /api/route` requires a JWT bearer token with `ROLE_USER`
- `POST /api/navigation/plan` is currently public
- Direct C++ engine route `GET /route` is public

## 1. Create a User for Testing

### Request

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "routeuser",
  "email": "routeuser@example.com",
  "password": "secret123"
}
```

### Expected Response

- Status: `201 Created`
- Body shape:

```json
{
  "id": "some-id",
  "username": "routeuser",
  "email": "routeuser@example.com",
  "roles": ["USER"],
  "createdAt": "2026-04-25T10:00:00Z",
  "enabled": true
}
```

### Negative Case

- Status: `409 Conflict`

```json
{
  "error": "Username or email already in use"
}
```

## 2. Login and Get JWT Token

### Request

```http
POST /api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "routeuser",
  "password": "secret123"
}
```

### Expected Response

- Status: `200 OK`

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "some-id",
    "username": "routeuser",
    "email": "routeuser@example.com",
    "roles": ["USER"],
    "createdAt": "2026-04-25T10:00:00Z",
    "enabled": true
  }
}
```

### Negative Case

- Status: `401 Unauthorized`
- Body is empty

## 3. Test Gateway Route API

Endpoint:

- `GET /api/route`

Query params:

- `startLat` required
- `startLng` required
- `endLat` required
- `endLng` required
- `weight` optional

### Request

```http
GET /api/route?startLat=45.6579&startLng=25.6012&endLat=45.6486&endLng=25.6061&weight=1200
Authorization: Bearer <accessToken>
```

### Expected Success Response

- Status: `200 OK`

```json
{
  "status": "success",
  "count": 12,
  "totalDistance": 1850.42,
  "path": [
    { "id": 101, "lat": 45.6579, "lon": 25.6012 },
    { "id": 102, "lat": 45.6571, "lon": 25.6020 }
  ]
}
```

Notes:

- `count`, `totalDistance`, and `path` depend on the loaded graph data
- If the C++ engine is unavailable, the Java service falls back to a straight-line route

### Expected Fallback Response

- Status: `200 OK`

```json
{
  "status": "fallback",
  "count": 2,
  "totalDistance": 1123.45,
  "path": [
    { "id": -1, "lat": 45.6579, "lon": 25.6012 },
    { "id": -2, "lat": 45.6486, "lon": 25.6061 }
  ]
}
```

### Negative Cases

- No token:
  - Status: `401 Unauthorized` or `403 Forbidden`
- Missing required query param:
  - Spring returns `400 Bad Request`
- Routing service exception inside controller:
  - Status: `503 Service Unavailable`

## 4. Test Direct C++ Routing Engine

Endpoint:

- `GET /route`

### Request

```http
GET /route?startLat=45.6579&startLng=25.6012&endLat=45.6486&endLng=25.6061&weight=1200
```

### Expected Success Response

- Status: `200 OK`

```json
{
  "status": "success",
  "totalDistance": 1850.42,
  "count": 12,
  "path": [
    { "id": 101, "lat": 45.6579, "lon": 25.6012 },
    { "id": 102, "lat": 45.6571, "lon": 25.6020 }
  ]
}
```

### Missing Params Case

- Status: `400 Bad Request`

```json
{
  "status": "error",
  "message": "Missing coordinates parameters (startLat, startLng, endLat, endLng)."
}
```

### No Route Found Case

- Status: `404 Not Found`

```json
{
  "status": "not_found"
}
```

## 5. Test Navigation Planning API

Endpoint:

- `POST /api/navigation/plan`

Request body fields:

- `user1Lat` required
- `user1Lng` required
- `user2Lat` required
- `user2Lng` required
- `thresholdDistanceMeters` optional
- `thresholdEtaMinutes` optional
- `speedKmh` optional

### Request

```http
POST /api/navigation/plan
Content-Type: application/json

{
  "user1Lat": 45.6579,
  "user1Lng": 25.6012,
  "user2Lat": 45.6486,
  "user2Lng": 25.6061,
  "thresholdDistanceMeters": 2000,
  "thresholdEtaMinutes": 5,
  "speedKmh": 40
}
```

### Expected Success Response

- Status: `200 OK`

```json
{
  "user1Lat": 45.6579,
  "user1Lng": 25.6012,
  "user2Lat": 45.6486,
  "user2Lng": 25.6061,
  "distanceMeters": 1850.42,
  "etaMinutes": 2.78,
  "withinDistance": true,
  "withinEta": true,
  "status": "Alarm triggered: both distance and ETA thresholds reached.",
  "message": "road route Distance: 1850.4 meters, ETA: 2.8 minutes. Alarm: ON"
}
```

### Threshold Disabled Case

If both threshold values are missing or invalid:

- Status: `200 OK`

```json
{
  "withinDistance": false,
  "withinEta": false,
  "status": "No threshold configured; alarm logic is disabled."
}
```

### Validation Error Case

If any required coordinate is missing:

- Status: `400 Bad Request`

Typical reason:

- `user1Lat`, `user1Lng`, `user2Lat`, and `user2Lng` are marked `@NotNull`

## 6. Quick Curl Commands

### Register

```bash
curl -X POST http://localhost:8081/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"routeuser\",\"email\":\"routeuser@example.com\",\"password\":\"secret123\"}"
```

### Login

```bash
curl -X POST http://localhost:8081/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"usernameOrEmail\":\"routeuser\",\"password\":\"secret123\"}"
```

### Gateway Route

```bash
curl "http://localhost:8081/api/route?startLat=45.6579&startLng=25.6012&endLat=45.6486&endLng=25.6061&weight=1200" ^
  -H "Authorization: Bearer <accessToken>"
```

### Direct Routing Engine

```bash
curl "http://localhost:18080/route?startLat=45.6579&startLng=25.6012&endLat=45.6486&endLng=25.6061&weight=1200"
```

### Navigation Plan

```bash
curl -X POST http://localhost:8081/api/navigation/plan ^
  -H "Content-Type: application/json" ^
  -d "{\"user1Lat\":45.6579,\"user1Lng\":25.6012,\"user2Lat\":45.6486,\"user2Lng\":25.6061,\"thresholdDistanceMeters\":2000,\"thresholdEtaMinutes\":5,\"speedKmh\":40}"
```

## 7. What to Verify in Responses

- `status` is `success` or `fallback` for route calls
- `path` is present and non-empty for successful route calls
- `count` matches the number of nodes in `path`
- `distanceMeters` and `etaMinutes` are positive in navigation response
- `withinDistance` and `withinEta` change correctly when thresholds change
- unauthorized access is blocked on `/api/route`
