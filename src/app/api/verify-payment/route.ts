import { NextRequest, NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Checkout session ID is required' },
        { status: 400 }
      );
    }

    if (!stripeServer) {
      console.error('Stripe is not configured - STRIPE_SECRET_KEY is missing');
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Retrieve the Checkout Session from Stripe
    const checkoutSession = await stripeServer.checkout.sessions.retrieve(sessionId);

    // 'paid' for normal payments, 'no_payment_required' for 100% discount promo codes
    if (checkoutSession.payment_status !== 'paid' && checkoutSession.payment_status !== 'no_payment_required') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${checkoutSession.payment_status}` },
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

    const customerEmail = (checkoutSession.customer_details?.email || 'customer@example.com').toLowerCase().trim();
    const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || sessionId;

    const sessionData = {
      purchaseId: paymentIntentId,
      email: customerEmail,
      eventId,
      eventName,
      purchasedAt: new Date().toISOString(),
      expiresAt,
    };

    await createSession(sessionData);

    // Store customer email for future Supabase lookups
    const { cookies: getCookies } = await import('next/headers');
    const cookieStore = await getCookies();
    if (customerEmail && customerEmail !== 'customer@example.com') {
      cookieStore.set('customer_email', customerEmail, {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // Save PPV purchase to Supabase
    const { error: insertError } = await supabase.from('purchases').insert({
      email: customerEmail,
      purchase_type: 'ppv',
      stripe_payment_intent_id: paymentIntentId,
      stripe_product_id: null,
      product_name: eventName,
      event_id: eventId,
      amount_paid: checkoutSession.amount_total || 0,
      currency: checkoutSession.currency || 'usd',
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Supabase PPV save error:', insertError);
    } else {
      console.log('Supabase PPV purchase saved for:', customerEmail);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and access granted',
      eventAccess: {
        eventId: sessionData.eventId,
        eventName: sessionData.eventName,
        expiresAt: sessionData.expiresAt,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
