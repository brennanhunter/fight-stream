import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'stream-status', 60);
  if (limited) return limited;

  const supabase = createServerClient();
  const { data } = await supabase
    .from('events')
    .select('is_streaming')
    .eq('is_active', true)
    .maybeSingle();

  const response = NextResponse.json({ live: data?.is_streaming ?? false });
  // Cache at the edge for 10 seconds — 1000 concurrent viewers share one Supabase query
  // instead of each making their own. Stream start/stop propagates within 10s.
  response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=5');
  return response;
}
