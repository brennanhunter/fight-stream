import { headers } from 'next/headers';

interface GeoResult {
  blocked: boolean;
  distanceMiles: number | null;
}

interface VenueCoords {
  lat: number;
  lon: number;
}

const MAX_CACHE_SIZE = 100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const geocodeCache = new Map<string, { coords: VenueCoords; expiresAt: number }>();

const IP_CACHE_MAX_SIZE = 500;
const IP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ipGeoCache = new Map<string, { lat: number; lon: number; expiresAt: number }>();

/** Geocode an address to lat/lon using OpenStreetMap Nominatim. */
async function geocodeAddress(address: string): Promise<VenueCoords | null> {
  const cached = geocodeCache.get(address);
  if (cached && cached.expiresAt > Date.now()) return cached.coords;
  if (cached) geocodeCache.delete(address); // expired — remove

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
    {
      headers: { 'User-Agent': 'boxstreamtv-geo-check' },
      next: { revalidate: 86400 }, // cache for 24 hours
    }
  );

  if (!res.ok) return null;

  const results = await res.json();
  if (!results.length) return null;

  const coords: VenueCoords = {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
  };
  geocodeCache.set(address, { coords, expiresAt: Date.now() + CACHE_TTL_MS });

  // Evict oldest entries if cache exceeds max size
  if (geocodeCache.size > MAX_CACHE_SIZE) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) geocodeCache.delete(firstKey);
  }

  return coords;
}

/** Haversine formula — returns distance in miles between two lat/lon points. */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks whether the current request originates within the blackout radius.
 * Intended for use in server components and API routes.
 * Falls back to allowing access if geolocation lookup fails.
 */
export async function checkGeoRestriction(
  venueAddress: string,
  radiusMiles: number = 90,
  ip?: string
): Promise<GeoResult> {
  try {
    if (!venueAddress) return { blocked: false, distanceMiles: null };

    const venue = await geocodeAddress(venueAddress);
    if (!venue) return { blocked: false, distanceMiles: null };

    const clientIp = ip ?? await getClientIp();
    if (!clientIp) return { blocked: false, distanceMiles: null };

    // Check IP geo cache first to avoid hitting rate limits
    let latitude: number;
    let longitude: number;
    const cachedIp = ipGeoCache.get(clientIp);
    if (cachedIp && cachedIp.expiresAt > Date.now()) {
      latitude = cachedIp.lat;
      longitude = cachedIp.lon;
    } else {
      if (cachedIp) ipGeoCache.delete(clientIp); // expired — remove

      // Use ipapi.co (HTTPS, free tier 1k/day) instead of ip-api.com (HTTP-only on free tier)
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, {
        cache: 'no-store',
      });

      if (!res.ok) return { blocked: false, distanceMiles: null };

      const data = await res.json();
      latitude = data.latitude;
      longitude = data.longitude;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return { blocked: false, distanceMiles: null };
      }

      ipGeoCache.set(clientIp, { lat: latitude, lon: longitude, expiresAt: Date.now() + IP_CACHE_TTL_MS });

      // Evict oldest entries if cache exceeds max size
      if (ipGeoCache.size > IP_CACHE_MAX_SIZE) {
        const firstKey = ipGeoCache.keys().next().value;
        if (firstKey) ipGeoCache.delete(firstKey);
      }
    }

    const distance = haversineDistance(latitude, longitude, venue.lat, venue.lon);

    return {
      blocked: distance <= radiusMiles,
      distanceMiles: Math.round(distance),
    };
  } catch {
    // If geo lookup fails, allow access rather than blocking legitimate users
    return { blocked: false, distanceMiles: null };
  }
}

/** Extract client IP from request headers. */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  );
}
