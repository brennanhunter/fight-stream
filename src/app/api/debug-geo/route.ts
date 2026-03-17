import { NextResponse } from 'next/server';
import { checkGeoRestriction } from '@/lib/geo';
import { createServerClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('venue_address, blackout_radius_miles')
    .eq('is_active', true)
    .maybeSingle();

  let geoResult = null;
  let nominatimResult = null;
  let ipApiResult = null;

  if (event?.venue_address) {
    // Test Nominatim geocode
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.venue_address)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'boxstreamtv-geo-check' }, cache: 'no-store' }
      );
      nominatimResult = await nomRes.json();
    } catch (e) {
      nominatimResult = { error: String(e) };
    }

    // Test IP geolocation
    if (ip) {
      try {
        const ipRes = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { cache: 'no-store' });
        ipApiResult = await ipRes.json();
      } catch (e) {
        ipApiResult = { error: String(e) };
      }
    }

    geoResult = await checkGeoRestriction(event.venue_address, event.blackout_radius_miles ?? 90);
  }

  return NextResponse.json({
    clientIp: ip,
    event: event ? { venue_address: event.venue_address, blackout_radius_miles: event.blackout_radius_miles } : null,
    nominatim: nominatimResult,
    ipApi: ipApiResult,
    geoResult,
  });
}
