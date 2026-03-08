import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
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
      .select('id, name, expires_at')
      .eq('is_active', true)
      .maybeSingle();

    const eventId = activeEvent?.id || 'unknown';
    const eventName = activeEvent?.name || 'Unknown Event';
    const expiresAt = activeEvent?.expires_at
      ? new Date(activeEvent.expires_at).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const promoEmail = email || 'promo@boxstreamtv.com';

    // Code is valid — grant access by creating a session
    const sessionData = {
      purchaseId: `promo-${code.trim().toUpperCase()}-${Date.now()}`,
      email: promoEmail,
      eventId,
      eventName,
      purchasedAt: new Date().toISOString(),
      expiresAt,
    };

    await createSession(sessionData);

    // Save promo redemption to Supabase
    try {
      await supabase.from('purchases').insert({
        email: promoEmail,
        purchase_type: 'ppv',
        stripe_payment_intent_id: sessionData.purchaseId,
        product_name: `${eventName} (Promo)`,
        event_id: eventId,
        amount_paid: 0,
        currency: 'usd',
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error('Supabase promo save error:', err);
    }

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
