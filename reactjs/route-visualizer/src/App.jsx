import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';

const DEFAULT_ROUTE_QUERY = {
  apiBase: '',
  startLat: '19.0180',
  startLng: '72.8430',
  endLat: '19.0726',
  endLng: '72.8786',
  weight: '1200',
};

const DEFAULT_TRACKING = {
  latitude: '19.0180',
  longitude: '72.8430',
  speedKmh: '35',
};

const OFF_ROUTE_THRESHOLD_METERS = 40;
const EARTH_RADIUS_METERS = 6371000;

function App() {
  const [routeQuery, setRouteQuery] = useState(DEFAULT_ROUTE_QUERY);
  const [tracking, setTracking] = useState(DEFAULT_TRACKING);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const progress = useMemo(() => {
    if (!routeData?.points?.length) {
      return null;
    }

    const lat = Number(tracking.latitude);
    const lon = Number(tracking.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return calculateRouteProgress(routeData, lat, lon, Number(tracking.speedKmh) || 35);
  }, [routeData, tracking]);

  useEffect(() => {
    if (!autoPlay || !routeData?.points?.length) {
      return undefined;
    }

    const lastIndex = routeData.points.length - 1;
    const timer = window.setInterval(() => {
      setPlaybackIndex((current) => {
        if (current >= lastIndex) {
          setAutoPlay(false);
          return current;
        }
        const nextIndex = current + 1;
        const nextPoint = routeData.points[nextIndex];
        setTracking((existing) => ({
          ...existing,
          latitude: nextPoint.lat.toFixed(6),
          longitude: nextPoint.lon.toFixed(6),
        }));
        return nextIndex;
      });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [autoPlay, routeData]);

  async function fetchRoute() {
    setLoading(true);
    setError('');
    setAutoPlay(false);

    try {
      const url = createRouteUrl(routeQuery.apiBase);
      url.searchParams.set('startLat', routeQuery.startLat);
      url.searchParams.set('startLng', routeQuery.startLng);
      url.searchParams.set('endLat', routeQuery.endLat);
      url.searchParams.set('endLng', routeQuery.endLng);
      if (routeQuery.weight.trim()) {
        url.searchParams.set('weight', routeQuery.weight);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Route API failed with ${response.status}`);
      }

      const payload = await response.json();
      const normalized = normalizeRoutePayload(payload);
      setRouteData(normalized);
      setPlaybackIndex(0);
      setTracking((existing) => ({
        ...existing,
        latitude: normalized.points[0].lat.toFixed(6),
        longitude: normalized.points[0].lon.toFixed(6),
      }));
    } catch (requestError) {
      setRouteData(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to load route');
    } finally {
      setLoading(false);
    }
  }

  function updateRouteField(event) {
    const { name, value } = event.target;
    setRouteQuery((current) => ({ ...current, [name]: value }));
  }

  function updateTrackingField(event) {
    const { name, value } = event.target;
    setTracking((current) => ({ ...current, [name]: value }));
  }

  function usePlaybackPoint(event) {
    if (!routeData?.points?.length) {
      return;
    }
    const nextIndex = Number(event.target.value);
    const point = routeData.points[nextIndex];
    setPlaybackIndex(nextIndex);
    setTracking((current) => ({
      ...current,
      latitude: point.lat.toFixed(6),
      longitude: point.lon.toFixed(6),
    }));
  }

  const mapCenter = progress?.projectedPoint
    ? [progress.projectedPoint.lat, progress.projectedPoint.lon]
    : routeData?.points?.length
      ? [routeData.points[0].lat, routeData.points[0].lon]
      : [19.018, 72.843];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="panel">
          <p className="eyebrow">Tested backend</p>
          <h1>Route Visualizer</h1>
          <p className="lede">
            Uses the live routing engine response from <code>/route</code>, then computes the
            remaining path on the frontend from the current location.
          </p>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Route Request</h2>
            <button className="primary-button" onClick={fetchRoute} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Route'}
            </button>
          </div>

          <label>
            API base
            <input
              name="apiBase"
              value={routeQuery.apiBase}
              onChange={updateRouteField}
              placeholder="Leave blank to use the local Vite proxy"
            />
          </label>

          <div className="grid-two">
            <label>
              Start lat
              <input name="startLat" value={routeQuery.startLat} onChange={updateRouteField} />
            </label>
            <label>
              Start lon
              <input name="startLng" value={routeQuery.startLng} onChange={updateRouteField} />
            </label>
            <label>
              End lat
              <input name="endLat" value={routeQuery.endLat} onChange={updateRouteField} />
            </label>
            <label>
              End lon
              <input name="endLng" value={routeQuery.endLng} onChange={updateRouteField} />
            </label>
          </div>

          <label>
            Vehicle weight
            <input name="weight" value={routeQuery.weight} onChange={updateRouteField} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Live Position</h2>
            <button
              className="secondary-button"
              onClick={() => setAutoPlay((value) => !value)}
              disabled={!routeData?.points?.length}
            >
              {autoPlay ? 'Pause Simulation' : 'Simulate Along Route'}
            </button>
          </div>

          <div className="grid-two">
            <label>
              Current lat
              <input name="latitude" value={tracking.latitude} onChange={updateTrackingField} />
            </label>
            <label>
              Current lon
              <input name="longitude" value={tracking.longitude} onChange={updateTrackingField} />
            </label>
          </div>

          <label>
            Speed km/h
            <input name="speedKmh" value={tracking.speedKmh} onChange={updateTrackingField} />
          </label>

          <label>
            Route point scrubber
            <input
              type="range"
              min="0"
              max={Math.max((routeData?.points?.length || 1) - 1, 0)}
              value={playbackIndex}
              onChange={usePlaybackPoint}
              disabled={!routeData?.points?.length}
            />
          </label>
        </div>

        <div className="panel metrics">
          <h2>Progress Snapshot</h2>
          <Metric label="API status" value={routeData?.status || 'Not loaded'} />
          <Metric label="Route nodes" value={routeData?.count ?? 0} />
          <Metric
            label="Total distance"
            value={routeData ? formatDistance(routeData.totalDistance) : '--'}
          />
          <Metric
            label="Remaining distance"
            value={progress ? formatDistance(progress.remainingDistance) : '--'}
          />
          <Metric label="ETA" value={progress ? formatDuration(progress.etaSeconds) : '--'} />
          <Metric label="Deviation" value={progress ? formatDistance(progress.deviationDistance) : '--'} />
          <Metric label="On route" value={progress ? (progress.onRoute ? 'Yes' : 'No') : '--'} />
          <Metric
            label="Remaining points"
            value={progress?.remainingPath?.length ?? 0}
          />
        </div>
      </aside>

      <main className="map-panel">
        <div className="map-header">
          <div>
            <p className="eyebrow">Visualization</p>
            <h2>Full route, current position, and remaining path</h2>
          </div>
          <div className="header-badges">
            <span className="badge">Raw engine path</span>
            <span className="badge badge-secondary">Frontend progress math</span>
          </div>
        </div>

        <div className="map-frame">
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routeData?.latLngs?.length ? (
              <Polyline positions={routeData.latLngs} pathOptions={{ color: '#6b7280', weight: 5, opacity: 0.35 }} />
            ) : null}

            {progress?.completedPath?.length > 1 ? (
              <Polyline positions={progress.completedPath} pathOptions={{ color: '#34d399', weight: 6, opacity: 0.85 }} />
            ) : null}

            {progress?.remainingPath?.length > 1 ? (
              <Polyline
                positions={progress.remainingPath}
                pathOptions={{ color: '#2563eb', weight: 6, dashArray: '8, 10' }}
              />
            ) : null}

            {routeData?.points?.[0] ? (
              <PointMarker
                position={[routeData.points[0].lat, routeData.points[0].lon]}
                color="#111827"
                label="Start"
              />
            ) : null}

            {routeData?.points?.at(-1) ? (
              <PointMarker
                position={[routeData.points.at(-1).lat, routeData.points.at(-1).lon]}
                color="#ef4444"
                label="Destination"
              />
            ) : null}

            {progress?.projectedPoint ? (
              <PointMarker
                position={[progress.projectedPoint.lat, progress.projectedPoint.lon]}
                color={progress.onRoute ? '#2563eb' : '#f59e0b'}
                label={progress.onRoute ? 'Current location' : 'Projected current location'}
                radius={9}
              />
            ) : null}
          </MapContainer>
        </div>

        <div className="footer-strip">
          <span>Remaining route is drawn from the snapped current location to destination.</span>
          <span>Off-route threshold follows the backend logic: {OFF_ROUTE_THRESHOLD_METERS}m.</span>
        </div>
      </main>
    </div>
  );
}

function PointMarker({ position, color, label, radius = 7 }) {
  return (
    <CircleMarker center={position} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 1 }}>
      <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
        {label}
      </Tooltip>
    </CircleMarker>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeRoutePayload(payload) {
  if (!payload?.path?.length) {
    throw new Error('Route API returned no path points');
  }

  const points = payload.path.map((point, index) => ({
    id: point.id ?? index,
    lat: Number(point.lat),
    lon: Number(point.lon),
  }));

  const cumulativeDistances = [0];
  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = haversineDistance(points[index - 1], points[index]);
    cumulativeDistances.push(cumulativeDistances[index - 1] + segmentDistance);
  }

  return {
    status: payload.status ?? 'unknown',
    count: payload.count ?? points.length,
    totalDistance: Number(payload.totalDistance ?? cumulativeDistances.at(-1) ?? 0),
    points,
    latLngs: points.map((point) => [point.lat, point.lon]),
    cumulativeDistances,
  };
}

function createRouteUrl(apiBase) {
  const trimmed = apiBase.trim();
  if (!trimmed) {
    return new URL('/route', window.location.origin);
  }
  const normalizedBase = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  return new URL('route', normalizedBase);
}

function calculateRouteProgress(routeData, currentLat, currentLon, speedKmh) {
  const { points, cumulativeDistances, totalDistance } = routeData;

  let bestProjection = null;

  for (let index = 0; index < points.length - 1; index += 1) {
    const projection = projectToSegment(points[index], points[index + 1], currentLat, currentLon);
    const distanceAlongRoute = cumulativeDistances[index] + projection.distanceFromSegmentStart;

    if (!bestProjection || projection.deviationDistance < bestProjection.deviationDistance) {
      bestProjection = {
        ...projection,
        segmentIndex: index,
        distanceAlongRoute,
      };
    }
  }

  if (!bestProjection) {
    bestProjection = {
      segmentIndex: 0,
      deviationDistance: 0,
      distanceAlongRoute: 0,
      projectedPoint: { lat: points[0].lat, lon: points[0].lon },
    };
  }

  const remainingDistance = Math.max(0, totalDistance - bestProjection.distanceAlongRoute);
  const completedPath = [
    ...points.slice(0, bestProjection.segmentIndex + 1).map((point) => [point.lat, point.lon]),
    [bestProjection.projectedPoint.lat, bestProjection.projectedPoint.lon],
  ];
  const remainingPath = [
    [bestProjection.projectedPoint.lat, bestProjection.projectedPoint.lon],
    ...points.slice(bestProjection.segmentIndex + 1).map((point) => [point.lat, point.lon]),
  ];

  return {
    remainingDistance,
    etaSeconds: calculateEtaSeconds(remainingDistance, speedKmh),
    deviationDistance: bestProjection.deviationDistance,
    onRoute: bestProjection.deviationDistance <= OFF_ROUTE_THRESHOLD_METERS,
    projectedPoint: bestProjection.projectedPoint,
    completedPath,
    remainingPath,
  };
}

function projectToSegment(startPoint, endPoint, currentLat, currentLon) {
  const referenceLat = toRadians((startPoint.lat + endPoint.lat) / 2);
  const startX = toRadians(startPoint.lon) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
  const startY = toRadians(startPoint.lat) * EARTH_RADIUS_METERS;
  const endX = toRadians(endPoint.lon) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
  const endY = toRadians(endPoint.lat) * EARTH_RADIUS_METERS;
  const pointX = toRadians(currentLon) * Math.cos(referenceLat) * EARTH_RADIUS_METERS;
  const pointY = toRadians(currentLat) * EARTH_RADIUS_METERS;

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  let t = 0;
  if (segmentLengthSquared > 0) {
    t = ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / segmentLengthSquared;
    t = Math.max(0, Math.min(1, t));
  }

  const projectedX = startX + t * deltaX;
  const projectedY = startY + t * deltaY;

  const projectedLat = toDegrees(projectedY / EARTH_RADIUS_METERS);
  const projectedLon = toDegrees(projectedX / (Math.cos(referenceLat) * EARTH_RADIUS_METERS));

  return {
    deviationDistance: Math.hypot(pointX - projectedX, pointY - projectedY),
    distanceFromSegmentStart: Math.hypot(projectedX - startX, projectedY - startY),
    projectedPoint: {
      lat: projectedLat,
      lon: projectedLon,
    },
  };
}

function haversineDistance(firstPoint, secondPoint) {
  const lat1 = toRadians(firstPoint.lat);
  const lat2 = toRadians(secondPoint.lat);
  const dLat = lat2 - lat1;
  const dLon = toRadians(secondPoint.lon - firstPoint.lon);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateEtaSeconds(distanceMeters, speedKmh) {
  if (!speedKmh || speedKmh <= 0) {
    return 0;
  }
  const metersPerSecond = speedKmh * (1000 / 3600);
  return Math.round(distanceMeters / metersPerSecond);
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return '--';
  }
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(2)} km`;
  }
  return `${distanceMeters.toFixed(0)} m`;
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function toRadians(value) {
  return value * (Math.PI / 180);
}

function toDegrees(value) {
  return value * (180 / Math.PI);
}

export default App;
