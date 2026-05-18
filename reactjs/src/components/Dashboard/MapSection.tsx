/**
 * MapSection Component
 * Displays the route map with markers and route visualization
 * Shows start point (green), destination (red), and current position (blue)
 */

import React from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Location } from './types';
import MapViewportController from './MapViewportController';
import 'leaflet/dist/leaflet.css';
import './styles/MapSection.css';

interface MapSectionProps {
  // Route locations
  startLocation: Location | null;
  endLocation: Location | null;
  currentLocation: { lat: number; lng: number } | null;

  // Route path
  routePath: Array<[number, number]>;
  previewPath: Array<[number, number]>;
  viewportPoints: Array<[number, number]>;

  // Theme
  isDarkMode: boolean;
}

const MapSection: React.FC<MapSectionProps> = ({
  startLocation,
  endLocation,
  currentLocation,
  routePath,
  previewPath,
  viewportPoints,
  isDarkMode,
}) => {
  return (
    <div className="map-section">
      <div className="map-container">
        <MapContainer center={[19.03, 72.87]} zoom={12} style={{ height: '100%' }}>
          {/* Auto-adjust map viewport when points change */}
          <MapViewportController points={viewportPoints} />

          {/* Map tile layer (light or dark mode) */}
          <TileLayer
            className={isDarkMode ? 'google-like-dark-tiles' : 'google-like-light-tiles'}
            url={
              isDarkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
            }
            attribution="© OpenStreetMap contributors"
          />

          {/* Start location marker (green) */}
          {startLocation && (
            <>
              {/* Outer pulsing ring */}
              <CircleMarker
                center={[startLocation.lat, startLocation.lng]}
                radius={12}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#34a853',
                  fillOpacity: 1,
                  className: 'pulse-marker-start',
                }}
              >
                <Popup>Start Location</Popup>
              </CircleMarker>
              {/* Inner white dot */}
              <CircleMarker
                center={[startLocation.lat, startLocation.lng]}
                radius={5}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  weight: 0,
                }}
              >
                <Popup>Start Location</Popup>
              </CircleMarker>
            </>
          )}

          {/* End location marker (red) */}
          {endLocation && (
            <>
              {/* Outer pulsing ring */}
              <CircleMarker
                center={[endLocation.lat, endLocation.lng]}
                radius={12}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#ea4335',
                  fillOpacity: 1,
                  className: 'pulse-marker-end',
                }}
              >
                <Popup>Destination</Popup>
              </CircleMarker>
              {/* Inner white dot */}
              <CircleMarker
                center={[endLocation.lat, endLocation.lng]}
                radius={5}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  weight: 0,
                }}
              >
                <Popup>Destination</Popup>
              </CircleMarker>
            </>
          )}

          {/* Current live position marker (blue) */}
          {currentLocation && (
            <CircleMarker
              center={[currentLocation.lat, currentLocation.lng]}
              radius={11}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#1a73e8',
                fillOpacity: 1,
                className: 'pulse-marker-live',
              }}
            >
              <Popup>Your Live Position</Popup>
            </CircleMarker>
          )}

          {/* Route path visualization */}
          {previewPath.length > 0 && (
            <>
              {/* White outline (background) */}
              <Polyline
                positions={previewPath}
                pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }}
              />
              {/* Blue line (foreground) with optional dashed pattern for preview */}
              <Polyline
                positions={previewPath}
                pathOptions={{
                  color: '#4285f4',
                  weight: 6,
                  opacity: 0.96,
                  dashArray: routePath.length === 0 ? '6, 10' : undefined,
                  lineCap: 'round',
                  className: 'animated-route-path',
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapSection;
