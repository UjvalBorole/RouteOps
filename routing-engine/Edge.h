//
// Created by const on 05-Dec-25.
//

#ifndef ROUTING_ENGINE_EDGE_H
#define ROUTING_ENGINE_EDGE_H

#include <memory>

#include "Node.h"

struct Edge {
    long long sourceId; // Source node ID
    long long targetId; // Destination node ID
    double distance;
    bool isOneWay;
    double maxWeight;
};


#endif //ROUTING_ENGINE_EDGE_H
