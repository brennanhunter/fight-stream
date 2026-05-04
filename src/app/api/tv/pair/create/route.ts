import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import {
  generatePairingCode,
  generateDeviceToken,
  hashDeviceToken,
  PAIRING_TTL_MS,
} from '@/lib/tv-pairing';

const MAX_CODE_RETRIES = 5;

/**
 * TV app calls this on launch (or when the user lands on the pairing
 * screen). Creates a pending pairing row, returns:
 *   - `code`: shown to the user, e.g. "ABC-DEF"
 *   - `device_token`: held by the TV, used to authorize /status polls
 *   - `expires_at`: TV should restart pairing if the user doesn't redeem in time
 *
 * No auth required — anyone can request a pairing code. The code alone
 * grants nothing; redemption requires a logged-in user.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'tv-pair-create', 30);
  if (limited) return limited;

  let body: { device_kind?: string; device_label?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — both fields are optional.
  }

  const supabase = createServerClient();
  const deviceToken = generateDeviceToken();
  const deviceTokenHash = hashDeviceToken(deviceToken);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

  // Retry on the rare collision against a still-pending code.
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generatePairingCode();
    const { data, error } = await supabase
      .from('tv_pairings')
      .insert({
        code,
        device_token_hash: deviceTokenHash,
        status: 'pending',
        device_kind: body.device_kind ?? null,
        device_label: body.device_label ?? null,
        expires_at: expiresAt,
      })
      .select('id, code, expires_at')
      .single();

    if (data) {
      return NextResponse.json({
        pairing_id: data.id,
        code: data.code,
        device_token: deviceToken,
        expires_at: data.expires_at,
        poll_interval_seconds: 5,
      });
    }
    // Postgres unique violation on the partial index — try a fresh code.
    if (error?.code !== '23505') {
      console.error('tv-pair-create: unexpected insert error', error);
      return NextResponse.json(
        { error: 'Could not create pairing' },
        { status: 500 },
      );
    }
  }

  console.error('tv-pair-create: exhausted code retries');
  return NextResponse.json(
    { error: 'Could not create pairing — try again' },
    { status: 503 },
  );
}
