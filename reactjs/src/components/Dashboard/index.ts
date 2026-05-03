/**
 * Dashboard Component Exports
 * Central export point for all dashboard-related components and utilities
 */

// Main component - export as both default and named
import DashboardComponent from './Dashboard';
export { default as Dashboard } from './Dashboard';
export default DashboardComponent;

// Sub-components
export { default as AddressInputSection } from './AddressInputSection';
export { default as RouteSettingsSection } from './RouteSettingsSection';
export { default as MapSection } from './MapSection';
export { default as ActionButtonsSection } from './ActionButtonsSection';
export { default as SessionsTableSection } from './SessionsTableSection';
export { default as LiveNavigationStatusSection } from './LiveNavigationStatusSection';
export { default as StartTrackingDialog } from './StartTrackingDialog';
export { default as SessionDetailsDialog } from './SessionDetailsDialog';
export { default as MapViewportController } from './MapViewportController';

// Types
export type { Location, RouteNode, RouteSession } from './types';

// Services
export {
  normalizeAddress,
  parseCoordinatesFromText,
  geocodeWithNominatim,
  geocodeWithNominatimNoCountry,
  geocodeWithPhoton,
  buildReducedQueries,
  geocodeAddress,
  reverseGeocode,
} from './geocodingService';

export {
  calculateDistanceMeters,
  formatDuration,
} from './mapUtils';

export {
  sendLocationUpdate,
  startGPSWatch,
  stopGPSWatch,
  getCurrentGPSPosition,
} from './trackingService';

export {
  fetchSessions,
  getSessionDetails,
  planRoute,
  sendLocationUpdate as sendLocationUpdateAPI,
  cancelSession,
} from './routeApiService';
