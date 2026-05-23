// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
// import L from 'leaflet';
// import { Button } from 'primereact/button';
// import { InputText } from 'primereact/inputtext';
// import { InputNumber } from 'primereact/inputnumber';
// import { DataTable } from 'primereact/datatable';
// import { Column } from 'primereact/column';
// import { Tag } from 'primereact/tag';
// import { Dialog } from 'primereact/dialog';
// import { ProgressBar } from 'primereact/progressbar';
// import { toast } from 'react-toastify';
// import { motion, AnimatePresence } from 'framer-motion';
// import { DotLottieReact } from '@lottiefiles/dotlottie-react';
// import axios from 'axios';
// import {
//   Search, Clock, Route, Box, Plus, Minus,
//   Crosshair, Layers, Compass, CornerUpRight, ArrowUp,
//   X, Send, Play, Pause, Loader2, Menu,
//   Activity, Navigation, Volume2, VolumeX, Zap
// } from 'lucide-react';
// import 'leaflet/dist/leaflet.css';
// import apiClient from '../utils/apiClient';
// import './Dashboard.css';

// /* ── Leaflet default icon fix ── */
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
// });

// /* ══════════════════════════════════════
//    INTERFACES
//    ══════════════════════════════════════ */
// interface Location { lat: number; lng: number; }

// interface RouteNode {
//   nodeId: number;
//   latitude: number;
//   longitude: number;
//   sequence: number;
// }

// interface RouteSession {
//   sessionId: string;
//   sessionName: string;
//   startLat: number;
//   startLng: number;
//   endLat: number;
//   endLng: number;
//   startAddress?: string;
//   destinationAddress?: string;
//   totalDistance?: number;
//   remainingDistance?: number;
//   status?: string;
//   routePath?: RouteNode[];
//   remainingPathNodes?: RouteNode[];
//   currentLat?: number;
//   currentLng?: number;
//   nextInstruction?: string;
//   onRoute?: boolean;
//   progressPercentage?: number;
//   estimatedTimeToDestinationSeconds?: number;
//   currentSpeedKmh?: number;
//   lastSegmentDistanceMeters?: number;
//   lastSegmentDurationSeconds?: number;
// }

// /* ══════════════════════════════════════
//    CONSTANTS
//    ══════════════════════════════════════ */
// const ACTIVE_SESSION_ID_KEY = 'route-app.active-session-id';
// const TRACKING_ENABLED_KEY = 'route-app.tracking-enabled';

// const TILE_URLS: Record<string, string> = {
//   dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
//   streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
//   satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
//   topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
// };

// /* ── Custom Leaflet DivIcons ── */
// const vehicleIcon = L.divIcon({
//   html: `<div class="navi-vehicle-marker"><div class="navi-vehicle-marker-inner"><div class="navi-vehicle-marker-core">
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
//       <polygon points="3 12 6 3 18 3 21 12 18 21 6 21 3 12"/>
//     </svg></div></div></div>`,
//   className: '',
//   iconSize: [44, 44],
//   iconAnchor: [22, 22],
// });

// const destIcon = L.divIcon({
//   html: `<div class="navi-dest-marker">
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
//       <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
//     </svg></div>`,
//   className: '',
//   iconSize: [36, 36],
//   iconAnchor: [18, 36],
// });

// const startIcon = L.divIcon({
//   html: `<div class="navi-start-marker">
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
//       <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
//     </svg></div>`,
//   className: '',
//   iconSize: [36, 36],
//   iconAnchor: [18, 18],
// });

// /* ══════════════════════════════════════
//    HELPER COMPONENTS
//    ══════════════════════════════════════ */

// /* Stores map instance in ref for external access */
// const MapController: React.FC<{ mapRef: React.MutableRefObject<L.Map | null> }> = ({ mapRef }) => {
//   const map = useMap();
//   useEffect(() => { mapRef.current = map; }, [map, mapRef]);
//   return null;
// };

// /* Auto-fits map viewport to given points */
// const MapViewportController: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
//   const map = useMap();
//   useEffect(() => {
//     if (points.length === 0) return;
//     if (points.length === 1) { map.flyTo(points[0], 15, { animate: true, duration: 1.2 }); return; }
//     map.flyToBounds(points, { animate: true, duration: 1.2, padding: [60, 60], maxZoom: 16 });
//   }, [map, points]);
//   return null;
// };

// /* ══════════════════════════════════════
//    DASHBOARD COMPONENT
//    ══════════════════════════════════════ */
// const Dashboard: React.FC = () => {
//   /* ── Existing State ── */
//   const [sessionName, setSessionName] = useState('Daily Commute');
//   const [vehicleType, setVehicleType] = useState('');
//   const [destinationThresholdMeters, setDestinationThresholdMeters] = useState(0);
//   const [destinationThresholdSeconds, setDestinationThresholdSeconds] = useState(0);
//   const [startAddress, setStartAddress] = useState('Panvel');
//   const [endAddress, setEndAddress] = useState('Kurla');
//   const [startLocation, setStartLocation] = useState<Location | null>(null);
//   const [endLocation, setEndLocation] = useState<Location | null>(null);
//   const [sessions, setSessions] = useState<RouteSession[]>([]);
//   const [activeSession, setActiveSession] = useState<RouteSession | null>(null);
//   const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);
//   const [showSessionDialog, setShowSessionDialog] = useState(false);
//   const [showStartTrackingDialog, setShowStartTrackingDialog] = useState(false);
//   const [currentLat, setCurrentLat] = useState<number | null>(null);
//   const [currentLng, setCurrentLng] = useState<number | null>(null);
//   const [speedKmh, setSpeedKmh] = useState(35);
//   const [accuracyMeters, setAccuracyMeters] = useState(10);
//   const [darkMode, setDarkMode] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [detectingGps, setDetectingGps] = useState(false);
//   const [trackingEnabled, setTrackingEnabled] = useState<boolean>(() => localStorage.getItem(TRACKING_ENABLED_KEY) === 'true');
//   const [isEditingNewRoute, setIsEditingNewRoute] = useState(false);

//   /* ── New UI State ── */
//   const [rightPanelOpen, setRightPanelOpen] = useState(false);
//   const [layerPanelOpen, setLayerPanelOpen] = useState(false);
//   const [is3DView, setIs3DView] = useState(true);
//   const [currentTileLayer, setCurrentTileLayer] = useState<string>('dark');
//   const [showSessionsDialog, setShowSessionsDialog] = useState(false);

//   /* ── Existing Refs ── */
//   const intervalRef = useRef<number | null>(null);
//   const watchRef = useRef<number | null>(null);
//   const currentCoordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
//   const activeSessionIdRef = useRef<string | null>(null);
//   const speedRef = useRef<number>(35);
//   const accuracyRef = useRef<number>(10);
//   const lastSubmittedPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
//   const mapRef = useRef<L.Map | null>(null);

//   /* ── Sync Refs with State ── */
//   useEffect(() => { currentCoordsRef.current = { lat: currentLat, lng: currentLng }; }, [currentLat, currentLng]);
//   useEffect(() => { activeSessionIdRef.current = activeSession?.sessionId ?? null; }, [activeSession?.sessionId]);
//   useEffect(() => { speedRef.current = speedKmh; }, [speedKmh]);
//   useEffect(() => { accuracyRef.current = accuracyMeters; }, [accuracyMeters]);
// };
//   /* ══════════════════════════════════════
//      BUSINESS LOGIC (unchanged from original)
//      ══════════════════════════════════════ */

//   const normalizeAddress = (rawAddress: string): string[] => {
//     const trimmed = rawAddress.trim();
//     if (!trimmed) return [];
//     const withoutPostalCode = trimmed.replace(/\b\d{6}\b/g, '').replace(/\s+,/g, ',').trim();
//     const expanded = withoutPostalCode.replace(/\bRd\b/gi, 'Road').replace(/\bSt\b/gi, 'Street').replace(/\bMt\b/gi, 'Mount').replace(/\s+/g, ' ').trim();
//     const withIndia = /india/i.test(expanded) ? expanded : `${expanded}, India`;
//     const shortForm = expanded.split(',').map((part) => part.trim()).filter(Boolean).slice(0, 5).join(', ');
//     return Array.from(new Set([trimmed, withoutPostalCode, expanded, withIndia, shortForm]));
//   };

//   const parseCoordinatesFromText = (rawAddress: string): Location | null => {
//     const text = rawAddress.trim();
//     if (!text) return null;
//     const commaParts = text.split(',').map((p) => p.trim());
//     if (commaParts.length === 2) {
//       const lat = Number(commaParts[0]), lng = Number(commaParts[1]);
//       if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
//     }
//     const spaceParts = text.split(/\s+/).map((p) => p.trim()).filter(Boolean);
//     if (spaceParts.length === 2) {
//       const lat = Number(spaceParts[0]), lng = Number(spaceParts[1]);
//       if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
//     }
//     return null;
//   };

//   const geocodeWithNominatim = async (query: string): Promise<Location | null> => {
//     const response = await axios.get('https://nominatim.openstreetmap.org/search', { params: { q: query, format: 'jsonv2', limit: 5, countrycodes: 'in' }, timeout: 12000 });
//     const best = response.data?.[0];
//     return best ? { lat: parseFloat(best.lat), lng: parseFloat(best.lon) } : null;
//   };

//   const geocodeWithNominatimNoCountry = async (query: string): Promise<Location | null> => {
//     const response = await axios.get('https://nominatim.openstreetmap.org/search', { params: { q: query, format: 'jsonv2', limit: 5 }, timeout: 12000 });
//     const best = response.data?.[0];
//     return best ? { lat: parseFloat(best.lat), lng: parseFloat(best.lon) } : null;
//   };

//   const buildReducedQueries = (rawAddress: string): string[] => {
//     const parts = rawAddress.split(',').map((p) => p.trim()).filter(Boolean);
//     const reduced: string[] = [];
//     if (parts.length >= 3) reduced.push(parts.slice(-3).join(', '));
//     if (parts.length >= 2) reduced.push(parts.slice(-2).join(', '));
//     if (parts.length >= 1) reduced.push(parts[parts.length - 1]);
//     return Array.from(new Set(reduced));
  
//   };