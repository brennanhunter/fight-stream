import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { REPLAY_WINDOW_DAYS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'redeem-promo', 5);
  if (limited) return limited;

  try {
    const { code, email } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email is required to redeem a promo code' },
        { status: 400 }
      );
    }

    const validCode = process.env.PPV_PROMO_CODE;

    if (!validCode) {
      return NextResponse.json(
        { error: 'No promo codes are currently active' },
        { status: 400 }
      );
    }

    // Case-insensitive comparison
    if (code.trim().toUpperCase() !== validCode.trim().toUpperCase()) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    // Get active event from Supabase
    const supabase = createServerClient();
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeEvent) {
      return NextResponse.json(
        { error: 'No active event configured.' },
        { status: 400 }
      );
    }

    const eventId = activeEvent.id;
    const eventName = activeEvent.name;
    const expiresAt = activeEvent.date
      ? new Date(new Date(activeEvent.date).getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const promoEmail = email.trim().toLowerCase();

    // Atomic upsert: prevent race condition on duplicate redemption.
    // Uses ON CONFLICT to guarantee only one redemption per email+event+promo.
    const purchaseId = crypto.randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from('purchases')
      .upsert({
        id: purchaseId,
        email: promoEmail,
        purchase_type: 'ppv',
        stripe_payment_intent_id: `promo-${code.trim().toUpperCase()}-${purchaseId}`,
        product_name: `${eventName} (Promo)`,
        event_id: eventId,
        amount_paid: 0,
        currency: 'usd',
        expires_at: expiresAt,
      }, { onConflict: 'email,event_id,amount_paid', ignoreDuplicates: true })
      .select('id');

    // If no row returned, it was a duplicate
    if (!inserted?.length) {
      return NextResponse.json(
        { error: 'This email has already redeemed a promo code for this event.' },
        { status: 400 }
      );
    }

    if (insertError) {
      console.error('Supabase promo save error:', insertError);
      return NextResponse.json(
        { error: 'Failed to redeem promo code' },
        { status: 500 }
      );
    }

    // Code is valid — grant access by creating a session
    const sessionData = {
      purchaseId: inserted[0].id,
      email: promoEmail,
      eventId,
      eventName,
      purchasedAt: new Date().toISOString(),
      expiresAt,
    };

    await createSession(sessionData);

    return NextResponse.json({
      success: true,
      message: 'Promo code redeemed! Access granted.',
    });
  } catch (error) {
    console.error('Promo redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem promo code' },
      { status: 500 }
    );
  }
}
