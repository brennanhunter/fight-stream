import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'redeem-promo', 5);
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
      .select('id, name, expires_at')
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
    const expiresAt = activeEvent.expires_at
      ? new Date(activeEvent.expires_at).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const promoEmail = email.trim().toLowerCase();

    // Prevent duplicate redemptions for the same email + event
    const { data: existingPromo } = await supabase
      .from('purchases')
      .select('id')
      .eq('email', promoEmail)
      .eq('event_id', eventId)
      .eq('amount_paid', 0)
      .maybeSingle();

    if (existingPromo) {
      return NextResponse.json(
        { error: 'This email has already redeemed a promo code for this event.' },
        { status: 400 }
      );
    }

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
