#!/usr/bin/env python3
"""
Mock Routing Engine for Local Development
Simulates the C++ routing engine responses for development and testing
Runs on http://localhost:18080
Uses only Python standard library - no external dependencies
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import math
import urllib.parse
from datetime import datetime
import sys

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in meters"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def generate_waypoints(start_lat, start_lng, end_lat, end_lng, num_points=5):
    """Generate intermediate waypoints between start and end"""
    waypoints = [(start_lat, start_lng)]
    
    for i in range(1, num_points):
        t = i / num_points
        lat = start_lat + (end_lat - start_lat) * t
        lng = start_lng + (end_lng - start_lng) * t
        # Add small variations to simulate real road paths
        lat += (math.sin(i) * 0.0005)
        lng += (math.cos(i) * 0.0005)
        waypoints.append((lat, lng))
    
    waypoints.append((end_lat, end_lng))
    return waypoints

class RoutingEngineHandler(BaseHTTPRequestHandler):
    """HTTP request handler for routing engine"""
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            response = {
                "status": "UP",
                "service": "routing-engine-mock",
                "timestamp": datetime.now().isoformat()
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode()
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == '/route':
            self.handle_route_request(data)
        elif self.path == '/route/deviation':
            self.handle_deviation_request(data)
        else:
            self.send_error(404, "Not Found")
    
    def handle_route_request(self, data):
        """Calculate route between two points"""
        try:
            # Validate required fields
            if not all(k in data for k in ['startLat', 'startLng', 'endLat', 'endLng']):
                self.send_json_error(400, "Missing required fields: startLat, startLng, endLat, endLng")
                return
            
            start_lat = float(data['startLat'])
            start_lng = float(data['startLng'])
            end_lat = float(data['endLat'])
            end_lng = float(data['endLng'])
            vehicle_weight = float(data.get('vehicleWeight', 1500.0))
            
            # Validate coordinates
            if not (-90 <= start_lat <= 90 and -180 <= start_lng <= 180):
                self.send_json_error(400, "Invalid start coordinates")
                return
            if not (-90 <= end_lat <= 90 and -180 <= end_lng <= 180):
                self.send_json_error(400, "Invalid end coordinates")
                return
            
            # Check if start and end are the same
            if start_lat == end_lat and start_lng == end_lng:
                distance = 0
                duration = 0
                path = [[start_lat, start_lng]]
            else:
                # Generate waypoints (simulating road path)
                waypoints = generate_waypoints(start_lat, start_lng, end_lat, end_lng, num_points=8)
                
                # Calculate total distance
                distance = 0
                for i in range(len(waypoints) - 1):
                    d = haversine_distance(
                        waypoints[i][0], waypoints[i][1],
                        waypoints[i+1][0], waypoints[i+1][1]
                    )
                    distance += d
                
                # Adjust distance based on vehicle weight (heavier vehicles take longer routes)
                weight_factor = 1 + (vehicle_weight - 1000) / 5000
                distance *= weight_factor
                
                # Estimate duration (assume ~50 km/h average speed)
                duration = (distance / 1000) / 50 * 3600  # in seconds
                
                path = [[lat, lng] for lat, lng in waypoints]
            
            response = {
                "distance": round(distance, 2),
                "duration": round(duration, 2),
                "path": path,
                "nodes": len(path),
                "timestamp": datetime.now().isoformat()
            }
            self.send_json_response(200, response)
        
        except (ValueError, KeyError) as e:
            self.send_json_error(400, f"Invalid input: {str(e)}")
        except Exception as e:
            self.send_json_error(500, f"Server error: {str(e)}")
    
    def handle_deviation_request(self, data):
        """Check if current position deviates from planned route"""
        try:
            if 'currentLat' not in data or 'currentLng' not in data or 'path' not in data:
                self.send_json_error(400, "Missing required fields")
                return
            
            current_lat = float(data['currentLat'])
            current_lng = float(data['currentLng'])
            path = data['path']
            
            if not path:
                self.send_json_error(400, "Path cannot be empty")
                return
            
            # Find nearest point on path
            min_distance = float('inf')
            nearest_idx = 0
            
            for i, point in enumerate(path):
                d = haversine_distance(current_lat, current_lng, point[0], point[1])
                if d < min_distance:
                    min_distance = d
                    nearest_idx = i
            
            # Consider on-route if within 50 meters of path
            on_route = min_distance < 50
            
            response = {
                "onRoute": on_route,
                "nearestDistance": round(min_distance, 2),
                "nextNodeIndex": nearest_idx,
                "threshold": 50
            }
            self.send_json_response(200, response)
        
        except Exception as e:
            self.send_json_error(500, f"Server error: {str(e)}")
    
    def send_json_response(self, status, data):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_json_error(self, status, message):
        """Send JSON error response"""
        response = {"error": message}
        self.send_json_response(status, response)
    
    def log_message(self, format, *args):
        """Override logging to use our format"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")

if __name__ == '__main__':
    print("=" * 60)
    print("Mock Routing Engine Starting")
    print("=" * 60)
    print("Service: RouteOps Routing Engine (Mock)")
    print("Address: http://localhost:18080")
    print("Status: Ready")
    print("")
    print("Endpoints:")
    print("  GET  /health                    - Health check")
    print("  POST /route                     - Calculate route")
    print("  POST /route/deviation           - Check deviation")
    print("")
    print("Mode: Development/Testing")
    print("=" * 60)
    
    server = HTTPServer(('localhost', 18080), RoutingEngineHandler)
    print("Listening on http://localhost:18080")
    print("Press Ctrl+C to stop")
    print("")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
