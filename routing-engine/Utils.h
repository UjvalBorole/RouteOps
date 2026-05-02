#ifndef UTILS_H
#define UTILS_H

#include <cmath>
struct Node;

constexpr double EARTH_RADIUS = 6371000;

double toRadians(double degrees);

double calculateHaversineDistance(const Node& n1, const Node& n2);


#endif //UTILS_H
