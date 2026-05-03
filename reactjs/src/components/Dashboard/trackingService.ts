/**
 * Location Tracking Service
 * Handles GPS tracking, location updates, and position management
 */

import apiClient from '../../utils/apiClient';
import { RouteSession } from './types';
import { calculateDistanceMeters } from './mapUtils';

/**
 * Send location update to backend
 * Automatically calculates speed based on distance traveled
 */
export const sendLocationUpdate = async (
  sessionId: string | null,
  latitude: number,
  longitude: number,
  speedKmh: number,
  accuracyMeters: number,
  lastSubmittedPosition: { lat: number; lng: number; timestamp: number } | null = null
): Promise<{ session: RouteSession | null; speed: number } | null> => {
  if (!sessionId) return null;

  const nowMs = Date.now();
  let computedSpeedKmh = speedKmh;

  // Calculate speed from distance if previous position exists
  if (lastSubmittedPosition) {
    const distanceMeters = calculateDistanceMeters(
      lastSubmittedPosition.lat,
      lastSubmittedPosition.lng,
      latitude,
      longitude
    );
    const timeSeconds = Math.max(1, Math.round((nowMs - lastSubmittedPosition.timestamp) / 1000));
    computedSpeedKmh = Math.max(0, (distanceMeters / timeSeconds) * 3.6);
  }

  try {
    const response = await apiClient.post('/api/routes/location', {
      sessionId,
      latitude,
      longitude,
      speedKmh: computedSpeedKmh,
      accuracyMeters,
    });

    const updatedSession = response.data as RouteSession;
    return { session: updatedSession, speed: computedSpeedKmh };
  } catch (error) {
    console.error('Failed to send location update:', error);
    return null;
  }
};

/**
 * Start GPS location watching
 * Returns watch ID for later cleanup
 */
export const startGPSWatch = (): number | null => {
  if (!navigator.geolocation) return null;

  return navigator.geolocation.watchPosition(
    (position) => {
      // Position updates are handled by the component
      return position;
    },
    (error) => {
      console.error('Geolocation error:', error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    }
  );
};

/**
 * Stop GPS location watching
 */
export const stopGPSWatch = (watchId: number | null): void => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Get current GPS position
 */
export const getCurrentGPSPosition = (): Promise<GeolocationCoordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};
