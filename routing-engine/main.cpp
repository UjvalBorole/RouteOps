#include "crow.h"
#include "Graph.h"
#include <print>

int main() {
    Graph map;
    std::println("--- [SERVER START] ---");
    std::println("Loading map data...");

    try {
        std::ifstream nodeFile("nodes.csv");
        if (!nodeFile.is_open())
            throw std::runtime_error("Could not open 'nodes.csv' file.");
        map.loadNodes(nodeFile);

        // --- Add this line ---
        std::println("Nodes loaded successfully. Total count: {}", map.nodes.size());
        // ------------------------

        std::ifstream edgeFile("edges.csv");
        if (!edgeFile.is_open())
            throw std::runtime_error("Could not open 'edges.csv' file.");
        map.loadEdges(edgeFile);
        std::println("Edges loaded.");
    } catch (const std::runtime_error& e) {
        std::cerr <<"CRITICAL ERROR AT STARTUP: " << e.what() << std::endl;
        return 1;
    }

    crow::SimpleApp app;

    CROW_ROUTE(app, "/route")
    ([&map](const crow::request& req) {

        // 1. Read coordinates as strings
        char* startLatStr = req.url_params.get("startLat");
        char* startLngStr = req.url_params.get("startLng");
        char* endLatStr = req.url_params.get("endLat");
        char* endLngStr = req.url_params.get("endLng");
        char* weightStr = req.url_params.get("weight");

        // Validate that all required parameters were received
        if (!startLatStr || !startLngStr || !endLatStr || !endLngStr) {
            crow::json::wvalue errorResponse;
            errorResponse["status"] = "error";
            errorResponse["message"] = "Missing coordinates parameters (startLat, startLng, endLat, endLng).";
            return crow::response(400, errorResponse);
        }

        // 2. Convert them to double
        double startLat = std::stod(startLatStr);
        double startLng = std::stod(startLngStr);
        double endLat = std::stod(endLatStr);
        double endLng = std::stod(endLngStr);
        double vehicleWeight = weightStr ? std::stod(weightStr) : 0.0;

        std::println("Request: {} {} -> {} {}", startLat, startLng, endLat, endLng);

        // 3. Find the nearest nodes (this is the key step)
        long long startNodeId = map.findNearestNode(startLat, startLng);
        long long endNodeId = map.findNearestNode(endLat, endLng);

        std::println("Mapped to Nodes: {} -> {}", startNodeId, endNodeId);

        // 4. Compute the route using the resolved node IDs
        auto result = map.findPath(map.nodes[startNodeId], map.nodes[endNodeId], vehicleWeight);

        // ... (The rest of the JSON generation stays the same as before) ...

        std::list<long long> path = result.first;
        double totalDistance = result.second;

        crow::json::wvalue jsonResponse;

        if (path.empty()) {
             // ... not found logic ...
             jsonResponse["status"] = "not_found";
             return crow::response(404, jsonResponse);
        }

        // ... build jsonResponse ...
        jsonResponse["status"] = "success";
        jsonResponse["totalDistance"] = totalDistance;
        jsonResponse["count"] = (int)path.size();

        int i = 0;
        for (long long nodeId : path) {
            const auto& node = map.nodes.at(nodeId);
            crow::json::wvalue nodeObj;
            nodeObj["id"] = nodeId;
            nodeObj["lat"] = node.latitude;
            nodeObj["lon"] = node.longitude;
            jsonResponse["path"][i++] = std::move(nodeObj);
        }

        return crow::response(200, jsonResponse);
    });

    std::println("Server is starting on port 18080...");
    app.port(18080).multithreaded().run();

    return 0;
}
