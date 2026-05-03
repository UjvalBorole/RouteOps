/**
 * MapViewportController Component
 * Controls the map viewport to fit the route points
 * Automatically animates the map view to show all route markers
 */

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapViewportControllerProps {
  points: Array<[number, number]>;
}

const MapViewportController: React.FC<MapViewportControllerProps> = ({ points }) => {
  const map = useMap();

  // Effect to update map viewport when points change
  useEffect(() => {
    if (points.length === 0) return;

    // Single point: zoom in on that point
    if (points.length === 1) {
      map.flyTo(points[0], 15, { animate: true, duration: 1.2 });
      return;
    }

    // Multiple points: fit bounds to show all points with padding
    map.flyToBounds(points, {
      animate: true,
      duration: 1.2,
      padding: [40, 40],
      maxZoom: 16,
    });
  }, [map, points]);

  return null;
};

export default MapViewportController;
