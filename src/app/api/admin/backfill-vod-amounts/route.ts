import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!stripeServer) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const { hours } = await request.json().catch(() => ({}));
  const sinceIso =
    typeof hours === 'number' && hours > 0
      ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      : null;

  const supabase = createServerClient();

  let query = supabase
    .from('purchases')
    .select('id, email, product_name, amount_paid, stripe_session_id, created_at')
    .eq('purchase_type', 'vod')
    .not('stripe_session_id', 'is', null)
    .order('created_at', { ascending: false });

  if (sinceIso) {
    query = query.gte('created_at', sinceIso);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('Backfill VOD amounts: fetch error', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }

  let scanned = 0;
  let corrected = 0;
  let unchanged = 0;
  let lookupFailed = 0;
  const corrections: { email: string; product: string; from: number; to: number }[] = [];

  for (const row of rows ?? []) {
    scanned++;
    if (!row.stripe_session_id) continue;

    let session;
    try {
      session = await stripeServer.checkout.sessions.retrieve(row.stripe_session_id, {
        expand: ['line_items'],
      });
    } catch (err) {
      console.error('Backfill VOD amounts: stripe lookup failed for', row.id, err);
      lookupFailed++;
      continue;
    }

    const lineItem = session.line_items?.data[0];
    const actualAmount = lineItem?.amount_total ?? session.amount_total ?? null;
    if (actualAmount === null) {
      lookupFailed++;
      continue;
    }

    if (actualAmount === row.amount_paid) {
      unchanged++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('purchases')
      .update({ amount_paid: actualAmount })
      .eq('id', row.id);

    if (updateError) {
      console.error('Backfill VOD amounts: update failed for', row.id, updateError);
      lookupFailed++;
      continue;
    }

    corrected++;
    corrections.push({
      email: row.email,
      product: row.product_name ?? '—',
      from: row.amount_paid,
      to: actualAmount,
    });
  }

  return NextResponse.json({
    ok: true,
    scanned,
    corrected,
    unchanged,
    lookupFailed,
    sinceIso,
    corrections: corrections.slice(0, 50),
    truncatedCorrections: corrections.length > 50,
  });
}
