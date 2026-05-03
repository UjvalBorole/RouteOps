/**
 * Dashboard Component (Refactored)
 * Main component that orchestrates all route planning and tracking features
 * 
 * Features:
 * - Plan new routes with address/coordinate inputs
 * - Automatic and manual location tracking
 * - Real-time navigation updates
 * - Session management
 * - Interactive map visualization
 * 
 * Architecture:
 * - Uses modular sub-components for better maintainability
 * - Separate service layers for API, geocoding, and tracking
 * - Commented for easy understanding
 * - No pause/resume logic (as requested)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Import components
import AddressInputSection from './AddressInputSection';
import RouteSettingsSection from './RouteSettingsSection';
import MapSection from './MapSection';
import ActionButtonsSection from './ActionButtonsSection';
import SessionsTableSection from './SessionsTableSection';
import LiveNavigationStatusSection from './LiveNavigationStatusSection';
import StartTrackingDialog from './StartTrackingDialog';
import SessionDetailsDialog from './SessionDetailsDialog';

// Import types and services
import { Location, RouteSession } from './types';
import {
  geocodeAddress,
  reverseGeocode,
} from './geocodingService';
import { calculateDistanceMeters } from './mapUtils';
import {
  fetchSessions,
  getSessionDetails,
  planRoute,
  sendLocationUpdate,
  cancelSession,
} from './routeApiService';

// Import styling
import './styles/Dashboard.css';

// Local storage keys for persisting user preferences
const ACTIVE_SESSION_ID_KEY = 'route-app.active-session-id';
const TRACKING_ENABLED_KEY = 'route-app.tracking-enabled';

/**
 * Dashboard Component
 * Main container for route planning and live navigation
 */
const Dashboard: React.FC = () => {
  // ==================== STATE MANAGEMENT ====================
  
  // Route location and address state
  const [startAddress, setStartAddress] = useState('Panvel');
  const [endAddress, setEndAddress] = useState('Kurla');
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);

  // Route configuration state
  const [sessionName, setSessionName] = useState('Daily Commute');
  const [vehicleType, setVehicleType] = useState('car');
  const [destinationThresholdMeters, setDestinationThresholdMeters] = useState(80);
  const [destinationThresholdSeconds, setDestinationThresholdSeconds] = useState(0);

  // Current position and tracking state
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState(35);
  const [accuracyMeters, setAccuracyMeters] = useState(10);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(
    () => localStorage.getItem(TRACKING_ENABLED_KEY) === 'true'
  );

  // Session and dialog state
  const [sessions, setSessions] = useState<RouteSession[]>([]);
  const [activeSession, setActiveSession] = useState<RouteSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);
  const [showStartTrackingDialog, setShowStartTrackingDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // Loading and UI state
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isEditingNewRoute, setIsEditingNewRoute] = useState(false);

  // ==================== REFS FOR TRACKING ====================
  
  // Interval ref for periodic location updates
  const intervalRef = useRef<number | null>(null);
  
  // GPS watch ref for continuous position tracking
  const watchRef = useRef<number | null>(null);
  
  // Current coordinates tracking
  const currentCoordsRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  
  // Active session ID ref for tracking context
  const activeSessionIdRef = useRef<string | null>(null);
  
  // Speed ref for location updates
  const speedRef = useRef<number>(35);
  
  // Accuracy ref for location updates
  const accuracyRef = useRef<number>(10);
  
  // Previous position for speed calculation
  const lastSubmittedPositionRef = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);

  // ==================== EFFECTS ====================

  /**
   * Sync current coordinates to ref for async operations
   */
  useEffect(() => {
    currentCoordsRef.current = { lat: currentLat, lng: currentLng };
  }, [currentLat, currentLng]);

  /**
   * Sync active session ID to ref for async operations
   */
  useEffect(() => {
    activeSessionIdRef.current = activeSession?.sessionId ?? null;
  }, [activeSession?.sessionId]);

  /**
   * Sync speed to ref for async operations
   */
  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  /**
   * Sync accuracy to ref for async operations
   */
  useEffect(() => {
    accuracyRef.current = accuracyMeters;
  }, [accuracyMeters]);

  /**
   * Load sessions on component mount
   */
  useEffect(() => {
    const loadInitialData = async () => {
      const allSessions = await fetchSessions();
      setSessions(allSessions);

      // Restore previously active session if available
      const savedId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
      if (savedId) {
        const session = await getSessionDetails(savedId);
        if (session) {
          setActiveSession(session);
          hydrateSessionContext(session);
        }
      }
    };

    loadInitialData();
  }, []);

  /**
   * Detect GPS location on first load if not already set
   */
  useEffect(() => {
    if (!navigator.geolocation || startLocation) return;

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setStartLocation(detected);
        setCurrentLat(detected.lat);
        setCurrentLng(detected.lng);

        // Reverse geocode to get address
        const address = await reverseGeocode(detected.lat, detected.lng);
        if (address) setStartAddress(address);

        setDetectingGps(false);
      },
      () => setDetectingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [startLocation]);

  /**
   * Handle tracking state changes
   */
  useEffect(() => {
    if (trackingEnabled && activeSession?.sessionId) {
      startTrackingSession();
    }
  }, [activeSession?.sessionId, trackingEnabled]);

  /**
   * Cleanup tracking resources on unmount
   */
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // ==================== CALLBACK FUNCTIONS ====================

  /**
   * Hydrate UI state from session data
   */
  const hydrateSessionContext = useCallback((session: RouteSession) => {
    setSessionName(session.sessionName || 'Live Session');
    setStartAddress(
      session.startAddress ?? `${session.startLat}, ${session.startLng}`
    );
    setEndAddress(
      session.destinationAddress ?? `${session.endLat}, ${session.endLng}`
    );
    setStartLocation({ lat: session.startLat, lng: session.startLng });
    setEndLocation({ lat: session.endLat, lng: session.endLng });

    if (session.currentLat !== undefined && session.currentLng !== undefined) {
      setCurrentLat(session.currentLat);
      setCurrentLng(session.currentLng);
    }
  }, []);

  /**
   * Handle address validation and geocoding
   */
  const handleSetLocation = async (isStart: boolean) => {
    const address = isStart ? startAddress : endAddress;

    if (!address.trim()) {
      toast.warn('Please enter an address.');
      return;
    }

    setLoading(true);
    try {
      const location = await geocodeAddress(address);

      if (!location) {
        toast.error('Address not detected. Try adding landmark/city.');
        setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  /**
   * Use current GPS location as start point
   */
  const useCurrentLocationAsStart = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported.');
      return;
    }

    setDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setStartLocation(detected);
        setCurrentLat(detected.lat);
        setCurrentLng(detected.lng);

        // Reverse geocode to get address
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

  /**
   * Plan a new route with current locations
   */
  const handlePlanRoute = async () => {
    if (!startLocation || !endLocation) {
      toast.warn('Set both start and destination first.');
      return;
    }

    try {
      const planned = await planRoute({
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

      if (!planned) {
        toast.error('Failed to plan route.');
        return;
      }

      // Set as active session
      setActiveSession(planned);
      setIsEditingNewRoute(false);
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, planned.sessionId);

      // Send initial location update
      const initialLat =
        currentCoordsRef.current.lat ??
        startLocation.lat ?? null;
      const initialLng =
        currentCoordsRef.current.lng ??
        startLocation.lng ?? null;

      if (initialLat !== null && initialLng !== null) {
        try {
          const updated = await sendLocationUpdate({
            sessionId: planned.sessionId,
            latitude: initialLat,
            longitude: initialLng,
            speedKmh,
            accuracyMeters,
          });

          if (updated) {
            setActiveSession(updated);
            hydrateSessionContext(updated);
          }
        } catch (error) {
          console.error('Initial location update failed:', error);
        }
      }

      // Show tracking dialog
      setShowStartTrackingDialog(true);
      toast.success('Route planned. Ready to start tracking.');

      // Refresh sessions list
      const updatedSessions = await fetchSessions();
      setSessions(updatedSessions);
    } catch (error) {
      toast.error('Failed to plan route.');
    }
  };

  /**
   * Send location update to backend
   */
  const handleSendLocationUpdate = async (silent = false) => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId) return;

    const lat = currentCoordsRef.current.lat ?? startLocation?.lat;
    const lng = currentCoordsRef.current.lng ?? startLocation?.lng;

    if (lat === null || lat === undefined || lng === null || lng === undefined) return;

    const nowMs = Date.now();
    let computedSpeedKmh = speedRef.current;

    // Calculate speed from distance if we have previous position
    const previousPosition = lastSubmittedPositionRef.current;
    if (previousPosition) {
      const distanceMeters = calculateDistanceMeters(
        previousPosition.lat,
        previousPosition.lng,
        lat,
        lng
      );
      const timeSeconds = Math.max(
        1,
        Math.round((nowMs - previousPosition.timestamp) / 1000)
      );
      computedSpeedKmh = Math.max(0, (distanceMeters / timeSeconds) * 3.6);
    }

    try {
      const updated = await sendLocationUpdate({
        sessionId,
        latitude: lat,
        longitude: lng,
        speedKmh: computedSpeedKmh,
        accuracyMeters: accuracyRef.current,
      });

      if (updated) {
        lastSubmittedPositionRef.current = {
          lat,
          lng,
          timestamp: nowMs,
        };

        setActiveSession(updated);
        setSessions((prev) =>
          prev.map((item) =>
            item.sessionId === updated.sessionId
              ? { ...item, ...updated }
              : item
          )
        );

        // Stop tracking if journey completed
        if (
          updated.status === 'CANCELLED' ||
          updated.status === 'COMPLETED' ||
          updated.status === 'REACHED'
        ) {
          stopTracking();
        }

        if (!silent) toast.success('Location sent successfully.');
      }
    } catch (error) {
      if (!silent) toast.error('Failed to send live location.');
    }
  };

  /**
   * Clear the tracking timer
   */
  const clearTrackingTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Schedule next periodic location update
   */
  const scheduleNextTrackingPing = useCallback(() => {
    clearTrackingTimer();

    // Random delay between 30-60 seconds
    const randomDelayMs = Math.floor((30 + Math.random() * 30) * 1000);

    intervalRef.current = window.setTimeout(async () => {
      await handleSendLocationUpdate(true);

      if (trackingEnabled && activeSessionIdRef.current) {
        scheduleNextTrackingPing();
      }
    }, randomDelayMs);
  }, [clearTrackingTimer, trackingEnabled]);

  /**
   * Stop all tracking activities
   */
  const stopTracking = useCallback(() => {
    setTrackingEnabled(false);
    localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
    clearTrackingTimer();

    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, [clearTrackingTimer]);

  /**
   * Start GPS tracking session
   */
  const startTrackingSession = useCallback(async () => {
    if (!activeSession?.sessionId) {
      toast.warn('Plan/select a route session first.');
      return;
    }

    setTrackingEnabled(true);
    localStorage.setItem(TRACKING_ENABLED_KEY, 'true');

    // Start GPS watch for continuous position updates
    if (navigator.geolocation && watchRef.current === null) {
      // Listen for position changes
      watchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
          setAccuracyMeters(position.coords.accuracy ?? 10);

          if (
            position.coords.speed !== null &&
            Number.isFinite(position.coords.speed)
          ) {
            setSpeedKmh(Math.max(0, position.coords.speed * 3.6));
          }
        },
        () => {
          // Fallback to manual coordinates
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      ) as number;
    }

    // Send initial location update
    await handleSendLocationUpdate(true);

    // Schedule periodic updates
    scheduleNextTrackingPing();
    toast.success('Live tracking started. Auto update every 30-60s.');
  }, [activeSession?.sessionId, scheduleNextTrackingPing]);

  /**
   * Toggle tracking on/off
   */
  const handleToggleTracking = () => {
    if (trackingEnabled) {
      stopTracking();
      toast.info('Live tracking stopped.');
    } else {
      startTrackingSession();
    }
  };

  /**
   * Cancel active session
   */
  const handleCancelSession = async () => {
    if (!activeSession?.sessionId) return;

    try {
      const cancelled = await cancelSession(activeSession.sessionId);

      if (cancelled) {
        setActiveSession(cancelled);
        setSessions((prev) =>
          prev.map((item) =>
            item.sessionId === cancelled.sessionId
              ? { ...item, ...cancelled }
              : item
          )
        );

        stopTracking();
        localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
        toast.success('Session cancelled successfully.');
      }
    } catch (error) {
      toast.error('Failed to cancel session.');
    }
  };

  /**
   * Load session details from list
   */
  const handleLoadSessionFromList = async (session: RouteSession) => {
    const details = await getSessionDetails(session.sessionId);

    if (details) {
      setIsEditingNewRoute(false);
      hydrateSessionContext(details);
      setSelectedSession(details);
      setShowSessionDialog(true);
    }
  };

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.body.classList.toggle('dark-mode');
  };

  // ==================== COMPUTED VALUES ====================

  /**
   * Compute map path from active session
   */
  const mapPath = useMemo(() => {
    if (isEditingNewRoute) return [];

    const path = activeSession?.remainingPathNodes ?? activeSession?.routePath ?? [];
    return path.map((node) => [node.latitude, node.longitude] as [number, number]);
  }, [activeSession, isEditingNewRoute]);

  /**
   * Compute preview path (either from route or start/end points)
   */
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

  /**
   * Compute viewport points for map auto-fit
   */
  const viewportPoints = useMemo(() => {
    if (previewPath.length > 1) return previewPath;

    const points: Array<[number, number]> = [];

    if (startLocation) points.push([startLocation.lat, startLocation.lng]);
    if (endLocation) points.push([endLocation.lat, endLocation.lng]);

    return points;
  }, [previewPath, startLocation, endLocation]);

  // ==================== RENDER ====================

  return (
    <motion.div
      className="dashboard-container route-app-animate"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="dashboard-wrapper">
        {/* Main booking/planning card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="booking-card route-card-glow">
            {/* Header with title and dark mode toggle */}
            <div className="card-header">
              <h2 className="card-title">Smart Route Control</h2>
              <Button
                icon={darkMode ? 'pi pi-sun' : 'pi pi-moon'}
                rounded
                text
                onClick={toggleDarkMode}
                className="theme-toggle"
                tooltip={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              />
            </div>
            <Divider />

            {/* Address input fields */}
            <AddressInputSection
              startAddress={startAddress}
              onStartAddressChange={setStartAddress}
              onSetStartLocation={() => handleSetLocation(true)}
              onUseGPSLocation={useCurrentLocationAsStart}
              endAddress={endAddress}
              onEndAddressChange={setEndAddress}
              onSetEndLocation={() => handleSetLocation(false)}
              isLoadingAddressGeocoding={loading}
              isDetectingGPS={detectingGps}
            />

            {/* Route configuration fields */}
            <RouteSettingsSection
              sessionName={sessionName}
              onSessionNameChange={setSessionName}
              vehicleType={vehicleType}
              onVehicleTypeChange={setVehicleType}
              destinationThresholdMeters={destinationThresholdMeters}
              onDestinationThresholdMetersChange={(val) =>
                setDestinationThresholdMeters(val ?? 80)
              }
              destinationThresholdSeconds={destinationThresholdSeconds}
              onDestinationThresholdSecondsChange={(val) =>
                setDestinationThresholdSeconds(val ?? 0)
              }
            />

            {/* Interactive map */}
            <MapSection
              startLocation={startLocation}
              endLocation={endLocation}
              currentLocation={
                currentLat && currentLng
                  ? { lat: currentLat, lng: currentLng }
                  : null
              }
              routePath={mapPath}
              previewPath={previewPath}
              viewportPoints={viewportPoints}
              isDarkMode={darkMode}
            />

            {/* Action buttons */}
            <ActionButtonsSection
              onPlanRoute={handlePlanRoute}
              canPlanRoute={!!startLocation && !!endLocation}
              trackingEnabled={trackingEnabled}
              onToggleTracking={handleToggleTracking}
              canTrack={!!activeSession}
              onSendLocationNow={() => handleSendLocationUpdate(false)}
              canSendLocation={!!activeSession}
              onCancelSession={handleCancelSession}
              canCancelSession={
                !!activeSession &&
                activeSession.status !== 'CANCELLED' &&
                activeSession.status !== 'COMPLETED'
              }
            />

            {/* Empty state animation */}
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
          </Card>
        </motion.div>

        {/* Sessions list card */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <SessionsTableSection
            sessions={sessions}
            onViewSessionDetails={handleLoadSessionFromList}
          />
        </motion.div>

        {/* Live navigation status card (only show if session is active) */}
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <LiveNavigationStatusSection
              activeSession={activeSession}
              trackingEnabled={trackingEnabled}
            />
          </motion.div>
        )}
      </div>

      {/* Start tracking confirmation dialog */}
      <StartTrackingDialog
        visible={showStartTrackingDialog}
        onHide={() => setShowStartTrackingDialog(false)}
        onStartTracking={startTrackingSession}
      />

      {/* Session details modal dialog */}
      <SessionDetailsDialog
        visible={showSessionDialog}
        onHide={() => setShowSessionDialog(false)}
        session={selectedSession}
        isLoading={false}
      />
    </motion.div>
  );
};

export default Dashboard;
