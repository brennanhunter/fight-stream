import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { verifyTvAuthToken } from '@/lib/tv-pairing';

/**
 * POST /api/tv/playback
 *
 * Body: { purchase_id: string }   → signs and returns a VOD playback URL
 *   OR  { event_id: string }      → mints an IVS JWT for a live PPV
 *
 * Auth: `Authorization: Bearer <auth_token>` from the pairing flow.
 *
 * Strictly verifies the auth_token's email owns the requested resource
 * before issuing any signed URL or IVS token. No hardcoded IDs — purely
 * driven by the same `purchases` / `events` rows the web app reads.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'tv-playback', 60);
  if (limited) return limited;

  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
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

  let body: { purchase_id?: string; event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const purchaseId = body.purchase_id?.trim();
  const eventId = body.event_id?.trim();
  if (!purchaseId && !eventId) {
    return NextResponse.json(
      { error: 'Provide purchase_id or event_id' },
      { status: 400 },
    );
  }
  if (purchaseId && eventId) {
    return NextResponse.json(
      { error: 'Provide exactly one of purchase_id or event_id' },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // ── VOD playback ────────────────────────────────────────────────────────
  if (purchaseId) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select(
        'id, email, s3_key, product_name, expires_at, refunded_at, purchase_type',
      )
      .eq('id', purchaseId)
      .maybeSingle();

    if (!purchase || purchase.purchase_type !== 'vod') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (purchase.email !== email) {
      // Don't reveal whether the row exists — same response as not-found.
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (purchase.refunded_at) {
      return NextResponse.json({ error: 'Refunded' }, { status: 410 });
    }
    if (
      purchase.expires_at &&
      new Date(purchase.expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 });
    }
    if (!purchase.s3_key) {
      return NextResponse.json({ error: 'Not yet available' }, { status: 503 });
    }

    const s3Key = purchase.s3_key;
    const isHls = s3Key.endsWith('.m3u8') || s3Key.includes('/hls/');
    const prefix = isHls
      ? s3Key.substring(0, s3Key.lastIndexOf('/') + 1)
      : s3Key;
    const sig = crypto
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(prefix)
      .digest('hex');

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(req.url).origin;

    const url = `${baseUrl}/api/vod/${s3Key}?token=${sig}&prefix=${encodeURIComponent(prefix)}`;
    return NextResponse.json({
      kind: 'vod',
      url,
      title: purchase.product_name ?? 'Replay',
      expires_at: purchase.expires_at,
    });
  }

  // ── Live PPV playback (IVS) ─────────────────────────────────────────────
  const { data: event } = await supabase
    .from('events')
    .select('id, name, date, is_streaming, ivs_channel_arn, ivs_playback_url')
    .eq('id', eventId!)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Verify the user holds a non-refunded, non-expired PPV for this event.
  const nowIso = new Date().toISOString();
  const { data: hasPpv } = await supabase
    .from('purchases')
    .select('id')
    .eq('email', email)
    .eq('event_id', event.id)
    .eq('purchase_type', 'ppv')
    .is('refunded_at', null)
    .or(`expires_at.gt.${nowIso},expires_at.is.null`)
    .limit(1)
    .maybeSingle();

  if (!hasPpv) {
    return NextResponse.json({ error: 'No access to this event' }, { status: 403 });
  }

  const channelArn = event.ivs_channel_arn || process.env.IVS_CHANNEL_ARN;
  const playbackUrl = event.ivs_playback_url || process.env.IVS_PLAYBACK_URL;
  const privateKey = process.env.IVS_PRIVATE_KEY;
  if (!channelArn || !playbackUrl || !privateKey) {
    return NextResponse.json(
      { error: 'Stream not configured for this event' },
      { status: 503 },
    );
  }

  const ttlSeconds = 60 * 60 * 12; // 12h — covers any conceivable live event
  const expSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const ivsToken = jwt.sign(
    {
      'aws:channel-arn': channelArn,
      'aws:access-control-allow-origin': process.env.NEXT_PUBLIC_SITE_URL,
      exp: expSeconds,
    },
    privateKey,
    {
      algorithm: 'ES384',
      keyid: process.env.IVS_KEY_PAIR_ARN,
    },
  );

  return NextResponse.json({
    kind: 'live',
    playback_url: playbackUrl,
    token: ivsToken,
    token_expires_at: new Date(expSeconds * 1000).toISOString(),
    title: event.name,
    is_streaming: !!event.is_streaming,
    event_date: event.date,
  });
}
