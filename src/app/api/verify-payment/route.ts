import { NextRequest, NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'verify-payment', 20);
  if (limited) return limited;

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

    // Get event from checkout metadata, falling back to active event
    const supabase = createServerClient();
    const metadataEventId = checkoutSession.metadata?.eventId;

    let activeEvent;
    if (metadataEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('id', metadataEventId)
        .maybeSingle();
      activeEvent = data;
    }

    // Fall back to active event only if no metadata eventId was specified
    if (!activeEvent && !metadataEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('is_active', true)
        .maybeSingle();
      activeEvent = data;
    }

    if (!activeEvent) {
      return NextResponse.json(
        { error: 'No active event configured. Please contact support.' },
        { status: 400 }
      );
    }

    const eventId = activeEvent.id;
    const eventName = activeEvent.name;
    const expiresAt = activeEvent.expires_at
      ? new Date(activeEvent.expires_at).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const customerEmail = checkoutSession.customer_details?.email?.toLowerCase().trim();
    if (!customerEmail) {
      console.warn('No customer email from Stripe for session:', sessionId);
      return NextResponse.json(
        { error: 'No email found on checkout session. Please contact support.' },
        { status: 400 }
      );
    }
    const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || sessionId;

    // Prevent duplicate inserts on page refresh
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id, session_version')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    // Bump session_version (invalidates any other active session for this purchase)
    let sessionVersion = 1;
    if (existingPurchase) {
      sessionVersion = (existingPurchase.session_version || 0) + 1;
      await supabase
        .from('purchases')
        .update({ session_version: sessionVersion })
        .eq('id', existingPurchase.id);
    }

    const sessionData = {
      purchaseId: paymentIntentId,
      email: customerEmail,
      eventId,
      eventName,
      purchasedAt: new Date().toISOString(),
      expiresAt,
      sessionVersion,
    };

    await createSession(sessionData);

    // Store customer email for future Supabase lookups
    const { cookies: getCookies } = await import('next/headers');
    const cookieStore = await getCookies();
    cookieStore.set('customer_email', customerEmail, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    // Save PPV purchase to Supabase (skip if already saved)
    if (!existingPurchase) {
      const userId = checkoutSession.metadata?.user_id || null;
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
        user_id: userId,
      });

      if (insertError) {
        console.error('Supabase PPV save error:', insertError);
      } else {
        console.log('Supabase PPV purchase saved for:', customerEmail);
      }
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
