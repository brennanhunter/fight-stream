import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { verifyTvAuthToken } from '@/lib/tv-pairing';
import { REPLAY_WINDOW_DAYS } from '@/lib/constants';

/**
 * GET /api/tv/library
 *
 * Returns everything the authenticated TV identity (auth_token → email) has
 * access to right now:
 *   - vods: active replay purchases (not refunded, not expired)
 *   - live: any currently-active or recently-active event the user holds a
 *           PPV purchase for
 *
 * Data-driven entirely from `purchases` and `events` — adding a new event,
 * VOD product, or buyer doesn't require any code change here.
 *
 * Pagination: VODs are LIMIT'd (default 50, max 200) with an `offset` query
 * param. Most users will fit in one page. Live events are bounded by the
 * replay window so no paging needed.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'tv-library', 60);
  if (limited) return limited;

  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
  }

  const verified = await verifyTvAuthToken(match[1].trim());
  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired auth token' },
      { status: 401 },
    );
  }
  const email = verified.email;

  const url = req.nextUrl;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1),
    200,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get('offset') ?? '0', 10) || 0,
    0,
  );

  const supabase = createServerClient();
  const nowIso = new Date().toISOString();

  // ── VOD library ─────────────────────────────────────────────────────────
  const { data: vodRows, error: vodErr } = await supabase
    .from('purchases')
    .select(
      'id, product_name, product_image, expires_at, created_at, stripe_product_id',
    )
    .eq('email', email)
    .eq('purchase_type', 'vod')
    .is('refunded_at', null)
    .or(`expires_at.gt.${nowIso},expires_at.is.null`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (vodErr) {
    console.error('tv-library: vod query failed', vodErr);
    return NextResponse.json({ error: 'Library lookup failed' }, { status: 500 });
  }

  const vods = (vodRows ?? []).map((row) => ({
    purchase_id: row.id,
    title: row.product_name ?? 'Replay',
    thumbnail: row.product_image ?? null,
    expires_at: row.expires_at,
    purchased_at: row.created_at,
    product_id: row.stripe_product_id,
  }));

  // ── Live PPV access ─────────────────────────────────────────────────────
  // The user has live access to any event they hold a non-refunded, non-
  // expired PPV purchase for, AND that event is either currently active or
  // within its replay window. Driven entirely from `events.is_active` /
  // `events.is_streaming` / `events.date` — no hardcoding.
  const replayCutoff = new Date(
    Date.now() - REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: ppvRows, error: ppvErr } = await supabase
    .from('purchases')
    .select('event_id, expires_at')
    .eq('email', email)
    .eq('purchase_type', 'ppv')
    .is('refunded_at', null)
    .or(`expires_at.gt.${nowIso},expires_at.is.null`)
    .not('event_id', 'is', null);

  if (ppvErr) {
    console.error('tv-library: ppv query failed', ppvErr);
    return NextResponse.json({ error: 'Library lookup failed' }, { status: 500 });
  }

  const ppvEventIds = Array.from(
    new Set((ppvRows ?? []).map((r) => r.event_id).filter(Boolean) as string[]),
  );

  let live: Array<{
    event_id: string;
    name: string;
    date: string;
    is_streaming: boolean;
    is_active: boolean;
    thumbnail: string | null;
  }> = [];

  if (ppvEventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('id, name, date, is_active, is_streaming, ivs_playback_url')
      .in('id', ppvEventIds)
      .or(`is_active.eq.true,date.gte.${replayCutoff}`)
      .order('date', { ascending: false });

    live = (events ?? []).map((e) => ({
      event_id: e.id,
      name: e.name,
      date: e.date,
      is_streaming: !!e.is_streaming,
      is_active: !!e.is_active,
      thumbnail: null, // events don't carry an explicit thumbnail today; add later if needed
    }));
  }

  return NextResponse.json({
    email,
    vods,
    live,
    pagination: {
      limit,
      offset,
      // nextOffset is provided when this page is full — clients can keep
      // fetching until it's null/missing.
      next_offset: vods.length === limit ? offset + limit : null,
    },
  });
}
