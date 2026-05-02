export type GeoPoint = {
  lat: number;
  lng: number;
};

export type RouteNode = {
  id: number | null;
  lat: number;
  lng: number;
};

export type RoutePlan = {
  status: string;
  count: number;
  totalDistance: number;
  path: RouteNode[];
};

export type StartGuidanceRequest = {
  userId: string;
  currentLocation: GeoPoint;
  destination: GeoPoint;
  thresholdDistanceMeters?: number;
  thresholdEtaMinutes?: number;
  speedKmh?: number;
};

export type GuidanceSessionResponse = {
  sessionId: string;
  userId: string;
  currentLocation: GeoPoint;
  destination: GeoPoint;
  thresholdDistanceMeters?: number;
  thresholdEtaMinutes?: number;
  speedKmh: number;
  rerouteCount: number;
  thresholdTriggered: boolean;
  createdAt: string;
  updatedAt: string;
  route: RoutePlan;
};

export type LocationUpdateRequest = {
  currentLocation: GeoPoint;
};

export type LocationUpdateResponse = {
  sessionId: string;
  currentLocation: GeoPoint;
  followingPlannedRoute: boolean;
  rerouted: boolean;
  rerouteCount: number;
  remainingRouteDistanceMeters: number;
  etaMinutes: number;
  thresholdTriggered: boolean;
  status: string;
  message: string;
  activeRoute: RoutePlan;
};
