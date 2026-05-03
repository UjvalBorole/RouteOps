import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { ProgressBar } from 'primereact/progressbar';
import { toast } from 'react-toastify';
import axios from 'axios';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import 'leaflet/dist/leaflet.css';
import apiClient from '../utils/apiClient';
import './Dashboard.css';

interface Location {
  lat: number;
  lng: number;
}

interface RouteNode {
  nodeId: number;
  latitude: number;
  longitude: number;
  sequence: number;
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

const ACTIVE_SESSION_ID_KEY = 'route-app.active-session-id';
const TRACKING_ENABLED_KEY = 'route-app.tracking-enabled';

const MapViewportController: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 15, { animate: true, duration: 1.2 });
      return;
    }
    map.flyToBounds(points, {
      animate: true,
      duration: 1.2,
      padding: [40, 40],
      maxZoom: 16,
    });
  }, [map, points]);

  return null;
};

const Dashboard: React.FC = () => {
  const [sessionName, setSessionName] = useState('Daily Commute');
  const [vehicleType, setVehicleType] = useState('');
  const [destinationThresholdMeters, setDestinationThresholdMeters] = useState(0);
  const [destinationThresholdSeconds, setDestinationThresholdSeconds] = useState(0);
  const [startAddress, setStartAddress] = useState('Panvel');
  const [endAddress, setEndAddress] = useState('Kurla');
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [sessions, setSessions] = useState<RouteSession[]>([]);
  const [activeSession, setActiveSession] = useState<RouteSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showStartTrackingDialog, setShowStartTrackingDialog] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(35);
  const [accuracyMeters, setAccuracyMeters] = useState(10);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(() => localStorage.getItem(TRACKING_ENABLED_KEY) === 'true');
  const [isEditingNewRoute, setIsEditingNewRoute] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const watchRef = useRef<number | null>(null);
  const currentCoordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const activeSessionIdRef = useRef<string | null>(null);
  const speedRef = useRef<number>(35);
  const accuracyRef = useRef<number>(10);
  const lastSubmittedPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  useEffect(() => {
    currentCoordsRef.current = { lat: currentLat, lng: currentLng };
  }, [currentLat, currentLng]);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.sessionId ?? null;
  }, [activeSession?.sessionId]);

  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  useEffect(() => {
    accuracyRef.current = accuracyMeters;
  }, [accuracyMeters]);

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

    // Supports "lat,lng" or "lat lng" formats.
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
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'jsonv2', limit: 5, countrycodes: 'in' },
      timeout: 12000,
    });
    const best = response.data?.[0];
    if (!best) return null;
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
  };

  const geocodeWithNominatimNoCountry = async (query: string): Promise<Location | null> => {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'jsonv2', limit: 5 },
      timeout: 12000,
    });
    const best = response.data?.[0];
    if (!best) return null;
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
  };

  const buildReducedQueries = (rawAddress: string): string[] => {
    const parts = rawAddress
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    const reduced: string[] = [];
    if (parts.length >= 3) reduced.push(parts.slice(-3).join(', '));
    if (parts.length >= 2) reduced.push(parts.slice(-2).join(', '));
    if (parts.length >= 1) reduced.push(parts[parts.length - 1]);
    return Array.from(new Set(reduced));
  };

  const geocodeWithPhoton = async (query: string): Promise<Location | null> => {
    const response = await axios.get('https://photon.komoot.io/api/', { params: { q: query, limit: 3 }, timeout: 12000 });
    const feature = response.data?.features?.[0];
    if (!feature?.geometry?.coordinates) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  };

  const geocodeAddress = async (address: string): Promise<Location | null> => {
    const coordinateValue = parseCoordinatesFromText(address);
    if (coordinateValue) return coordinateValue;

    const queries = normalizeAddress(address);
    for (const query of queries) {
      try {
        const result = await geocodeWithNominatim(query);
        if (result) return result;
      } catch {
        // continue fallback
      }
    }
    for (const query of queries) {
      try {
        const result = await geocodeWithPhoton(query);
        if (result) return result;
      } catch {
        // continue fallback
      }
    }
    // Broader fallback without country lock.
    for (const query of queries) {
      try {
        const result = await geocodeWithNominatimNoCountry(query);
        if (result) return result;
      } catch {
        // continue fallback
      }
    }

    // Last fallback: reduce long address to city/area chunks.
    const reducedQueries = buildReducedQueries(address);
    for (const query of reducedQueries) {
      try {
        const result = await geocodeWithNominatimNoCountry(query);
        if (result) return result;
      } catch {
        // continue fallback
      }
    }

    return null;
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'jsonv2' },
        timeout: 12000,
      });
      return response.data?.display_name ?? null;
    } catch {
      return null;
    }
  };

  const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const earthRadius = 6_371_000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
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

  const fetchSessions = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/routes');
      setSessions(response.data ?? []);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    }
  }, []);

  const hydrateSessionContext = useCallback((session: RouteSession) => {
    setSessionName(session.sessionName || 'Live Session');
    setStartAddress(session.startAddress ?? `${session.startLat}, ${session.startLng}`);
    setEndAddress(session.destinationAddress ?? `${session.endLat}, ${session.endLng}`);
    setStartLocation({ lat: session.startLat, lng: session.startLng });
    setEndLocation({ lat: session.endLat, lng: session.endLng });
    if (session.currentLat !== undefined && session.currentLng !== undefined) {
      setCurrentLat(session.currentLat);
      setCurrentLng(session.currentLng);
    }
  }, []);

  const getSessionDetails = useCallback(async (sessionId: string, showToast = false): Promise<RouteSession | null> => {
    try {
      const response = await apiClient.get(`/api/routes/${sessionId}`);
      const session = response.data as RouteSession;
      setActiveSession(session);
      hydrateSessionContext(session);
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
      if (showToast) toast.success('Session loaded.');
      return session;
    } catch (error) {
      if (showToast) toast.error('Failed to fetch session details.');
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
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = { lat: position.coords.latitude, lng: position.coords.longitude };
        setStartLocation(detected);
        setCurrentLat(detected.lat);
        setCurrentLng(detected.lng);
        const address = await reverseGeocode(detected.lat, detected.lng);
        if (address) setStartAddress(address);
        setDetectingGps(false);
      },
      () => setDetectingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [startLocation]);

  const handleSetLocation = async (isStart: boolean) => {
    const address = isStart ? startAddress : endAddress;
    if (!address.trim()) {
      toast.warn('Please enter an address.');
      return;
    }
    setLoading(true);
    const location = await geocodeAddress(address);
    setLoading(false);
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

  const useCurrentLocationAsStart = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = { lat: position.coords.latitude, lng: position.coords.longitude };
        setStartLocation(detected);
        setCurrentLat(detected.lat);
        setCurrentLng(detected.lng);
        const address = await reverseGeocode(detected.lat, detected.lng);
        if (address) setStartAddress(address);
        setIsEditingNewRoute(true);
        toast.success('Using current GPS location as start.');
        setDetectingGps(false);
      },
      () => {
        toast.error('Unable to access GPS/location permission.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const sendLocationUpdate = useCallback(async (silent = false) => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId) return;

    const lat = currentCoordsRef.current.lat ?? activeSession?.currentLat ?? startLocation?.lat ?? null;
    const lng = currentCoordsRef.current.lng ?? activeSession?.currentLng ?? startLocation?.lng ?? null;
    if (lat === null || lng === null) return;

    const nowMs = Date.now();
    let computedSpeedKmh = speedRef.current;
    const previousPosition = lastSubmittedPositionRef.current;
    if (previousPosition) {
      const distanceMeters = calculateDistanceMeters(previousPosition.lat, previousPosition.lng, lat, lng);
      const timeSeconds = Math.max(1, Math.round((nowMs - previousPosition.timestamp) / 1000));
      computedSpeedKmh = Math.max(0, (distanceMeters / timeSeconds) * 3.6);
    }

    try {
      const response = await apiClient.post('/api/routes/location', {
        sessionId,
        latitude: lat,
        longitude: lng,
        speedKmh: computedSpeedKmh,
        accuracyMeters: accuracyRef.current,
      });
      const updated = response.data as RouteSession;
      lastSubmittedPositionRef.current = { lat, lng, timestamp: nowMs };
      setActiveSession(updated);
      setSessions((prev) => prev.map((item) => (item.sessionId === updated.sessionId ? { ...item, ...updated } : item)));
      if (updated.status === 'CANCELLED' || updated.status === 'COMPLETED' || updated.status === 'REACHED') {
        setTrackingEnabled(false);
        localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
        if (intervalRef.current) {
          window.clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        if (watchRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      }
      if (!silent) toast.success('Location sent successfully.');
    } catch (error) {
      if (!silent) toast.error('Failed to send live location.');
    }
  }, [activeSession?.currentLat, activeSession?.currentLng, startLocation?.lat, startLocation?.lng]);

  const clearTrackingTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const scheduleNextTrackingPing = useCallback(() => {
    clearTrackingTimer();
    const randomDelayMs = Math.floor((30 + Math.random() * 30) * 1000); // 30-60 sec
    intervalRef.current = window.setTimeout(async () => {
      await sendLocationUpdate(true);
      if (trackingEnabled && activeSessionIdRef.current) {
        scheduleNextTrackingPing();
      }
    }, randomDelayMs);
  }, [clearTrackingTimer, sendLocationUpdate, trackingEnabled]);

  const stopTracking = useCallback(() => {
    setTrackingEnabled(false);
    localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
    clearTrackingTimer();
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, [clearTrackingTimer]);

  const startTracking = useCallback(async (silent = false) => {
    if (!activeSession?.sessionId) {
      if (!silent) toast.warn('Plan/select a route session first.');
      return;
    }
    setTrackingEnabled(true);
    localStorage.setItem(TRACKING_ENABLED_KEY, 'true');

    if (navigator.geolocation && watchRef.current === null) {
      watchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
          setAccuracyMeters(position.coords.accuracy);
          if (position.coords.speed !== null && Number.isFinite(position.coords.speed)) {
            setSpeedKmh(Math.max(0, position.coords.speed * 3.6));
          }
        },
        () => {
          // keep manual coordinates fallback
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    await sendLocationUpdate(true);
    scheduleNextTrackingPing();
    if (!silent) toast.success('Live tracking started. Auto update every 30-60s.');
  }, [activeSession?.sessionId, scheduleNextTrackingPing, sendLocationUpdate]);

  useEffect(() => {
    if (trackingEnabled && activeSession?.sessionId) {
      startTracking(true);
    }
  }, [activeSession?.sessionId, startTracking, trackingEnabled]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearTimeout(intervalRef.current);
      if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const planRoute = async () => {
    console.log('Planning route with:', { startLocation, endLocation, startAddress, endAddress, vehicleType, sessionName, destinationThresholdMeters, destinationThresholdSeconds });
    if (!startLocation || !endLocation) {
      toast.warn('Set both start and destination first.');
      return;
    }

    try {
      const response = await apiClient.post('/api/routes/plan', {
        startLat: startLocation.lat,
        startLng: startLocation.lng,
        endLat: endLocation.lat,
        endLng: endLocation.lng,
        startAddress,
        destinationAddress: endAddress,
        vehicleType,
        sessionName,
        destinationThresholdMeters,
        destinationThresholdSeconds,
      });
      const planned = response.data as RouteSession;
      setActiveSession(planned);
      setIsEditingNewRoute(false);
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, planned.sessionId);

      // As requested: make one immediate location update after route planning.
      // This refreshes the live route/status based on current user position.
      // const initialLat = currentCoordsRef.current.lat ?? startLocation.lat;
      // const initialLng = currentCoordsRef.current.lng ?? startLocation.lng;
      // if (initialLat !== null && initialLng !== null) {
      //   try {
      //     const liveResponse = await apiClient.post('/api/routes/location', {
      //       sessionId: planned.sessionId,
      //       latitude: initialLat,
      //       longitude: initialLng,
      //       speedKmh,
      //       accuracyMeters,
      //     });
      //     const updatedSession = liveResponse.data as RouteSession;
      //     setActiveSession(updatedSession);
      //     hydrateSessionContext(updatedSession);
      //   } catch (locationError) {
      //     console.error('Initial location update failed:', locationError);
      //   }
      // }

      setShowStartTrackingDialog(true);
      toast.success('Route planned. Ready to start tracking.');
      await fetchSessions();
    } catch {
      toast.error('Failed to plan route.');
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

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.body.classList.toggle('dark-mode');
  };

  const statusTemplate = (rowData: RouteSession) => {
    const statusColors: { [key: string]: 'success' | 'warning' | 'danger' | 'info' } = {
      ACTIVE: 'success',
      PAUSED: 'warning',
      CANCELLED: 'danger',
      COMPLETED: 'success',
    };
    return <Tag value={rowData.status ?? 'UNKNOWN'} severity={statusColors[rowData.status ?? ''] || 'info'} />;
  };

  const mapPath = useMemo(() => {
    if (isEditingNewRoute) {
      return [];
    }
    const path = activeSession?.remainingPathNodes ?? activeSession?.routePath ?? [];
    return path.map((node) => [node.latitude, node.longitude] as [number, number]);
  }, [activeSession, isEditingNewRoute]);

  const previewPath = useMemo(() => {
    if (mapPath.length > 1) return mapPath;
    if (startLocation && endLocation) {
      return [
        [startLocation.lat, startLocation.lng] as [number, number],
        [endLocation.lat, endLocation.lng] as [number, number],
      ];
    }
    return [];
  }, [endLocation, mapPath, startLocation]);

  const viewportPoints = useMemo(() => {
    if (previewPath.length > 1) return previewPath;
    const points: Array<[number, number]> = [];
    if (startLocation) points.push([startLocation.lat, startLocation.lng]);
    if (endLocation) points.push([endLocation.lat, endLocation.lng]);
    return points;
  }, [previewPath, startLocation, endLocation]);

  return (
    <motion.div
      className="dashboard-container route-app-animate"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="dashboard-wrapper">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="booking-card route-card-glow">
          <div className="card-header">
            <h2 className="card-title">Smart Route Control</h2>
            <Button icon={darkMode ? 'pi pi-sun' : 'pi pi-moon'} rounded text onClick={toggleDarkMode} className="theme-toggle" />
          </div>
          <Divider />

          <div className="address-section">
            <div className="address-input-group">
              <div className="address-input-field">
                <label htmlFor="startAddress" className="input-label">From</label>
                <div className="input-wrapper">
                  <InputText id="startAddress" value={startAddress} onChange={(e) => setStartAddress(e.target.value)} className="address-input" />
                  <Button icon="pi pi-check" onClick={() => handleSetLocation(true)} loading={loading} className="set-location-btn" />
                  <Button icon="pi pi-compass" onClick={useCurrentLocationAsStart} loading={detectingGps} className="set-location-btn" tooltip="Use current GPS location" />
                </div>
              </div>
              <div className="address-input-field">
                <label htmlFor="endAddress" className="input-label">To</label>
                <div className="input-wrapper">
                  <InputText id="endAddress" value={endAddress} onChange={(e) => setEndAddress(e.target.value)} className="address-input" />
                  <Button icon="pi pi-check" onClick={() => handleSetLocation(false)} loading={loading} className="set-location-btn" />
                </div>
              </div>
            </div>

            <div className="address-input-group">
              <div className="address-input-field">
                <label className="input-label">Session Name</label>
                <InputText value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
              </div>
              <div className="address-input-field">
                <label className="input-label">Vehicle Type</label>
                <InputText value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
              </div>
              <div className="address-input-field">
                <label className="input-label">Threshold (m)</label>
                <InputNumber value={destinationThresholdMeters} onValueChange={(e) => setDestinationThresholdMeters(e.value ?? 80)} />
              </div>
              <div className="address-input-field">
                <label className="input-label">Threshold (sec)</label>
                <InputNumber value={destinationThresholdSeconds} onValueChange={(e) => setDestinationThresholdSeconds(e.value ?? 0)} />
              </div>
            </div>

            <div className="map-section">
              <div className="map-container">
                <MapContainer center={[19.03, 72.87]} zoom={12} style={{ height: '100%' }}>
                  <MapViewportController points={viewportPoints} />
                  <TileLayer
                    className={darkMode ? 'google-like-dark-tiles' : 'google-like-light-tiles'}
                    url={
                      darkMode
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                    }
                  />
                  {startLocation && (
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
                      <Popup>Start</Popup>
                    </CircleMarker>
                  )}
                  {startLocation && (
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
                      <Popup>Start</Popup>
                    </CircleMarker>
                  )}
                  {endLocation && (
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
                  )}
                  {endLocation && (
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
                  )}
                  {activeSession?.currentLat && activeSession?.currentLng && (
                    <CircleMarker
                      center={[activeSession.currentLat, activeSession.currentLng]}
                      radius={11}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 3,
                        fillColor: '#1a73e8',
                        fillOpacity: 1,
                        className: 'pulse-marker-live',
                      }}
                    >
                      <Popup>Your live position</Popup>
                    </CircleMarker>
                  )}
                  {previewPath.length > 0 && (
                    <>
                      <Polyline positions={previewPath} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }} />
                      <Polyline
                        positions={previewPath}
                        pathOptions={{
                          color: '#4285f4',
                          weight: 6,
                          opacity: 0.96,
                          dashArray: activeSession ? undefined : '6, 10',
                          lineCap: 'round',
                          className: 'animated-route-path',
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="action-buttons">
              <Button label="Plan Route" icon="pi pi-directions" onClick={planRoute} disabled={!startLocation || !endLocation} className="btn-primary" />
              <Button
                label={trackingEnabled ? 'Tracking ON' : 'Start Tracking'}
                icon={trackingEnabled ? 'pi pi-spin pi-sync' : 'pi pi-play'}
                onClick={() => {
                  if (trackingEnabled) {
                    stopTracking();
                  } else {
                    startTracking();
                  }
                }}
                disabled={!activeSession}
                className="btn-primary"
              />
              <Button label="Send Now" icon="pi pi-send" onClick={() => sendLocationUpdate(false)} disabled={!activeSession} className="btn-secondary" />
              <Button
                label="Pause"
                icon="pi pi-pause"
                onClick={() => updateSessionStatus('pause')}
                disabled={!activeSession || activeSession.status === 'PAUSED' || activeSession.status === 'CANCELLED' || activeSession.status === 'COMPLETED' || activeSession.status === 'REACHED'}
                className="btn-secondary"
              />
              <Button
                label="Resume"
                icon="pi pi-play"
                onClick={() => updateSessionStatus('resume')}
                disabled={!activeSession || activeSession.status === 'CANCELLED' || activeSession.status === 'COMPLETED' || activeSession.status === 'REACHED'}
                className="btn-primary"
              />
              <Button
                label="Cancel"
                icon="pi pi-times"
                onClick={() => updateSessionStatus('cancel')}
                disabled={!activeSession || activeSession.status === 'CANCELLED' || activeSession.status === 'COMPLETED' || activeSession.status === 'REACHED'}
                className="btn-danger"
              />
            </div>

            {!activeSession && (
              <div className="route-lottie-wrap">
                <DotLottieReact
                  src="https://lottie.host/0fdbd8e4-8c2d-4dc5-9bb8-6d4f6e8c6928/5e3fhqpQwR.lottie"
                  loop
                  autoplay
                  style={{ width: 180, height: 180 }}
                />
                <p className="lottie-text">Set locations to begin live navigation.</p>
              </div>
            )}
          </div>
        </Card>
        </motion.div>
 {activeSession && (
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="orders-card route-card-glow">
            <div className="card-header">
              <h2 className="card-title">Live Navigation Status</h2>
              <Tag value={trackingEnabled ? 'AUTO TRACKING' : 'MANUAL MODE'} severity={trackingEnabled ? 'success' : 'warning'} />
            </div>
            <Divider />
            <div className="detail-row"><span className="detail-label">Session</span><span className="detail-value">{activeSession.sessionName} ({activeSession.sessionId})</span></div>
            <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{activeSession.status ?? '-'}</span></div>
            <div className="detail-row"><span className="detail-label">Next Instruction</span><span className="detail-value">{activeSession.nextInstruction ?? 'Move towards route path'}</span></div>
            <div className="detail-row"><span className="detail-label">Current Position</span><span className="detail-value">{activeSession.currentLat ?? '-'}, {activeSession.currentLng ?? '-'}</span></div>
            {/* <div className="detail-row"><span className="detail-label">Current Speed</span><span className="detail-value">{activeSession.currentSpeedKmh !== null ? `${activeSession.currentSpeedKmh.toFixed(2)} km/h` : '-'}</span></div> */}
            {/* <div className="detail-row"><span className="detail-label">Last Segment</span><span className="detail-value">{activeSession.lastSegmentDistanceMeters !== undefined ? `${activeSession.lastSegmentDistanceMeters.toFixed(1)} m in ${formatDuration(activeSession.lastSegmentDurationSeconds)}` : '-'}</span></div> */}
            <div className="detail-row"><span className="detail-label">ETA</span><span className="detail-value">{formatDuration(activeSession.estimatedTimeToDestinationSeconds)}</span></div>
            <div className="detail-row"><span className="detail-label">On Route</span><span className="detail-value">{String(activeSession.onRoute ?? false)}</span></div>
            <ProgressBar value={activeSession.progressPercentage ?? 0} />
          </Card>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <Card className="orders-card route-card-glow">
          <div className="card-header">
            <h2 className="card-title">Route Sessions</h2>
            <Tag value={`${sessions.length} total`} rounded />
          </div>
          <Divider />
          <div className="orders-table-wrapper">
            <DataTable value={sessions} paginator rows={6} responsiveLayout="scroll" className="orders-table">
              <Column field="sessionName" header="Name" />
              <Column field="status" header="Status" body={statusTemplate} />
              <Column field="remainingDistance" header="Remaining (m)" />
              <Column
                header="Action"
                body={(rowData: RouteSession) => (
                  <Button
                    label="View Live"
                    icon="pi pi-bolt"
                    text
                    onClick={async () => {
                      const session = await getSessionDetails(rowData.sessionId, true);
                      if (session) {
                        setIsEditingNewRoute(false);
                        hydrateSessionContext(session);
                        setSelectedSession(session);
                        setShowSessionDialog(true);
                      }
                    }}
                  />
                )}
              />
            </DataTable>
          </div>
        </Card>
        </motion.div>

       
      </div>

      <Dialog
        header="Start Live Tracking?"
        visible={showStartTrackingDialog}
        onHide={() => setShowStartTrackingDialog(false)}
        style={{ width: '30rem' }}
      >
        <p>Route planned successfully. Start auto location tracking now?</p>
        <div className="dialog-footer">
          <Button label="Later" className="btn-secondary" onClick={() => setShowStartTrackingDialog(false)} />
          <Button label="Start Tracking" className="btn-primary" onClick={async () => {
            setShowStartTrackingDialog(false);
            await startTracking();
          }} />
        </div>
      </Dialog>

      <Dialog
        header="Session Insights"
        visible={showSessionDialog}
        onHide={() => setShowSessionDialog(false)}
        style={{ width: '34rem' }}
      >
        {selectedSession ? (
          <div>
            <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{selectedSession.sessionName}</span></div>
            <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{selectedSession.status}</span></div>
            <div className="detail-row"><span className="detail-label">Start</span><span className="detail-value">{selectedSession.startAddress ?? `${selectedSession.startLat}, ${selectedSession.startLng}`}</span></div>
            <div className="detail-row"><span className="detail-label">Destination</span><span className="detail-value">{selectedSession.destinationAddress ?? `${selectedSession.endLat}, ${selectedSession.endLng}`}</span></div>
            <div className="detail-row"><span className="detail-label">Remaining</span><span className="detail-value">{selectedSession.remainingDistance ?? '-'}</span></div>
            <div className="detail-row"><span className="detail-label">ETA</span><span className="detail-value">{formatDuration(selectedSession.estimatedTimeToDestinationSeconds)}</span></div>
          </div>
        ) : (
          <p>Loading session details...</p>
        )}
      </Dialog>
    </motion.div>
  );
};

export default Dashboard;
