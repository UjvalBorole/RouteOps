#include "Graph.h"

#include <list>
#include <print>
#include <queue>
#include <sstream>
#include <string>

#include "Utils.h"

struct QueueElement {
    long long nodeId;
    double fScore;

    bool operator>(const QueueElement& oth) const {
        return fScore > oth.fScore;
    }
};

void Graph::loadNodes(std::istream& is) {
    std::string line;
    while (std::getline(is, line)) {
        if (line.empty()) continue;

        std::stringstream ss(line);
        long long id;
        double lat, lon;
        char comma;

        if (ss >> id >> lat >> lon) {
            nodes[id] = Node{id, lon, lat};
        }
    }
}

void Graph::loadEdges(std::istream &is) {
    std::string line;
    long long totalEdges = 0;
    long long oneWayCount = 0;

    while (std::getline(is, line)) {
        if (line.empty()) continue;

        // Replace commas with spaces if needed
        for (char &c : line) if (c == ',') c = ' ';

        std::stringstream ss(line);
        long long sourceID, destID;
        double distance, maxWeight;
        int isOneWayInt;

        // Try to read all 5 values
        if (ss >> sourceID >> destID >> distance >> maxWeight >> isOneWayInt) {

            bool oneWay = (isOneWayInt == 1);
            totalEdges++;
            if (oneWay) oneWayCount++;

            // Add the forward edge
            Edge forwardEdge = {sourceID, destID, distance, oneWay, maxWeight};
            adjStreets[sourceID].push_back(forwardEdge);

            // Add the reverse edge only if the road is not one-way
            if (!oneWay) {
                Edge backwardEdge = {destID, sourceID, distance, oneWay, maxWeight};
                adjStreets[destID].push_back(backwardEdge);
            }
        }
    }

    // Debug summary after loading all edges
    std::println("Edges loaded: {}. One-Way Streets detected: {}", totalEdges, oneWayCount);
}


std::pair<std::list<long long>, double> Graph::findPath(const Node &startNode, const Node &targetNode, double vehicleWeight) {
    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<>> openSet;
    std::unordered_map<long long, double> gScore;
    std::unordered_map<long long, long long> cameFrom;

    openSet.push({startNode.id, calculateHaversineDistance(startNode, targetNode)});

    gScore[startNode.id] = 0.0;

    while (!openSet.empty()) {
        QueueElement peek = openSet.top();
        openSet.pop();

        if (peek.nodeId == targetNode.id) break;

        for (const Edge& edge: adjStreets[peek.nodeId]) {

            if (vehicleWeight > edge.maxWeight && edge.maxWeight != 0.0)
                continue;

            const double newG = gScore[peek.nodeId] + edge.distance;

            if (!gScore.contains((edge.targetId)) || newG < gScore[edge.targetId]) {
                    gScore[edge.targetId] = newG;
                    cameFrom[edge.targetId] = peek.nodeId;
                    openSet.push({edge.targetId, newG + calculateHaversineDistance(nodes[edge.targetId], targetNode)});
            }
        }

    }

    std::list<long long> graphPath;
    double totalDist = 0.0;

    if (cameFrom.find(targetNode.id) != cameFrom.end()) {
        totalDist = gScore[targetNode.id];

        long long current = targetNode.id;
        graphPath.push_front(current);
        while (current != startNode.id) {
            graphPath.push_front(cameFrom[current]);
            current = cameFrom[current];
        }
    }
    return {graphPath, totalDist};
}

long long Graph::findNearestNode(double lat, double lon) {
    long long nearestId = -1;
    double minDistance = std::numeric_limits<double>::max();


    Node target = {0, lon, lat};


    for (const auto& pair : nodes) {
        const Node& currentNode = pair.second;

        double dist = calculateHaversineDistance(currentNode, target);

        if (dist < minDistance) {
            minDistance = dist;
            nearestId = currentNode.id;
        }
    }

    return nearestId;
}
