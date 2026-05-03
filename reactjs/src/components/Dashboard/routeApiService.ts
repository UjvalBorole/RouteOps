/**
 * Route API Service
 * Handles all API calls related to routes and sessions
 */

import apiClient from '../../utils/apiClient';
import { RouteSession } from './types';

/**
 * Fetch all route sessions
 */
export const fetchSessions = async (): Promise<RouteSession[]> => {
  try {
    const response = await apiClient.get('/api/routes');
    return response.data ?? [];
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }
};

/**
 * Fetch details for a specific session
 */
export const getSessionDetails = async (
  sessionId: string
): Promise<RouteSession | null> => {
  try {
    const response = await apiClient.get(`/api/routes/${sessionId}`);
    return response.data as RouteSession;
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return null;
  }
};

/**
 * Plan a new route
 */
export const planRoute = async (routeData: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startAddress: string;
  destinationAddress: string;
  vehicleType: string;
  sessionName: string;
  destinationThresholdMeters: number;
  destinationThresholdSeconds: number;
}): Promise<RouteSession | null> => {
  try {
    const response = await apiClient.post('/api/routes/plan', routeData);
    return response.data as RouteSession;
  } catch (error) {
    console.error('Failed to plan route:', error);
    return null;
  }
};

/**
 * Send location update for active session
 */
export const sendLocationUpdate = async (locationData: {
  sessionId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  accuracyMeters: number;
}): Promise<RouteSession | null> => {
  try {
    const response = await apiClient.post('/api/routes/location', locationData);
    return response.data as RouteSession;
  } catch (error) {
    console.error('Failed to send location update:', error);
    return null;
  }
};

/**
 * Cancel an active session
 */
export const cancelSession = async (sessionId: string): Promise<RouteSession | null> => {
  try {
    const response = await apiClient.post(`/api/routes/${sessionId}/cancel`);
    return response.data as RouteSession;
  } catch (error) {
    console.error('Failed to cancel session:', error);
    return null;
  }
};
