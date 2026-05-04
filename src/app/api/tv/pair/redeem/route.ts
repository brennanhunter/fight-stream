import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/utils';
import { normalizeCode } from '@/lib/tv-pairing';

/**
 * Web user redeems a TV pairing code. Called from /activate after the user
 * types the code shown on their TV.
 *
 * Identity is required to redeem — we'll only authorize a TV for a real
 * person. Sources, in priority order:
 *   1. Logged-in Supabase user (preferred)
 *   2. customer_email cookie (set by the recover-vod magic link or by a
 *      VOD claim flow)
 *
 * Pairings are idempotent under contention via a partial-index UPDATE
 * on (id, status='pending') — concurrent redemption attempts can't
 * double-assign.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'tv-pair-redeem', 20);
  if (limited) return limited;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const code = normalizeCode(body.code ?? '');
  if (!code) {
    return NextResponse.json(
      { error: 'Enter the 6-character code shown on your TV.' },
      { status: 400 },
    );
  }

  // Resolve identity: auth user wins, fall back to customer_email cookie.
  let email: string | null = null;
  let userId: string | null = null;
  try {
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user?.email) {
      email = normalizeEmail(user.email);
      userId = user.id;
    }
  } catch {
    // Not logged in — fall through.
  }

  if (!email) {
    const cookieStore = await cookies();
    const cookieEmail = cookieStore.get('customer_email')?.value;
    if (cookieEmail) {
      email = normalizeEmail(decodeURIComponent(cookieEmail));
    }
  }

  if (!email) {
    return NextResponse.json(
      {
        error:
          'Sign in or recover access first so we know which account to pair this TV with.',
      },
      { status: 401 },
    );
  }

  // Per-email rate limit so a single account can't burn through codes.
  const emailLimited = await rateLimit(
    req,
    'tv-pair-redeem-email',
    20,
    60 * 60 * 1000,
    email,
  );
  if (emailLimited) return emailLimited;

  const supabase = createServerClient();

  // Look up the pending pairing. We do this as a separate read first so we
  // can return distinct error messages (unknown / expired / already used).
  const { data: pairing } = await supabase
    .from('tv_pairings')
    .select('id, status, expires_at')
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pairing) {
    return NextResponse.json(
      { error: "We couldn't find that code. Double-check what's on your TV." },
      { status: 404 },
    );
  }
  if (pairing.status === 'redeemed') {
    return NextResponse.json(
      { error: 'That code has already been used. Restart pairing on your TV.' },
      { status: 409 },
    );
  }
  if (
    pairing.status === 'expired' ||
    new Date(pairing.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: 'That code expired. Generate a new one on your TV.' },
      { status: 410 },
    );
  }

  // Atomic claim — only succeeds if the row is still pending.
  const { data: claimed, error: claimErr } = await supabase
    .from('tv_pairings')
    .update({
      status: 'redeemed',
      redeemed_email: email,
      redeemed_user_id: userId,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', pairing.id)
    .eq('status', 'pending')
    .select('id');

  if (claimErr) {
    console.error('tv-pair-redeem: update error', claimErr);
    return NextResponse.json(
      { error: 'Could not pair that TV. Try again.' },
      { status: 500 },
    );
  }
  if (!claimed || claimed.length === 0) {
    // Lost the race — another concurrent redeem won.
    return NextResponse.json(
      { error: 'That code was just used. Restart pairing on your TV.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
