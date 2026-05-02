#include "Utils.h"

#include "Node.h"

constexpr double K_PI = 3.1415926535897932;

double toRadians(double degrees) {
    return degrees* K_PI / 180.0;
}

double calculateHaversineDistance(const Node &n1, const Node &n2) {

    const double firstLat = toRadians(n1.latitude);
    const double secondLat = toRadians(n2.latitude);

    const double firstLong = toRadians(n1.longitude);
    const double secondLong = toRadians(n2.longitude);

    const double diffLat = fabs(firstLat - secondLat);
    const double diffLong = fabs(firstLong - secondLong);

    const double temp = pow(sin(diffLat/2.0), 2) + cos(firstLat) * cos(secondLat) * pow(sin(diffLong/2.0), 2);

    const double centralAngle = 2.0 * atan2(sqrt(temp), sqrt(1-temp));

    return EARTH_RADIUS * centralAngle;

}
