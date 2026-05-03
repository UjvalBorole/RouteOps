/**
 * Geolocation and Geocoding Services
 * Handles address normalization, geocoding, and reverse geocoding
 */

import axios from 'axios';
import { Location } from './types';

/**
 * Normalize address by removing postal codes and expanding abbreviations
 * Returns multiple variations of the address for robust geocoding
 */
export const normalizeAddress = (rawAddress: string): string[] => {
  const trimmed = rawAddress.trim();
  if (!trimmed) return [];

  // Remove postal codes (6-digit numbers)
  const withoutPostalCode = trimmed
    .replace(/\b\d{6}\b/g, '')
    .replace(/\s+,/g, ',')
    .trim();

  // Expand abbreviations (Rd->Road, St->Street, etc.)
  const expanded = withoutPostalCode
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bMt\b/gi, 'Mount')
    .replace(/\s+/g, ' ')
    .trim();

  // Add India if not present
  const withIndia = /india/i.test(expanded) ? expanded : `${expanded}, India`;

  // Create shortened form with last 5 parts
  const shortForm = expanded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(', ');

  // Return unique variations for geocoding fallback
  return Array.from(new Set([trimmed, withoutPostalCode, expanded, withIndia, shortForm]));
};

/**
 * Parse direct coordinates from text input
 * Supports "lat,lng" or "lat lng" formats
 */
export const parseCoordinatesFromText = (rawAddress: string): Location | null => {
  const text = rawAddress.trim();
  if (!text) return null;

  // Try comma-separated format
  const commaParts = text.split(',').map((part) => part.trim());
  if (commaParts.length === 2) {
    const lat = Number(commaParts[0]);
    const lng = Number(commaParts[1]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  // Try space-separated format
  const spaceParts = text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (spaceParts.length === 2) {
    const lat = Number(spaceParts[0]);
    const lng = Number(spaceParts[1]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  return null;
};

/**
 * Geocode using Nominatim (India-focused)
 */
export const geocodeWithNominatim = async (query: string): Promise<Location | null> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'jsonv2', limit: 5, countrycodes: 'in' },
      timeout: 12000,
    });
    const best = response.data?.[0];
    if (!best) return null;
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
  } catch {
    return null;
  }
};

/**
 * Geocode using Nominatim (Global)
 */
export const geocodeWithNominatimNoCountry = async (query: string): Promise<Location | null> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'jsonv2', limit: 5 },
      timeout: 12000,
    });
    const best = response.data?.[0];
    if (!best) return null;
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
  } catch {
    return null;
  }
};

/**
 * Geocode using Photon (Komoot service)
 */
export const geocodeWithPhoton = async (query: string): Promise<Location | null> => {
  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: { q: query, limit: 3 },
      timeout: 12000,
    });
    const feature = response.data?.features?.[0];
    if (!feature?.geometry?.coordinates) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
};

/**
 * Build reduced queries from a long address for fallback geocoding
 */
export const buildReducedQueries = (rawAddress: string): string[] => {
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

/**
 * Main geocoding function with fallback strategy
 * 1. Try parsing direct coordinates
 * 2. Try Nominatim (India-focused)
 * 3. Try Photon
 * 4. Try Nominatim (global)
 * 5. Try reduced queries
 */
export const geocodeAddress = async (address: string): Promise<Location | null> => {
  // Check for direct coordinates first
  const coordinateValue = parseCoordinatesFromText(address);
  if (coordinateValue) return coordinateValue;

  const queries = normalizeAddress(address);

  // Try Nominatim with India lock
  for (const query of queries) {
    const result = await geocodeWithNominatim(query);
    if (result) return result;
  }

  // Try Photon
  for (const query of queries) {
    const result = await geocodeWithPhoton(query);
    if (result) return result;
  }

  // Try Nominatim without country lock
  for (const query of queries) {
    const result = await geocodeWithNominatimNoCountry(query);
    if (result) return result;
  }

  // Try reduced queries
  const reducedQueries = buildReducedQueries(address);
  for (const query of reducedQueries) {
    const result = await geocodeWithNominatimNoCountry(query);
    if (result) return result;
  }

  return null;
};

/**
 * Reverse geocode coordinates to get address
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
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
