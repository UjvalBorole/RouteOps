import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import apiClient from '../utils/apiClient';
import tokenService from '../utils/tokenService';
import './Dashboard.css';
import L from 'leaflet';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
}

interface RouteNode {
  nodeId: number;
  latitude: number;
  longitude: number;
  sequence: number;
  streetName?: string;
  instruction?: string;
  distanceFromStart?: number;
}

interface RouteSession {
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
  remainingDistanceKm?: number;
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
  currentNodeIndex?: number;
  distanceToNextInstruction?: number;
}

interface PlanSettings {
  vehicleType: 'car' | 'bike' | 'pedestrian';
  destinationThresholdMeters: number;
  destinationThresholdSeconds: number;
}

const ACTIVE_SESSION_ID_KEY = 'route-app.active-session-id';
const TRACKING_ENABLED_KEY = 'route-app.tracking-enabled';
const TRACKING_INTERVAL_MS = 30 * 1000;
const LOCATION_STALE_MS = 2 * 60 * 1000;
const MISSED_LOCATION_UPDATE_LIMIT = LOCATION_STALE_MS / TRACKING_INTERVAL_MS;
const LOCATION_MOVEMENT_THRESHOLD_METERS = 5;

const TILE_URLS: Record<string, string> = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  vehicleType: 'car',
  destinationThresholdMeters: 100,
  destinationThresholdSeconds: 60,
};

const isTerminalRouteStatus = (status?: string) => status === 'CANCELLED' || status === 'COMPLETED' || status === 'REACHED';
const isTrackingBlockedStatus = (status?: string) => isTerminalRouteStatus(status) || status === 'PAUSED';

const startIcon = L.divIcon({
  html: '<div class="start-marker-modern"><span></span></div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const destinationIcon = L.divIcon({
  html: '<div class="destination-marker-modern"><span></span></div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const vehicleIcon = L.divIcon({
  html: '<div class="vehicle-marker-modern"><div class="vehicle-marker-ring"><div class="vehicle-marker-core"></div></div></div>',
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const MapInstanceController: React.FC<{ mapRef: React.MutableRefObject<L.Map | null>; watchKey: string }> = ({ mapRef, watchKey }) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef]);

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 350);
  }, [map, watchKey]);

  return null;
};

const MapViewportController: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 15, { animate: true, duration: 1.2 });
      return;
    }
    map.flyToBounds(points, { animate: true, duration: 1.2, padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // State Management
  const [startAddress, setStartAddress] = useState('Panvel');
  const [endAddress, setEndAddress] = useState('Kurla');
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [sessions, setSessions] = useState<RouteSession[]>([]);
  const [activeSession, setActiveSession] = useState<RouteSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showStartTrackingDialog, setShowStartTrackingDialog] = useState(false);
  const [showPlanSettingsDialog, setShowPlanSettingsDialog] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(() => localStorage.getItem(TRACKING_ENABLED_KEY) === 'true');
  const [isEditingNewRoute, setIsEditingNewRoute] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [currentLayer, setCurrentLayer] = useState('streets');
  const [, setLastLocationUpdate] = useState<Date | null>(null);
  const [isResolvingRoute, setIsResolvingRoute] = useState(false);
  const [planSettings, setPlanSettings] = useState<PlanSettings>(DEFAULT_PLAN_SETTINGS);
  const [pendingRouteLocations, setPendingRouteLocations] = useState<{ start: Location; end: Location } | null>(null);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [showRouteTrack, setShowRouteTrack] = useState(true);
  const [isBottomPanelMinimized, setIsBottomPanelMinimized] = useState(false);
  const [liveClock, setLiveClock] = useState(Date.now());
  const [waypointAddressMap, setWaypointAddressMap] = useState<Record<string, string>>({});
  const [currentAddress, setCurrentAddress] = useState('');
  const [trackingRequestPending, setTrackingRequestPending] = useState(false);
  const [trackingStartedAt, setTrackingStartedAt] = useState<number | null>(null);
  const [lastLocationMovementAt, setLastLocationMovementAt] = useState<number | null>(null);

  // Refs
  const intervalRef = useRef<number | null>(null);
  const watchRef = useRef<number | null>(null);
  const currentCoordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const activeSessionRef = useRef<RouteSession | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const trackingEnabledRef = useRef(trackingEnabled);
  const startLocationRef = useRef<Location | null>(null);
  const speedRef = useRef<number>(0);
  const accuracyRef = useRef<number>(10);
  const lastSubmittedPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const locationUpdateInFlightRef = useRef(false);
  const missedLocationUpdateCountRef = useRef(0);
  const stalePauseSyncedRef = useRef(false);
  const trackingStartedAtRef = useRef<number | null>(null);
  const lastLocationMovementAtRef = useRef<number | null>(null);
  const autoResumeInFlightRef = useRef(false);
  const pausedPositionRef = useRef<Location | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const waypointAddressMapRef = useRef<Record<string, string>>({});

  // Effects
  useEffect(() => {
    currentCoordsRef.current = { lat: currentLat, lng: currentLng };
  }, [currentLat, currentLng]);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.sessionId ?? null;
    activeSessionRef.current = activeSession;
  }, [activeSession?.sessionId]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    trackingEnabledRef.current = trackingEnabled;
  }, [trackingEnabled]);

  useEffect(() => {
    startLocationRef.current = startLocation;
  }, [startLocation]);

  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  useEffect(() => {
    waypointAddressMapRef.current = waypointAddressMap;
  }, [waypointAddressMap]);

  useEffect(() => {
    trackingStartedAtRef.current = trackingStartedAt;
  }, [trackingStartedAt]);

  useEffect(() => {
    lastLocationMovementAtRef.current = lastLocationMovementAt;
  }, [lastLocationMovementAt]);

  useEffect(() => {
    const timerId = window.setInterval(() => setLiveClock(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  // Helper functions
  const normalizeAddress = (rawAddress: string): string[] => {
    const trimmed = rawAddress.trim();
    if (!trimmed) return [];
    const withoutPostalCode = trimmed.replace(/\b\d{6}\b/g, '').replace(/\s+,/g, ',').trim();
    const expanded = withoutPostalCode
      .replace(/\bRd\b/gi, 'Road')
      .replace(/\bSt\b/gi, 'Street')
      .replace(/\bMt\b/gi, 'Mount')
      .replace(/\s+/g, ' ')
      .trim();
    const withIndia = /india/i.test(expanded) ? expanded : `${expanded}, India`;
    const shortForm = expanded.split(',').map((part) => part.trim()).filter(Boolean).slice(0, 5).join(', ');
    return Array.from(new Set([trimmed, withoutPostalCode, expanded, withIndia, shortForm]));
  };

  const parseCoordinatesFromText = (rawAddress: string): Location | null => {
    const text = rawAddress.trim();
    if (!text) return null;
    const commaParts = text.split(',').map((part) => part.trim());
    if (commaParts.length === 2) {
      const lat = Number(commaParts[0]);
      const lng = Number(commaParts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    const spaceParts = text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
    if (spaceParts.length === 2) {
      const lat = Number(spaceParts[0]);
      const lng = Number(spaceParts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  };

  const geocodeWithNominatim = async (query: string): Promise<Location | null> => {
    const response = await apiClient.get('/api/geocoding/search', {
      params: { q: query, countrycodes: 'in' },
      timeout: 12000,
    });
    const result = response.data;
    if (!Number.isFinite(result?.lat) || !Number.isFinite(result?.lng)) return null;
    return { lat: result.lat, lng: result.lng };
  };

  const geocodeWithNominatimNoCountry = async (query: string): Promise<Location | null> => {
    const response = await apiClient.get('/api/geocoding/search', {
      params: { q: query },
      timeout: 12000,
    });
    const result = response.data;
    if (!Number.isFinite(result?.lat) || !Number.isFinite(result?.lng)) return null;
    return { lat: result.lat, lng: result.lng };
  };

  const buildReducedQueries = (rawAddress: string): string[] => {
    const parts = rawAddress.split(',').map((part) => part.trim()).filter(Boolean);
    const reduced: string[] = [];
    if (parts.length >= 3) reduced.push(parts.slice(-3).join(', '));
    if (parts.length >= 2) reduced.push(parts.slice(-2).join(', '));
    if (parts.length >= 1) reduced.push(parts[parts.length - 1]);
    return Array.from(new Set(reduced));
  };

  const geocodeWithPhoton = async (query: string): Promise<Location | null> => {
    return geocodeWithNominatimNoCountry(query);
  };

  const geocodeAddress = async (address: string): Promise<Location | null> => {
    const coordinateValue = parseCoordinatesFromText(address);
    if (coordinateValue) return coordinateValue;

    const queries = normalizeAddress(address);
    for (const query of queries) {
      try {
        const result = await geocodeWithNominatim(query);
        if (result) return result;
      } catch { }
    }
    for (const query of queries) {
      try {
        const result = await geocodeWithPhoton(query);
        if (result) return result;
      } catch { }
    }
    for (const query of queries) {
      try {
        const result = await geocodeWithNominatimNoCountry(query);
        if (result) return result;
      } catch { }
    }

    const reducedQueries = buildReducedQueries(address);
    for (const query of reducedQueries) {
      try {
        const result = await geocodeWithNominatimNoCountry(query);
        if (result) return result;
      } catch { }
    }
    return null;
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await apiClient.get('/api/geocoding/reverse', {
        params: { lat, lon: lng },
        timeout: 12000,
      });
      return response.data?.displayName ?? null;
    } catch {
      return null;
    }
  };

  const getCurrentGpsLocation = (): Promise<Location | null> => {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const setCurrentGpsAsStart = async (showToastMsg = true): Promise<Location | null> => {
    const detected = await getCurrentGpsLocation();
    if (!detected) {
      if (showToastMsg) toast.error('Unable to access GPS/current location.');
      return null;
    }

    setStartLocation(detected);
    setCurrentLat(detected.lat);
    setCurrentLng(detected.lng);
    const address = await reverseGeocode(detected.lat, detected.lng);
    setStartAddress(address ? shortenAddress(address) : `${detected.lat}, ${detected.lng}`);
    setIsEditingNewRoute(true);
    if (showToastMsg) toast.success('Using current GPS location as start.');
    return detected;
  };

  const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const earthRadius = 6_371_000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  const formatDuration = (totalSeconds?: number): string => {
    if (!totalSeconds || totalSeconds <= 0) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatMeters = (meters?: number): string => {
    if (meters === undefined || meters === null || !Number.isFinite(meters)) return '-';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.max(0, Math.round(meters))} m`;
  };

  const formatMinutes = (seconds?: number): string => {
    if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds <= 0) return 'ETA unavailable';
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} min`;
  };

  const coordinateKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const shortenAddress = (address: string): string => {
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.slice(0, 4).join(', ') || address;
  };

  const getNodeLabel = (node?: RouteNode | null, fallback = 'Waypoint') => {
    if (!node) return fallback;
    const key = coordinateKey(node.latitude, node.longitude);
    return node.streetName || node.instruction || waypointAddressMap[key] || fallback;
  };

  const isCurrentLocationInput = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return !normalized || normalized === 'current' || normalized === 'current location' || normalized === 'my location';
  };

  const fetchSessions = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/routes');
      setSessions(response.data ?? []);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    }
  }, []);

  const hydrateSessionContext = useCallback((session: RouteSession) => {
    setStartAddress(session.startAddress ?? `${session.startLat}, ${session.startLng}`);
    setEndAddress(session.destinationAddress ?? `${session.endLat}, ${session.endLng}`);
    setStartLocation({ lat: session.startLat, lng: session.startLng });
    setEndLocation({ lat: session.endLat, lng: session.endLng });
    if (session.currentLat !== undefined && session.currentLng !== undefined) {
      setCurrentLat(session.currentLat);
      setCurrentLng(session.currentLng);
    }
  }, []);

  const getSessionDetails = useCallback(async (sessionId: string, showToastMsg = false): Promise<RouteSession | null> => {
    try {
      const response = await apiClient.get(`/api/routes/${sessionId}`);
      const session = response.data as RouteSession;
      setActiveSession(session);
      hydrateSessionContext(session);
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
      if (isTerminalRouteStatus(session.status)) {
        setTrackingEnabled(false);
        localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
      }
      if (showToastMsg) toast.success('Session loaded.');
      return session;
    } catch (error) {
      if (showToastMsg) toast.error('Failed to fetch session details.');
      return null;
    }
  }, [hydrateSessionContext]);

  useEffect(() => {
    fetchSessions();
    const savedId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (savedId) {
      getSessionDetails(savedId);
    }
  }, [fetchSessions, getSessionDetails]);

  useEffect(() => {
    if (!navigator.geolocation || startLocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = { lat: position.coords.latitude, lng: position.coords.longitude };
        setStartLocation(detected);
        setCurrentLat(detected.lat);
        setCurrentLng(detected.lng);
        const address = await reverseGeocode(detected.lat, detected.lng);
        if (address) setStartAddress(address);
      },
      () => { },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [startLocation]);

  const handleSetLocation = async (isStart: boolean) => {
    const address = isStart ? startAddress : endAddress;
    if (isStart && isCurrentLocationInput(address)) {
      await setCurrentGpsAsStart(true);
      return;
    }
    if (!address.trim()) {
      toast.warn('Please enter an address.');
      return;
    }
    const location = await geocodeAddress(address);
    if (!location) {
      toast.error('Address not detected. Try adding landmark/city.');
      return;
    }
    if (isStart) {
      setStartLocation(location);
      setCurrentLat(location.lat);
      setCurrentLng(location.lng);
    } else {
      setEndLocation(location);
    }
    setIsEditingNewRoute(true);
    toast.success(isStart ? 'Start location set.' : 'Destination set.');
  };

  const resolveRouteLocations = async (): Promise<{ start: Location; end: Location } | null> => {
    if (isResolvingRoute) return null;
    if (startLocation && endLocation) {
      return { start: startLocation, end: endLocation };
    }

    setIsResolvingRoute(true);
    try {
      let gpsStart: Location | null = null;
      if (!startLocation && isCurrentLocationInput(startAddress)) {
        gpsStart = await setCurrentGpsAsStart(false);
        if (!gpsStart) {
          toast.error('Could not detect current location. Enter a From address or allow location permission.');
          return null;
        }
      }

      const [resolvedStart, resolvedEnd] = await Promise.all([
        startLocation ? Promise.resolve(startLocation) : gpsStart ? Promise.resolve(gpsStart) : geocodeAddress(startAddress),
        endLocation ? Promise.resolve(endLocation) : geocodeAddress(endAddress),
      ]);

      if (!resolvedStart || !resolvedEnd) {
        toast.error('Could not detect both route points. Try adding city or landmark details.');
        return null;
      }

      setStartLocation(resolvedStart);
      setCurrentLat((lat) => lat ?? resolvedStart.lat);
      setCurrentLng((lng) => lng ?? resolvedStart.lng);
      setEndLocation(resolvedEnd);
      setIsEditingNewRoute(true);
      return { start: resolvedStart, end: resolvedEnd };
    } finally {
      setIsResolvingRoute(false);
    }
  };

  const useCurrentLocationAsStart = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported.');
      return;
    }
    setCurrentGpsAsStart(true);
  };

  const clearTrackingTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pauseTrackingForStaleLocation = useCallback((syncBackend = true) => {
    const session = activeSessionRef.current;
    if (!session?.sessionId || session.status === 'PAUSED' || isTerminalRouteStatus(session.status)) return;

    const pausedSession = { ...session, status: 'PAUSED', currentSpeedKmh: 0 };
    activeSessionRef.current = pausedSession;
    pausedPositionRef.current = {
      lat: currentCoordsRef.current.lat ?? session.currentLat ?? session.startLat,
      lng: currentCoordsRef.current.lng ?? session.currentLng ?? session.startLng,
    };
    setActiveSession((prev) => (prev ? { ...prev, status: 'PAUSED', currentSpeedKmh: 0 } : prev));
    setSelectedSession((prev) => (prev?.sessionId === session.sessionId ? { ...prev, status: 'PAUSED', currentSpeedKmh: 0 } : prev));
    setSessions((prev) => prev.map((item) => (item.sessionId === session.sessionId ? { ...item, status: 'PAUSED', currentSpeedKmh: 0 } : item)));
    setSpeedKmh(0);
    setTrackingEnabled(false);
    trackingEnabledRef.current = false;
    setTrackingStartedAt(null);
    setLastLocationMovementAt(null);
    trackingStartedAtRef.current = null;
    lastLocationMovementAtRef.current = null;
    localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
    clearTrackingTimer();

    if (syncBackend && !stalePauseSyncedRef.current) {
      stalePauseSyncedRef.current = true;
      apiClient.post(`/api/routes/${session.sessionId}/pause`).catch(() => undefined);
    }
  }, [clearTrackingTimer]);

  const registerMissedLocationUpdate = useCallback(() => {
    missedLocationUpdateCountRef.current += 1;
    if (missedLocationUpdateCountRef.current >= MISSED_LOCATION_UPDATE_LIMIT) {
      pauseTrackingForStaleLocation(true);
    }
  }, [pauseTrackingForStaleLocation]);

  const sendLocationUpdate = useCallback(async (silent = false) => {
    if (locationUpdateInFlightRef.current) return;

    const sessionId = activeSessionIdRef.current;
    if (!sessionId) return;
    const session = activeSessionRef.current;
    if (isTrackingBlockedStatus(session?.status)) {
      setTrackingEnabled(false);
      trackingEnabledRef.current = false;
      localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
      clearTrackingTimer();
      if (!silent) toast.warn(`Tracking is not active because this route is ${session?.status?.toLowerCase()}.`);
      return;
    }

    const lat = currentCoordsRef.current.lat ?? session?.currentLat ?? startLocationRef.current?.lat ?? null;
    const lng = currentCoordsRef.current.lng ?? session?.currentLng ?? startLocationRef.current?.lng ?? null;
    if (lat === null || lng === null) {
      registerMissedLocationUpdate();
      return;
    }

    const nowMs = Date.now();
    let computedSpeedKmh = speedRef.current;
    let stationaryUpdate = false;
    const previousPosition = lastSubmittedPositionRef.current;
    if (previousPosition) {
      const distanceMeters = calculateDistanceMeters(previousPosition.lat, previousPosition.lng, lat, lng);
      const timeSeconds = Math.max(1, Math.round((nowMs - previousPosition.timestamp) / 1000));
      stationaryUpdate = distanceMeters < 3;
      computedSpeedKmh = stationaryUpdate ? 0 : Math.max(0, (distanceMeters / timeSeconds) * 3.6);
    } else {
      setLastLocationMovementAt(nowMs);
      lastLocationMovementAtRef.current = nowMs;
    }

    locationUpdateInFlightRef.current = true;
    try {
      const response = await apiClient.post('/api/routes/location', {
        sessionId,
        latitude: lat,
        longitude: lng,
        speedKmh: computedSpeedKmh,
        accuracyMeters: accuracyRef.current
      });
      const updated = response.data as RouteSession;
      console.log('Location update response:', updated);
      const resolvedSpeedKmh = stationaryUpdate ? 0 : updated.currentSpeedKmh ?? computedSpeedKmh;
      const adjustedUpdate = { ...updated, currentSpeedKmh: resolvedSpeedKmh };
      missedLocationUpdateCountRef.current = 0;
      stalePauseSyncedRef.current = false;
      pausedPositionRef.current = null;
      if (!stationaryUpdate) {
        setLastLocationMovementAt(nowMs);
        lastLocationMovementAtRef.current = nowMs;
      }
      lastSubmittedPositionRef.current = { lat, lng, timestamp: nowMs };
      setSpeedKmh(resolvedSpeedKmh);
      setActiveSession((prev) => (prev ? { ...prev, ...adjustedUpdate } : adjustedUpdate));
      setLastLocationUpdate(new Date());
      setLiveClock(Date.now());
      setSessions((prev) => prev.map((item) => (item.sessionId === updated.sessionId ? { ...item, ...adjustedUpdate } : item)));
      if (isTrackingBlockedStatus(updated.status)) {
        if (updated.status === 'PAUSED') {
          pausedPositionRef.current = { lat, lng };
        }
        setTrackingEnabled(false);
        trackingEnabledRef.current = false;
        localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
        clearTrackingTimer();
        if (isTerminalRouteStatus(updated.status) && watchRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      }
      if (!silent) toast.success('Location sent successfully.');
    } catch (error: any) {
      const status = error?.response?.status;
      registerMissedLocationUpdate();
      if (!silent && missedLocationUpdateCountRef.current >= MISSED_LOCATION_UPDATE_LIMIT) {
        toast.warn('Location did not update for 2 min. Route paused.');
      } else if (!silent) {
        toast.error(status >= 500 ? 'Location update failed. Retrying until 2 min before pausing.' : 'Failed to send live location.');
      }
    } finally {
      locationUpdateInFlightRef.current = false;
    }
  }, [clearTrackingTimer, registerMissedLocationUpdate, useCurrentLocationAsStart]);

  const scheduleNextTrackingPing = useCallback(() => {
    clearTrackingTimer();
    intervalRef.current = window.setTimeout(async () => {
      await sendLocationUpdate(true);
      if (trackingEnabledRef.current && activeSessionIdRef.current && !isTrackingBlockedStatus(activeSessionRef.current?.status)) {
        scheduleNextTrackingPing();
      }
    }, TRACKING_INTERVAL_MS);
  }, [clearTrackingTimer, sendLocationUpdate]);

  const stopTracking = useCallback(() => {
    setTrackingEnabled(false);
    localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
    clearTrackingTimer();
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    toast.info('Tracking stopped.');
  }, [clearTrackingTimer]);

  const startTracking = useCallback(async (silent = false, sessionOverride?: RouteSession) => {
    setTrackingRequestPending(true);
    let session = sessionOverride ?? activeSessionRef.current;
    try {
      if (!session?.sessionId) {
        if (!silent) toast.warn('Plan/select a route session first.');
        return;
      }
      if (isTerminalRouteStatus(session.status)) {
        setTrackingEnabled(false);
        trackingEnabledRef.current = false;
        localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
        if (!silent) toast.warn(`This route is ${session.status?.toLowerCase()}. Plan a new route to start tracking.`);
        return;
      }
      if (session.status === 'PAUSED') {
        try {
          const response = await apiClient.post(`/api/routes/${session.sessionId}/resume`);
          const resumed = response.data as RouteSession;
          session = { ...session, ...resumed };
          setActiveSession((prev) => (prev ? { ...prev, ...session } : session));
          setSessions((prev) => prev.map((item) => (item.sessionId === resumed.sessionId ? { ...item, ...resumed } : item)));
          activeSessionRef.current = session;
          activeSessionIdRef.current = session.sessionId;
        } catch {
          setTrackingEnabled(false);
          trackingEnabledRef.current = false;
          localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
          if (!silent) toast.error('Resume this route before starting live tracking.');
          return;
        }
      }

      activeSessionRef.current = session;
      activeSessionIdRef.current = session.sessionId;
      missedLocationUpdateCountRef.current = 0;
      stalePauseSyncedRef.current = false;
      const trackingStartMs = Date.now();
      setTrackingStartedAt(trackingStartMs);
      setLastLocationMovementAt(trackingStartMs);
      trackingStartedAtRef.current = trackingStartMs;
      lastLocationMovementAtRef.current = trackingStartMs;
      setTrackingEnabled(true);
      trackingEnabledRef.current = true;
      localStorage.setItem(TRACKING_ENABLED_KEY, 'true');

      if (navigator.geolocation && watchRef.current === null) {
        watchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setCurrentLat(position.coords.latitude);
            setCurrentLng(position.coords.longitude);
            currentCoordsRef.current = { lat: position.coords.latitude, lng: position.coords.longitude };
            if (position.coords.speed !== null && Number.isFinite(position.coords.speed)) {
              setSpeedKmh(Math.max(0, position.coords.speed * 3.6));
            }
          },
          () => { },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      }

      await sendLocationUpdate(true);
      scheduleNextTrackingPing();
      if (!silent) toast.success('Live tracking started. Auto update every 30s.');
    } finally {
      setTrackingRequestPending(false);
    }
  }, [scheduleNextTrackingPing, sendLocationUpdate]);

  useEffect(() => {
    if (!trackingEnabled || !activeSession?.sessionId) return;
    if (isTerminalRouteStatus(activeSession.status)) {
      setTrackingEnabled(false);
      trackingEnabledRef.current = false;
      localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
      clearTrackingTimer();
      return;
    }
    if (!intervalRef.current && !locationUpdateInFlightRef.current) {
      startTracking(true, activeSession);
    }
  }, [activeSession?.sessionId, clearTrackingTimer, startTracking, trackingEnabled]);

  useEffect(() => {
    if (!trackingEnabled || !activeSession?.sessionId) return;
    const lastMovement = lastLocationMovementAtRef.current ?? trackingStartedAtRef.current;
    if (lastMovement && liveClock - lastMovement >= LOCATION_STALE_MS) {
      pauseTrackingForStaleLocation(true);
    }
  }, [activeSession?.sessionId, liveClock, pauseTrackingForStaleLocation, trackingEnabled]);

  useEffect(() => {
    const session = activeSessionRef.current;
    const pausedPosition = pausedPositionRef.current;
    if (
      !session?.sessionId ||
      session.status !== 'PAUSED' ||
      !pausedPosition ||
      currentLat === null ||
      currentLng === null ||
      autoResumeInFlightRef.current
    ) {
      return;
    }

    const movedMeters = calculateDistanceMeters(pausedPosition.lat, pausedPosition.lng, currentLat, currentLng);
    if (movedMeters < LOCATION_MOVEMENT_THRESHOLD_METERS) return;

    autoResumeInFlightRef.current = true;
    const resumedSession = { ...session, status: 'ACTIVE', currentLat, currentLng };
    activeSessionRef.current = resumedSession;
    pausedPositionRef.current = null;
    setActiveSession((prev) => (prev ? { ...prev, ...resumedSession } : resumedSession));
    startTracking(true, resumedSession).finally(() => {
      autoResumeInFlightRef.current = false;
    });
  }, [currentLat, currentLng, startTracking]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearTimeout(intervalRef.current);
      if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const planRoute = async () => {
    const routeLocations = await resolveRouteLocations();
    if (!routeLocations) {
      return;
    }

    setPendingRouteLocations(routeLocations);
    setShowPlanSettingsDialog(true);
  };

  const confirmPlanRoute = async () => {
    if (!pendingRouteLocations) {
      toast.warn('Set both start and destination first.');
      return;
    }

    // Generate a default session name based on current time
    const defaultSessionName = `Route ${new Date().toLocaleTimeString()}`;

    setIsPlanningRoute(true);
    try {
      const response = await apiClient.post('/api/routes/plan', {
        startLat: pendingRouteLocations.start.lat,
        startLng: pendingRouteLocations.start.lng,
        endLat: pendingRouteLocations.end.lat,
        endLng: pendingRouteLocations.end.lng,
        startAddress,
        destinationAddress: endAddress,
        vehicleType: planSettings.vehicleType,
        sessionName: defaultSessionName,
        destinationThresholdMeters: planSettings.destinationThresholdMeters,
        destinationThresholdSeconds: planSettings.destinationThresholdSeconds,
      });
      const planned = response.data as RouteSession;
      const initialLat = planned.currentLat ?? pendingRouteLocations.start.lat;
      const initialLng = planned.currentLng ?? pendingRouteLocations.start.lng;
      const plannedSession = { ...planned, currentLat: initialLat, currentLng: initialLng, currentSpeedKmh: 0 };

      activeSessionRef.current = plannedSession;
      activeSessionIdRef.current = plannedSession.sessionId;
      lastSubmittedPositionRef.current = null;
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setSpeedKmh(0);
      setActiveSession(plannedSession);
      setIsEditingNewRoute(false);
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, plannedSession.sessionId);
      setShowPlanSettingsDialog(false);
      setShowStartTrackingDialog(false);
      await startTracking(true, plannedSession);
      toast.success('Route planned. Live tracking started.');
      await fetchSessions();
    } catch {
      toast.error('Failed to plan route.');
    } finally {
      setIsPlanningRoute(false);
    }
  };

  const updateSessionStatus = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!activeSession?.sessionId) return;
    try {
      const response = await apiClient.post(`/api/routes/${activeSession.sessionId}/${action}`);
      const session = response.data as RouteSession;
      setActiveSession((prev) => ({ ...prev, ...session }));
      setSessions((prev) => prev.map((item) => (item.sessionId === session.sessionId ? { ...item, ...session } : item)));
      if (action === 'pause' || action === 'cancel') {
        stopTracking();
      }
      if (action === 'resume' && trackingEnabled) {
        await startTracking(true);
      }
      toast.success(`Session ${action}d successfully.`);
    } catch {
      toast.error(`Failed to ${action} session.`);
    }
  };

  const mapPath = useMemo(() => {
    if (isEditingNewRoute) return [];
    const path = activeSession?.remainingPathNodes ?? activeSession?.routePath ?? [];
    return path.map((node) => [node.latitude, node.longitude] as [number, number]);
  }, [activeSession, isEditingNewRoute]);

  const previewPath = useMemo(() => {
    if (mapPath.length > 1) return mapPath;
    if (startLocation && endLocation) {
      return [[startLocation.lat, startLocation.lng] as [number, number], [endLocation.lat, endLocation.lng] as [number, number]];
    }
    return [];
  }, [endLocation, mapPath, startLocation]);

  const routeDotPoints = useMemo(() => {
    if (previewPath.length <= 2) return [];
    const step = Math.max(1, Math.ceil(previewPath.length / 24));
    return previewPath.filter((_, index) => index > 0 && index < previewPath.length - 1 && index % step === 0);
  }, [previewPath]);

  const viewportPoints = useMemo(() => {
    if (previewPath.length > 1) return previewPath;
    const points: Array<[number, number]> = [];
    if (startLocation) points.push([startLocation.lat, startLocation.lng]);
    if (endLocation) points.push([endLocation.lat, endLocation.lng]);
    if (activeSession?.currentLat && activeSession?.currentLng) {
      points.push([activeSession.currentLat, activeSession.currentLng]);
    }
    return points;
  }, [previewPath, startLocation, endLocation, activeSession]);

  const currentPosition = activeSession?.currentLat && activeSession?.currentLng
    ? { lat: activeSession.currentLat, lng: activeSession.currentLng }
    : currentLat && currentLng
    ? { lat: currentLat, lng: currentLng }
    : null;

  useEffect(() => {
    if (!currentPosition) return;
    let cancelled = false;
    const key = coordinateKey(currentPosition.lat, currentPosition.lng);
    const cached = waypointAddressMapRef.current[key];
    if (cached) {
      setCurrentAddress(cached);
      return;
    }
    reverseGeocode(currentPosition.lat, currentPosition.lng).then((address) => {
      if (cancelled || !address) return;
      const label = shortenAddress(address);
      setCurrentAddress(label);
      setWaypointAddressMap((prev) => ({ ...prev, [key]: label }));
    });
    return () => {
      cancelled = true;
    };
  }, [currentPosition]);

  useEffect(() => {
    const nodes = activeSession?.remainingPathNodes?.length
      ? activeSession.remainingPathNodes
      : activeSession?.routePath ?? [];
    if (nodes.length === 0) return;
    const sampleStep = Math.max(1, Math.ceil(nodes.length / 8));
    const nodesToResolve = nodes
      .filter((node, index) => !node.streetName && !node.instruction && index % sampleStep === 0)
      .slice(0, 8)
      .filter((node) => !waypointAddressMapRef.current[coordinateKey(node.latitude, node.longitude)]);
    if (nodesToResolve.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const node of nodesToResolve) {
        const key = coordinateKey(node.latitude, node.longitude);
        const address = await reverseGeocode(node.latitude, node.longitude);
        if (cancelled) return;
        if (address) entries[key] = shortenAddress(address);
      }
      if (Object.keys(entries).length > 0) {
        setWaypointAddressMap((prev) => ({ ...prev, ...entries }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSession?.remainingPathNodes, activeSession?.routePath]);

  const fallbackRemainingDistance = useMemo(() => {
    if (activeSession?.remainingDistance !== undefined) return activeSession.remainingDistance;
    if (activeSession?.remainingDistanceKm !== undefined) return activeSession.remainingDistanceKm * 1000;
    if (currentPosition && endLocation) return calculateDistanceMeters(currentPosition.lat, currentPosition.lng, endLocation.lat, endLocation.lng);
    if (startLocation && endLocation) return calculateDistanceMeters(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng);
    return undefined;
  }, [activeSession?.remainingDistance, activeSession?.remainingDistanceKm, currentPosition, endLocation, startLocation]);

  const lastMovementTimestamp = lastLocationMovementAt ?? trackingStartedAt;
  const isLocationStale = Boolean(trackingEnabled && lastMovementTimestamp && liveClock - lastMovementTimestamp >= LOCATION_STALE_MS);
  const displayedSpeedKmh = isLocationStale ? 0 : activeSession?.currentSpeedKmh ?? speedKmh;
  const fallbackEtaSeconds = fallbackRemainingDistance !== undefined && displayedSpeedKmh > 0
    ? Math.round((fallbackRemainingDistance / 1000 / displayedSpeedKmh) * 3600)
    : undefined;
  const displayedEtaSeconds = activeSession?.estimatedTimeToDestinationSeconds ?? fallbackEtaSeconds;
  const displayedRemainingDistance = activeSession?.remainingDistance ?? (activeSession?.remainingDistanceKm !== undefined ? activeSession.remainingDistanceKm * 1000 : fallbackRemainingDistance);
  const isLiveActive = Boolean(trackingEnabled && !trackingRequestPending && !isLocationStale);
  const displayedRouteStatus = isTrackingBlockedStatus(activeSession?.status)
    ? activeSession?.status || 'OFF'
    : isLocationStale
    ? 'PAUSED'
    : trackingRequestPending
    ? 'WAITING'
    : trackingEnabled
    ? 'LIVE'
    : activeSession?.onRoute
    ? 'ON ROUTE'
    : 'OFF';

  const upcomingNode = useMemo(() => {
    const nodes = activeSession?.remainingPathNodes?.length
      ? activeSession.remainingPathNodes
      : activeSession?.routePath ?? [];
    if (nodes.length === 0) return null;
    const currentIndex = activeSession?.currentNodeIndex ?? 0;
    return nodes.find((node) => node.sequence >= currentIndex) ?? nodes[0];
  }, [activeSession?.currentNodeIndex, activeSession?.remainingPathNodes, activeSession?.routePath]);

  const nextPlaceName = shortenAddress(getNodeLabel(upcomingNode, endAddress || 'destination'));
  const distanceToNext = activeSession?.distanceToNextInstruction
    ?? (currentPosition && upcomingNode
      ? calculateDistanceMeters(currentPosition.lat, currentPosition.lng, upcomingNode.latitude, upcomingNode.longitude)
      : displayedRemainingDistance);
  const nextWaypointEtaSeconds = distanceToNext !== undefined && displayedSpeedKmh > 0
    ? Math.round((distanceToNext / 1000 / displayedSpeedKmh) * 3600)
    : activeSession?.estimatedTimeToDestinationSeconds;

  const currentTurn = {
    instruction: isTerminalRouteStatus(activeSession?.status)
      ? `Status: ${activeSession?.status?.toLowerCase()}`
      : isLocationStale
      ? `Location paused. Last update was more than 2 min ago.`
      : activeSession
      ? `Next waypoint ${nextPlaceName} in ${formatMinutes(nextWaypointEtaSeconds)}. ${formatMeters(distanceToNext)} remaining.`
      : endLocation
      ? `Ready to plan route to ${endAddress || 'destination'}`
      : 'Set destination and plan route',
    distance: formatMeters(distanceToNext),
    street: activeSession ? (currentAddress ? `Now: ${currentAddress}` : 'Current location') : 'Current route',
  };

  const nextTurn = {
    instruction: activeSession?.nextInstruction || upcomingNode?.instruction || 'Continue',
    distance: formatMeters(displayedRemainingDistance),
  };

  const routeTrackStops = useMemo(() => {
    const nodes = activeSession?.remainingPathNodes ?? activeSession?.routePath ?? [];
    const sampledNodes = nodes.filter((_, index) => nodes.length <= 8 || index % Math.ceil(nodes.length / 8) === 0).slice(0, 8);
    const stops = [
      { label: startAddress || 'Start', type: 'start' },
      ...sampledNodes.map((node, index) => ({
        label: node.sequence === activeSession?.currentNodeIndex
          ? currentAddress || getNodeLabel(node, 'Current position')
          : getNodeLabel(node, `Waypoint ${index + 1}`),
        type: node.sequence === activeSession?.currentNodeIndex ? 'current' : 'waypoint',
      })),
      { label: endAddress || 'Destination', type: 'end' },
    ];
    return stops;
  }, [activeSession?.currentNodeIndex, activeSession?.remainingPathNodes, activeSession?.routePath, currentAddress, endAddress, getNodeLabel, startAddress]);

  const handleLogout = () => {
    stopTracking();
    tokenService.clearTokens();
    navigate('/login');
  };

  return (
    <div className="navi-vue-container">
      {/* Ambient Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>

      {/* Map Container with 3D Toggle */}
      <div className="map-3d-wrapper">
        <div className={`map-3d-inner ${!is3D ? 'flat' : ''}`}>
          <MapContainer 
            center={[19.03, 72.87]} 
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas
          >
            <MapInstanceController mapRef={mapRef} watchKey={`${is3D}-${showRightPanel}-${showLayerPanel}`} />
            <MapViewportController points={viewportPoints} />
            <TileLayer
              key={currentLayer}
              url={TILE_URLS[currentLayer]}
              className={`map-tiles map-tiles-${currentLayer}`}
            />
            {/* Start Marker */}
            {startLocation && (
              <Marker position={[startLocation.lat, startLocation.lng]} icon={startIcon}>
                <Popup>
                  <div className="popup-content">
                    <strong>📍 Start Location</strong>
                    <p>{startAddress}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {/* Destination Marker */}
            {endLocation && (
              <Marker position={[endLocation.lat, endLocation.lng]} icon={destinationIcon}>
                <Popup>
                  <div className="popup-content">
                    <strong>🏁 Destination</strong>
                    <p>{endAddress}</p>
                    {displayedEtaSeconds && (
                      <p>ETA: {formatDuration(displayedEtaSeconds)}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
            {/* Live Vehicle Marker with Pulse Animation */}
            {currentPosition && (
              <Marker position={[currentPosition.lat, currentPosition.lng]} icon={vehicleIcon}>
                <Popup>
                  <div className="popup-content">
                    <strong>🚗 Your Position</strong>
                    <p>Speed: {Math.round(displayedSpeedKmh)} km/h</p>
                    <p>Status: {displayedRouteStatus}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {/* Route Path */}
            {previewPath.length > 0 && (
              <>
                <Polyline positions={previewPath} pathOptions={{ color: '#2563eb', weight: 14, opacity: 0.18, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={previewPath} pathOptions={{ color: '#60a5fa', weight: 8, opacity: 0.32, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline
                  positions={previewPath}
                  pathOptions={{
                    color: '#60a5fa',
                    weight: 5,
                    opacity: 0.96,
                    dashArray: '14 10',
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'animated-route-path',
                  }}
                />
                <Polyline
                  positions={previewPath}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    opacity: 0.75,
                    dashArray: '1 14',
                    lineCap: 'round',
                    className: 'route-dot-overlay',
                  }}
                />
                {routeDotPoints.map((point, index) => (
                  <CircleMarker
                    key={`route-dot-${index}`}
                    center={point}
                    radius={3}
                    pathOptions={{ color: '#bfdbfe', weight: 1, fillColor: '#60a5fa', fillOpacity: 0.9, opacity: 0.9 }}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Top Status Bar */}
      <div className="top-bar">
        <div className="search-card glass-effect">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search destination..."
            className="search-input-modern"
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetLocation(false)}
          />
          <div className={`live-indicator ${isLiveActive ? 'active' : trackingEnabled ? 'waiting' : ''}`}>
            <div className="live-dot"></div>
            <span>{displayedRouteStatus}</span>
          </div>
        </div>

        <div className="stats-group">
          <div className="stat-card glass-effect">
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{formatDuration(displayedEtaSeconds)}</div>
              <div className="stat-label">ETA</div>
            </div>
          </div>
          <div className="stat-card glass-effect">
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 19 L19 5"/>
                <path d="M16 21 L21 16"/>
                <path d="M3 8 L8 3"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{displayedRemainingDistance !== undefined ? `${(displayedRemainingDistance / 1000).toFixed(1)} km` : '-'}</div>
              <div className="stat-label">Distance</div>
            </div>
          </div>
        </div>

        <div className="action-buttons-top">
          <button onClick={() => setIs3D(!is3D)} className="action-btn glass-effect" title="Toggle 3D View">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.29 7 12 12 20.71 7"/>
            </svg>
          </button>
          <button onClick={() => setShowRouteTrack((value) => !value)} className={`action-btn glass-effect ${showRouteTrack ? 'active' : ''}`} title="Route Track">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="5" r="2"/>
              <circle cx="18" cy="19" r="2"/>
              <path d="M6 7v3a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v-1"/>
            </svg>
          </button>
          <button onClick={() => setShowRightPanel(!showRightPanel)} className="action-btn glass-effect" title="Route Sessions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <button onClick={() => navigate('/history')} className="action-btn glass-effect" title="Route History">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7"/>
              <path d="M3 3v6h6"/>
              <path d="M12 7v5l3 2"/>
            </svg>
          </button>
          <button onClick={handleLogout} className="action-btn glass-effect danger" title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Left Controls */}
      <div className="left-controls">
        <button onClick={() => mapRef.current?.zoomIn()} className="control-btn glass-effect" title="Zoom In">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button onClick={() => mapRef.current?.zoomOut()} className="control-btn glass-effect" title="Zoom Out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <div className="divider"></div>
        <button onClick={useCurrentLocationAsStart} className="control-btn glass-effect glow-blue" title="My Location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19 12a7 7 0 1 0-14 0"/>
          </svg>
        </button>
        <button onClick={() => setShowLayerPanel(!showLayerPanel)} className="control-btn glass-effect" title="Map Layers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </button>
        <button onClick={() => setShowRouteTrack((value) => !value)} className="control-btn glass-effect" title="Route Track">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="5" r="2"/>
            <circle cx="18" cy="19" r="2"/>
            <path d="M6 7v3a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v-1"/>
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showRouteTrack && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="route-track-panel glass-effect"
          >
            <div className="route-track-header">
              <button type="button" className="route-track-back" onClick={() => setShowRouteTrack(false)} title="Hide route track">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div>
                <span className="route-track-kicker">{planSettings.vehicleType}</span>
                <h3>{activeSession?.sessionName || 'Route Track'}</h3>
                <p>To {endAddress || 'destination'}</p>
              </div>
            </div>
            <div className="route-track-list">
              {routeTrackStops.map((stop, index) => (
                <div key={`${stop.type}-${index}-${stop.label}`} className={`route-track-stop ${stop.type}`}>
                  <div className="track-node"></div>
                  <div className="track-copy">
                    <span>{stop.type === 'current' ? 'Now' : stop.type === 'start' ? 'Start' : stop.type === 'end' ? 'End' : 'Via'}</span>
                    <strong>{stop.label}</strong>
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Panel */}
      <div className={`bottom-panel ${isBottomPanelMinimized ? 'minimized' : ''}`}>
        <div className="nav-card glass-effect glow-blue">
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setIsBottomPanelMinimized((value) => !value)}
            title={isBottomPanelMinimized ? 'Expand panel' : 'Minimize panel'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={isBottomPanelMinimized ? '7 14 12 9 17 14' : '7 10 12 15 17 10'} />
            </svg>
          </button>
          <div className="progress-bar-container">
            <div className="route-progress" style={{ width: `${activeSession?.progressPercentage || 0}%` }}></div>
          </div>

          <div className="nav-content">
            <div className="turn-instruction">
              <div className="turn-icon-modern">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </div>
              <div className="turn-details">
                <div className="turn-meta">
                  <span className="turn-distance">{currentTurn.distance}</span>
                  <span className="turn-street">{currentTurn.street}</span>
                </div>
                <h3 className="turn-text">{currentTurn.instruction}</h3>
              </div>
              <div className="next-turn">
                <div className="next-turn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <span className="next-turn-dist">{nextTurn.distance}</span>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card-modern">
                <div className="metric-value">{Math.round(displayedSpeedKmh)}</div>
                <div className="metric-label">km/h</div>
              </div>
              <div className="metric-card-modern">
                <div className="metric-value">{formatDuration(displayedEtaSeconds)}</div>
                <div className="metric-label">min left</div>
              </div>
              <div className="metric-card-modern">
                <div className="metric-value">{displayedRemainingDistance !== undefined ? `${(displayedRemainingDistance / 1000).toFixed(1)}` : '-'}</div>
                <div className="metric-label">km</div>
              </div>
              <div className="metric-card-modern">
                <div className="metric-value">{displayedRouteStatus}</div>
                <div className="metric-label">Status</div>
              </div>
            </div>

            <div className="nav-buttons">
              <button
                onClick={planRoute}
                disabled={isResolvingRoute || isPlanningRoute || !endAddress.trim()}
                className="nav-btn-secondary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M5 12h14"/>
                  <path d="M13 6l6 6-6 6"/>
                </svg>
                {isResolvingRoute || isPlanningRoute ? 'Planning' : 'Plan'}
              </button>
              <button onClick={() => {
                if (trackingEnabled) {
                  stopTracking();
                } else if (activeSession) {
                  startTracking();
                } else {
                  toast.warn('Plan a route first');
                }
              }} className={`nav-btn-secondary ${trackingEnabled ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                {trackingEnabled ? 'Tracking' : 'Start'}
              </button>
              <button onClick={() => updateSessionStatus('cancel')} className="nav-btn-danger" disabled={!activeSession}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Route Sessions */}
      <AnimatePresence>
        {showRightPanel && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.3 }} className="right-panel glass-effect">
            <div className="panel-header">
              <div>
                <h3>Route Sessions</h3>
                <p>{sessions.length} saved journeys</p>
              </div>
              <button onClick={() => setShowRightPanel(false)} className="close-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="panel-section route-points-section">
              <div className="route-points">
                <div className="point start">
                  <div className="point-dot start"></div>
                  <div className="point-content">
                    <label className="point-label" htmlFor="start-address">From</label>
                    <div className="route-input-row">
                      <input
                        id="start-address"
                        value={startAddress}
                        onChange={(event) => setStartAddress(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && handleSetLocation(true)}
                        className="route-address-input"
                        placeholder="Start location"
                      />
                      <button type="button" className="route-input-btn" onClick={() => handleSetLocation(true)} title="Set start">
                        Set
                      </button>
                    </div>
                  </div>
                </div>
                <div className="point-line"></div>
                <div className="point end">
                  <div className="point-dot end"></div>
                  <div className="point-content">
                    <label className="point-label" htmlFor="end-address">To</label>
                    <div className="route-input-row">
                      <input
                        id="end-address"
                        value={endAddress}
                        onChange={(event) => setEndAddress(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && handleSetLocation(false)}
                        className="route-address-input"
                        placeholder="Destination"
                      />
                      <button type="button" className="route-input-btn" onClick={() => handleSetLocation(false)} title="Set destination">
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-section sessions-list">
              <h4>Recent Sessions</h4>
              <div className="sessions-container">
                {sessions.length === 0 ? (
                  <div className="empty-sessions">
                    <p>No sessions yet</p>
                    <p className="empty-hint">Plan a route to get started</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div key={session.sessionId} className="session-item" onClick={async () => {
                      const loaded = await getSessionDetails(session.sessionId, true);
                      if (loaded) {
                        setSelectedSession(loaded);
                        setShowSessionDialog(true);
                        setShowRightPanel(false);
                        if (!isTerminalRouteStatus(loaded.status)) {
                          await startTracking(true, loaded);
                        }
                      }
                    }}>
                      <div className="session-info">
                        <div className="session-name">{session.sessionName}</div>
                        <div className="session-status">
                          <Tag value={session.status || 'UNKNOWN'} severity={
                            session.status === 'ACTIVE' ? 'success' :
                            session.status === 'PAUSED' ? 'warning' :
                            session.status === 'CANCELLED' ? 'danger' : 'info'
                          } />
                        </div>
                      </div>
                      <div className="session-meta">
                        <span>{session.remainingDistance ? `${(session.remainingDistance / 1000).toFixed(1)} km` : '-'}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel-footer">
              <button onClick={planRoute} disabled={isResolvingRoute || !endAddress.trim()} className="start-nav-btn">
                {isResolvingRoute ? 'Resolving...' : activeSession ? 'Update Route' : 'Plan Route'}
              </button>
              <button onClick={handleLogout} className="auth-panel-btn">
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer Panel */}
      <AnimatePresence>
        {showLayerPanel && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ duration: 0.3 }} className="layer-panel glass-effect">
            <div className="layer-header">
              <h4>Map Style</h4>
              <button onClick={() => setShowLayerPanel(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="layer-options">
              {['dark', 'satellite', 'streets', 'topo'].map((layer) => (
                <button key={layer} className={`layer-option ${currentLayer === layer ? 'active' : ''}`} onClick={() => setCurrentLayer(layer)}>
                  <span>{layer.charAt(0).toUpperCase() + layer.slice(1)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Details Dialog */}
      <Dialog header="Session Insights" visible={showSessionDialog} onHide={() => setShowSessionDialog(false)} style={{ width: '34rem' }} className="custom-dialog">
        {selectedSession ? (
          <div className="session-details">
            <div className="detail-section">
              <h4>Basic Information</h4>
              <div className="detail-row"><span className="detail-label">Session Name</span><span className="detail-value">{selectedSession.sessionName}</span></div>
              <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value status-badge">{selectedSession.status}</span></div>
            </div>
            <div className="detail-section">
              <h4>Location Details</h4>
              <div className="detail-row"><span className="detail-label">Start Location</span><span className="detail-value">{selectedSession.startAddress ?? `${selectedSession.startLat}, ${selectedSession.startLng}`}</span></div>
              <div className="detail-row"><span className="detail-label">Destination</span><span className="detail-value">{selectedSession.destinationAddress ?? `${selectedSession.endLat}, ${selectedSession.endLng}`}</span></div>
            </div>
            <div className="detail-section">
              <h4>Journey Metrics</h4>
              <div className="detail-row"><span className="detail-label">Remaining Distance</span><span className="detail-value">{selectedSession.remainingDistance ? `${selectedSession.remainingDistance} m` : '-'}</span></div>
              <div className="detail-row"><span className="detail-label">ETA</span><span className="detail-value eta-value">{formatDuration(selectedSession.estimatedTimeToDestinationSeconds)}</span></div>
              <div className="detail-row"><span className="detail-label">Progress</span><span className="detail-value">{selectedSession.progressPercentage || 0}%</span></div>
            </div>
            <div className="dialog-footer">
              <Button label="Close" className="btn-secondary" onClick={() => setShowSessionDialog(false)} />
              <Button label="Load Session" className="btn-primary" onClick={async () => {
                if (selectedSession) {
                  const loaded = await getSessionDetails(selectedSession.sessionId, true);
                  if (loaded && !isTerminalRouteStatus(loaded.status)) {
                    await startTracking(true, loaded);
                  }
                  setShowSessionDialog(false);
                }
              }} />
            </div>
          </div>
        ) : (
          <div className="loading-state"><div className="pi pi-spin pi-spinner"></div><p>Loading session details...</p></div>
        )}
      </Dialog>

      {/* Route Plan Settings Dialog */}
      <Dialog header="Route Plan Details" visible={showPlanSettingsDialog} onHide={() => setShowPlanSettingsDialog(false)} style={{ width: '32rem' }} className="custom-dialog">
        <div className="plan-settings">
          <div className="plan-setting-field">
            <label htmlFor="vehicle-type">Vehicle type</label>
            <select
              id="vehicle-type"
              value={planSettings.vehicleType}
              onChange={(event) => setPlanSettings((prev) => ({ ...prev, vehicleType: event.target.value as PlanSettings['vehicleType'] }))}
            >
              <option value="car">Car</option>
              <option value="bike">Bike</option>
              <option value="pedestrian">Pedestrian</option>
            </select>
          </div>
          <div className="plan-setting-field">
            <label htmlFor="threshold-meters">Destination alert distance (meters)</label>
            <input
              id="threshold-meters"
              type="number"
              min="0"
              value={planSettings.destinationThresholdMeters}
              onChange={(event) => setPlanSettings((prev) => ({ ...prev, destinationThresholdMeters: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </div>
          <div className="plan-setting-field">
            <label htmlFor="threshold-seconds">Destination alert time (seconds)</label>
            <input
              id="threshold-seconds"
              type="number"
              min="0"
              value={planSettings.destinationThresholdSeconds}
              onChange={(event) => setPlanSettings((prev) => ({ ...prev, destinationThresholdSeconds: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </div>
        </div>
        <div className="dialog-footer">
          <Button label="Cancel" className="btn-secondary" onClick={() => setShowPlanSettingsDialog(false)} />
          <Button label="Plan Route" className="btn-primary" loading={isPlanningRoute} disabled={isPlanningRoute} onClick={confirmPlanRoute} />
        </div>
      </Dialog>

      {/* Start Tracking Dialog */}
      <Dialog header="Start Live Tracking?" visible={showStartTrackingDialog} onHide={() => setShowStartTrackingDialog(false)} style={{ width: '30rem' }} className="custom-dialog">
        <div className="dialog-content">
          <div className="dialog-icon">📍</div>
          <p>Route planned successfully. Start auto location tracking now?</p>
        </div>
        <div className="dialog-footer">
          <Button label="Later" className="btn-secondary" onClick={() => setShowStartTrackingDialog(false)} />
          <Button label="Start Tracking" className="btn-primary" onClick={async () => { 
            setShowStartTrackingDialog(false); 
            await startTracking();
          }} />
        </div>
      </Dialog>
    </div>
  );
};

export default Dashboard;
