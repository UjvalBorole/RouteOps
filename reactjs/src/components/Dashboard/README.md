# Dashboard Component - Refactored Architecture

## Overview
The Dashboard component has been completely refactored into a modular, well-organized structure with clear separation of concerns. Each component handles a specific aspect of the route planning and navigation system.

## 🎯 Key Changes

### ✅ Removed Features
- **Pause/Resume Logic**: Completely removed from the frontend as requested
- Only `Cancel` button is available to stop sessions

### ✅ Component Structure

```
src/components/Dashboard/
├── Dashboard.tsx                          # Main orchestrator component
├── index.ts                              # Central export point
├── types.ts                              # Shared TypeScript interfaces
│
├── Components/
│   ├── AddressInputSection.tsx           # Address/location input fields
│   ├── RouteSettingsSection.tsx          # Route configuration (name, vehicle type, thresholds)
│   ├── MapSection.tsx                    # Interactive map with markers & route visualization
│   ├── ActionButtonsSection.tsx          # Plan, Track, Send, Cancel buttons
│   ├── SessionsTableSection.tsx          # List of all route sessions
│   ├── LiveNavigationStatusSection.tsx   # Real-time navigation details
│   ├── StartTrackingDialog.tsx           # Confirmation dialog for tracking
│   ├── SessionDetailsDialog.tsx          # Detailed session information modal
│   └── MapViewportController.tsx         # Auto-fit map to route points
│
├── Services/
│   ├── geocodingService.ts              # Address geocoding & reverse geocoding
│   ├── mapUtils.ts                      # Distance calculations & formatting
│   ├── trackingService.ts               # GPS watch & position tracking
│   └── routeApiService.ts               # Backend API calls
│
└── Styles/
    ├── Dashboard.css                     # Main dashboard styles
    ├── AddressInputSection.css
    ├── RouteSettingsSection.css
    ├── MapSection.css
    ├── ActionButtonsSection.css
    ├── SessionsTableSection.css
    ├── LiveNavigationStatusSection.css
    ├── StartTrackingDialog.css
    └── SessionDetailsDialog.css
```

---

## 📋 Component Descriptions

### **Dashboard.tsx** (Main Component)
- **Purpose**: Orchestrates all sub-components and manages global state
- **Responsibilities**:
  - State management (locations, tracking, sessions)
  - Coordinate service calls
  - Handle user interactions
  - Pass data to child components
- **Key States**:
  - `startAddress`, `endAddress` - Location inputs
  - `activeSession` - Currently active route session
  - `trackingEnabled` - Is GPS tracking active
  - `sessions` - List of all sessions

### **AddressInputSection.tsx**
- **Purpose**: Handle start and destination address inputs
- **Features**:
  - Manual address entry
  - Geocoding confirmation button
  - GPS location detection button
  - Proper error handling

### **RouteSettingsSection.tsx**
- **Purpose**: Route configuration inputs
- **Parameters**:
  - Session name (custom identifier)
  - Vehicle type (car, bike, etc.)
  - Distance threshold for destination detection
  - Time threshold for destination detection

### **MapSection.tsx**
- **Purpose**: Interactive map visualization
- **Features**:
  - Real-time route display
  - Start location marker (green)
  - Destination marker (red)
  - Current position marker (blue)
  - Automatic viewport fitting
  - Dark/light mode support
  - Animated route path

### **ActionButtonsSection.tsx**
- **Purpose**: Primary action buttons
- **Buttons**:
  - **Plan Route**: Create new route with current locations
  - **Start Tracking**: Begin automatic GPS tracking (toggles to "Stop Tracking")
  - **Send Now**: Manually send current location update
  - **Cancel**: Stop active session
- **Note**: Pause/Resume removed as requested

### **SessionsTableSection.tsx**
- **Purpose**: Display all route sessions
- **Features**:
  - Paginated data table
  - Status color-coding (green=active, red=cancelled, etc.)
  - View session details button
  - Remaining distance display

### **LiveNavigationStatusSection.tsx**
- **Purpose**: Real-time navigation information
- **Displays**:
  - Current session name and status
  - Next navigation instruction
  - Current GPS coordinates
  - Current speed (km/h)
  - Last segment distance and duration
  - ETA to destination
  - Progress bar (0-100%)
  - On-route status

### **StartTrackingDialog.tsx**
- **Purpose**: Confirmation dialog after route planning
- **Options**:
  - Start tracking immediately
  - Defer tracking to later

### **SessionDetailsDialog.tsx**
- **Purpose**: Detailed view of a selected session
- **Information**:
  - Session name and current status
  - Start and destination locations
  - Remaining distance
  - ETA and total distance

### **MapViewportController.tsx**
- **Purpose**: Auto-fit map viewport to route
- **Features**:
  - Smooth animations
  - Responsive zoom levels
  - Proper padding for markers

---

## 🔧 Services (Business Logic)

### **geocodingService.ts**
```typescript
// Normalize addresses (remove postal codes, expand abbreviations)
normalizeAddress(address: string): string[]

// Parse direct coordinates from text
parseCoordinatesFromText(address: string): Location | null

// Geocode using Nominatim (India-focused)
geocodeWithNominatim(query: string): Promise<Location | null>

// Geocode using Nominatim (Global)
geocodeWithNominatimNoCountry(query: string): Promise<Location | null>

// Geocode using Photon service
geocodeWithPhoton(query: string): Promise<Location | null>

// Main geocoding with fallback strategy
geocodeAddress(address: string): Promise<Location | null>

// Reverse geocode to get address from coordinates
reverseGeocode(lat: number, lng: number): Promise<string | null>
```

### **mapUtils.ts**
```typescript
// Calculate distance between two coordinates (Haversine formula)
calculateDistanceMeters(lat1, lng1, lat2, lng2): number

// Format seconds to human-readable duration
formatDuration(seconds: number): string  // "2h 30m", "45m 30s", etc.
```

### **trackingService.ts**
```typescript
// Start watching GPS position
startGPSWatch(): number | null

// Stop GPS watch
stopGPSWatch(watchId: number | null): void

// Get current GPS position (one-time)
getCurrentGPSPosition(): Promise<GeolocationCoordinates | null>
```

### **routeApiService.ts**
```typescript
// Fetch all sessions
fetchSessions(): Promise<RouteSession[]>

// Get specific session details
getSessionDetails(sessionId: string): Promise<RouteSession | null>

// Plan a new route
planRoute(routeData): Promise<RouteSession | null>

// Send location update
sendLocationUpdate(locationData): Promise<RouteSession | null>

// Cancel active session
cancelSession(sessionId: string): Promise<RouteSession | null>
```

---

## 💾 Types (types.ts)

```typescript
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
```

---

## 🔄 Data Flow

```
User Input
    ↓
Dashboard.tsx (State Management)
    ↓
Service Layers (Business Logic)
├── geocodingService (Address → Coordinates)
├── routeApiService (API calls)
├── trackingService (GPS)
└── mapUtils (Calculations)
    ↓
Sub-Components (UI Rendering)
├── AddressInputSection
├── RouteSettingsSection
├── MapSection
├── ActionButtonsSection
├── SessionsTableSection
├── LiveNavigationStatusSection
└── Dialogs
    ↓
User Interface
```

---

## 📱 Tracking Flow

1. **User clicks "Plan Route"**
   - Dashboard validates start/end locations
   - Calls `routeApiService.planRoute()`
   - Sets as active session
   - Shows `StartTrackingDialog`

2. **User clicks "Start Tracking"**
   - Dashboard calls `startGPSWatch()` from trackingService
   - Sends initial location update via `routeApiService.sendLocationUpdate()`
   - Schedules periodic updates (30-60 second intervals)
   - Updates live navigation status in real-time

3. **Background Location Updates**
   - Every 30-60 seconds, location is sent to backend
   - Speed is calculated from distance traveled
   - `LiveNavigationStatusSection` displays latest data

4. **User clicks "Cancel"**
   - Stops all tracking
   - Clears GPS watch
   - Calls `routeApiService.cancelSession()`
   - Removes session from active state

---

## 🎨 Styling

### Component-Scoped CSS
- Each component has its own CSS file in `styles/` folder
- Shared colors and variables in main `Dashboard.css`
- Responsive design for mobile and desktop
- Dark mode support

### CSS Classes Used
- `.dashboard-container` - Main wrapper
- `.dashboard-wrapper` - Grid layout
- `.route-card-glow` - Card styling with shadow
- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button variants
- `.detail-row`, `.detail-label`, `.detail-value` - Status display
- `.pulse-marker-*` - Animated markers
- `.animated-route-path` - Animated route line

---

## 🚀 Usage

### Import Dashboard
```typescript
import { Dashboard } from './components/Dashboard';

// In your router
<Route path="/" element={<Dashboard />} />
```

### Import Individual Components (if needed)
```typescript
import {
  MapSection,
  AddressInputSection,
  ActionButtonsSection,
} from './components/Dashboard';
```

### Import Services (for custom usage)
```typescript
import {
  geocodeAddress,
  calculateDistanceMeters,
  formatDuration,
} from './components/Dashboard';
```

---

## 📝 Comments & Documentation

- **Every file** has a header comment explaining its purpose
- **Every component** has inline comments for complex logic
- **Every function** is documented with clear descriptions
- **Every service method** includes usage notes

---

## 🔍 Key Improvements

✅ **Modular Architecture** - Easy to maintain and test individual components
✅ **Clear Separation of Concerns** - UI, logic, and services are separate
✅ **Comprehensive Comments** - Easy to understand code intent
✅ **Responsive Design** - Works on mobile and desktop
✅ **Error Handling** - Proper try-catch blocks and user feedback
✅ **Performance** - Optimized renders with useMemo and useCallback
✅ **Accessibility** - Proper labels and ARIA attributes
✅ **Removed Pause/Resume** - Simplified workflow as requested
✅ **Dark Mode Support** - Toggle between light and dark themes
✅ **Reusable Services** - Can be used elsewhere in the app

---

## 🛠️ Development Tips

1. **Adding a new feature**: Create a new sub-component in the Dashboard folder
2. **Modifying API calls**: Update the relevant service in `routeApiService.ts`
3. **Changing styling**: Edit the CSS in the `styles/` folder
4. **Adding new utilities**: Create new service files as needed
5. **Testing components**: Each component is independently testable

---

## 📞 Support

For questions about the component structure or functionality, refer to the inline comments in each file.

