#ifndef ROUTING_ENGINE_GRAPH_H
#define ROUTING_ENGINE_GRAPH_H

#include <list>
#include <unordered_map>
#include <vector>
#include "Node.h"
#include "Edge.h"

struct Graph {
    std::unordered_map<long long, Node> nodes;
    std::unordered_map<long long, std::vector<Edge>> adjStreets;

    void loadNodes(std::istream& is);
    void loadEdges(std::istream& is);

    std::pair<std::list<long long>, double> findPath(const Node &startNode, const Node &targetNode, double vehicleWeight);
    long long findNearestNode(double lat, double lon);
};


#endif //ROUTING_ENGINE_GRAPH_H