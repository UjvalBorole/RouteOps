/**
 * Type definitions for Dashboard components
 * Shared interfaces for route-related data structures
 */

export interface Location {
  lat: number;
  lng: number;
}

export interface RouteNode {
  nodeId: number;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface RouteSession {
  sessionId: string;
  sessionName: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startAddress?: string;
  destinationAddress?: string;
  totalDistance?: number;
  remainingDistance?: number;
  status?: string;
  routePath?: RouteNode[];
  remainingPathNodes?: RouteNode[];
  currentLat?: number;
  currentLng?: number;
  nextInstruction?: string;
  onRoute?: boolean;
  progressPercentage?: number;
  estimatedTimeToDestinationSeconds?: number;
  currentSpeedKmh?: number;
  lastSegmentDistanceMeters?: number;
  lastSegmentDurationSeconds?: number;
}
