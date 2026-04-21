import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { stripeServer } from '@/lib/stripe';
import { createSession, getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { purchaseConfirmationEmail } from '@/lib/emails/purchase-confirmation';
import { REPLAY_WINDOW_DAYS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'verify-payment', 20);
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
        { error: 'payment_incomplete' },
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
        .select('id, name, date, is_streaming')
        .eq('id', metadataEventId)
        .maybeSingle();
      activeEvent = data;
    }

    // Fall back to active event only if no metadata eventId was specified
    if (!activeEvent && !metadataEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, date, is_streaming')
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
    const isStreaming = activeEvent.is_streaming ?? false;
    const expiresAt = activeEvent.date
      ? new Date(new Date(activeEvent.date).getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Read optional boxer code from Stripe custom field
    const boxerField = checkoutSession.custom_fields?.find((f) => f.key === 'boxer_code');
    const boxerName = boxerField?.text?.value?.trim().toLowerCase() || null;

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
      : checkoutSession.payment_intent?.id || null;

    // For 100% discount checkouts, payment_intent is null — use session ID as dedup key
    const deduplicationId = paymentIntentId || sessionId;

    // Prevent duplicate inserts on page refresh
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id, session_version, session_claimed_at')
      .eq('stripe_payment_intent_id', deduplicationId)
      .maybeSingle();

    // Grace window: allow re-claims within 15 minutes of the original claim
    // (handles page refresh). After that, the session is locked to the first
    // browser that claimed it — subsequent callers get a success response but
    // no cookies, so the original buyer's session is never revoked.
    const CLAIM_GRACE_MS = 15 * 60 * 1000;
    let sessionVersion = 1;

    if (existingPurchase) {
      const claimedAt = existingPurchase.session_claimed_at
        ? new Date(existingPurchase.session_claimed_at).getTime()
        : null;

      if (claimedAt !== null && Date.now() - claimedAt > CLAIM_GRACE_MS) {
        // Session already claimed outside the grace window — return success
        // without issuing new cookies so the original buyer is not displaced.
        return NextResponse.json({
          success: true,
          message: 'Payment verified and access granted',
          eventAccess: { eventId, eventName, expiresAt, isStreaming },
        });
      }

      // Within grace window (or first claim) — re-issue with the existing
      // session_version so the original buyer's JWT stays valid.
      sessionVersion = existingPurchase.session_version || 1;

      if (claimedAt === null) {
        // First actual claim — use a conditional update (.is null guard) so only
        // one concurrent request wins. If 0 rows come back, another tab already
        // claimed it; return success without issuing new cookies.
        const { data: claimed } = await supabase
          .from('purchases')
          .update({ session_claimed_at: new Date().toISOString(), session_version: sessionVersion, expires_at: expiresAt })
          .eq('id', existingPurchase.id)
          .is('session_claimed_at', null)
          .select('id');

        if (!claimed || claimed.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'Payment verified and access granted',
            eventAccess: { eventId, eventName, expiresAt, isStreaming },
          });
        }
      } else {
        // Re-claim within grace window. Only re-issue cookies to the original
        // buyer's browser (which already has the ppv_session cookie from the
        // first claim). If there's no matching session cookie, this is likely
        // a different device visiting the shared success URL — return success
        // but don't issue new credentials.
        const existingSession = await getSession();
        if (!existingSession || existingSession.purchaseId !== deduplicationId) {
          return NextResponse.json({
            success: true,
            message: 'Payment verified and access granted',
            eventAccess: { eventId, eventName, expiresAt, isStreaming },
          });
        }
      }
    }

    const sessionData = {
      purchaseId: deduplicationId,
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
      maxAge: 60 * 60 * 24 * 7, // 7 days — covers replay window
    });

    // isFirstClaim: true if this is the very first time the success page is hit
    // (session_claimed_at was null before this request). Covers both cases:
    // - webhook hasn't fired yet (existingPurchase is null)
    // - webhook already wrote the row but nobody has visited the success page yet
    const isFirstClaim = !existingPurchase || existingPurchase.session_claimed_at === null;

    // Upsert PPV purchase to handle race with webhook
    if (!existingPurchase) {
      const userId = checkoutSession.metadata?.user_id || null;
      const { error: upsertError } = await supabase.from('purchases').upsert({
        email: customerEmail,
        purchase_type: 'ppv',
        stripe_payment_intent_id: deduplicationId,
        stripe_product_id: null,
        product_name: eventName,
        event_id: eventId,
        amount_paid: checkoutSession.amount_total || 0,
        currency: checkoutSession.currency || 'usd',
        expires_at: expiresAt,
        user_id: userId,
        boxer_name: boxerName,
        session_claimed_at: new Date().toISOString(),
      }, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true });

      if (upsertError) console.error('Supabase PPV save error:', upsertError);
      else console.log('Supabase PPV purchase saved for:', customerEmail);

      // If the upsert was skipped (webhook inserted between our SELECT and upsert),
      // ensure session_claimed_at is set so a second visitor can't claim cookies.
      await supabase
        .from('purchases')
        .update({ session_claimed_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', deduplicationId)
        .is('session_claimed_at', null);
    }

    // Send confirmation email on the first claim regardless of insert/upsert path
    if (isFirstClaim) {
      try {
        const { html, text } = purchaseConfirmationEmail({
          eventName,
          expiresAt,
          amountPaid: checkoutSession.amount_total || 0,
        });
        await resend.emails.send({
          from: 'BoxStreamTV <hunter@boxstreamtv.com>',
          replyTo: 'hunter@boxstreamtv.com',
          to: customerEmail,
          subject: `You're in — ${eventName}`,
          html,
          text,
        });
      } catch (emailErr) {
        console.error('Confirmation email failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and access granted',
      eventAccess: {
        eventId: sessionData.eventId,
        eventName: sessionData.eventName,
        expiresAt: sessionData.expiresAt,
        isStreaming,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'verification_failed' },
      { status: 500 }
    );
  }
}
