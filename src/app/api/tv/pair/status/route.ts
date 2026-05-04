import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import {
  hashDeviceToken,
  generateTvAuthToken,
  TV_AUTH_TTL_MS,
} from '@/lib/tv-pairing';

/**
 * TV polls this endpoint until status flips to 'redeemed'. Auth is via the
 * device_token (Authorization: Bearer <token>) — the code alone cannot poll.
 *
 * Responses:
 *   { status: 'pending' }                 → keep polling
 *   { status: 'expired' }                 → start over (POST /create)
 *   { status: 'redeemed', auth_token,
 *     email, auth_expires_at }            → store auth_token locally
 *
 * The auth_token is single-issuance — once handed out, this endpoint won't
 * mint another for the same pairing. If a TV needs a fresh token after the
 * 30-day TTL it should pair again (the user has to re-authorize, which is
 * the right security property).
 */
export async function GET(req: NextRequest) {
  // Generous limit — TVs poll every ~5s for up to 10 minutes.
  const limited = await rateLimit(req, 'tv-pair-status', 240);
  if (limited) return limited;

  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json(
      { error: 'Missing device token' },
      { status: 401 },
    );
  }
  const deviceToken = match[1].trim();
  const tokenHash = hashDeviceToken(deviceToken);

  const supabase = createServerClient();
  const { data: pairing } = await supabase
    .from('tv_pairings')
    .select(
      'id, status, redeemed_email, redeemed_at, expires_at, last_polled_at',
    )
    .eq('device_token_hash', tokenHash)
    .maybeSingle();

  if (!pairing) {
    return NextResponse.json({ error: 'Unknown device' }, { status: 404 });
  }

  // Best-effort poll timestamp — useful for debugging stuck devices.
  supabase
    .from('tv_pairings')
    .update({ last_polled_at: new Date().toISOString() })
    .eq('id', pairing.id)
    .then(() => {});

  // Lazy expiry — the row only flips once anyone observes it past expiry.
  const now = Date.now();
  if (
    pairing.status === 'pending' &&
    new Date(pairing.expires_at).getTime() < now
  ) {
    await supabase
      .from('tv_pairings')
      .update({ status: 'expired' })
      .eq('id', pairing.id)
      .eq('status', 'pending');
    return NextResponse.json({ status: 'expired' });
  }

  if (pairing.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }
  if (pairing.status === 'expired') {
    return NextResponse.json({ status: 'expired' });
  }

  // Redeemed — mint and return the auth_token.
  if (!pairing.redeemed_email) {
    console.error('tv-pair-status: redeemed pairing missing email', pairing.id);
    return NextResponse.json(
      { error: 'Pairing in inconsistent state' },
      { status: 500 },
    );
  }
  const { token, expiresAt } = await generateTvAuthToken(
    pairing.redeemed_email,
    TV_AUTH_TTL_MS,
  );
  return NextResponse.json({
    status: 'redeemed',
    email: pairing.redeemed_email,
    auth_token: token,
    auth_expires_at: expiresAt,
  });
}
