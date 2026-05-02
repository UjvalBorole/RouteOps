# FleetOps Frontend - React

This is the React frontend for the FleetOps intelligent fleet management system, converted from the original Angular implementation.

## Features

- **Interactive Map**: Click to select start and destination points using Leaflet maps
- **Smart Routing**: Calculate routes and prices using the custom routing engine
- **Live Tracking**: Real-time vehicle movement simulation via WebSocket
- **Admin Panel**: Fleet management interface for administrators
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly interface using PrimeReact

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Leaflet** for maps
- **PrimeReact** for UI components
- **React Router** for navigation
- **Axios** for API calls
- **React Toastify** for notifications

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The app will be available at `http://localhost:4200`

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Main user interface with map
│   ├── AdminPanel.tsx     # Fleet management panel
│   ├── Login.tsx          # Authentication login
│   └── Register.tsx       # User registration
├── App.tsx                # Main app component with routing
├── main.tsx               # App entry point
└── index.css              # Global styles
```

## API Integration

The frontend communicates with the Spring Boot backend at `http://localhost:8080` via proxy configuration in `vite.config.ts`.

Key endpoints:
- `/api/auth/login` - User authentication
- `/api/route` - Route calculation
- `/api/order` - Ride booking
- `/api/vehicles` - Fleet management (admin)

## WebSocket

Real-time tracking uses WebSocket connection to `/tracking` endpoint for live vehicle updates.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.