import { headers } from 'next/headers';

interface GeoResult {
  blocked: boolean;
  distanceMiles: number | null;
}

interface VenueCoords {
  lat: number;
  lon: number;
}

const geocodeCache = new Map<string, VenueCoords>();

/** Geocode an address to lat/lon using OpenStreetMap Nominatim. */
async function geocodeAddress(address: string): Promise<VenueCoords | null> {
  const cached = geocodeCache.get(address);
  if (cached) return cached;

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
  geocodeCache.set(address, coords);
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

    const res = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, {
      cache: 'no-store',
    });

    if (!res.ok) return { blocked: false, distanceMiles: null };

    const data = await res.json();
    if (!data.success) return { blocked: false, distanceMiles: null };
    const { latitude, longitude } = data;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { blocked: false, distanceMiles: null };
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
