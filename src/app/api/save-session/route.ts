import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { stripeServer } from '@/lib/stripe';
import { normalizeEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  if (!stripeServer) {
    return NextResponse.json({ error: 'Payment system is not configured.' }, { status: 500 });
  }

  const limited = await rateLimit(req, 'save-session', 30);
  if (limited) return limited;

  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  // Fetch session from Stripe once, reuse for both DB save and email cookie
  let stripeSession: Stripe.Checkout.Session | null = null;

  try {
    const supabase = createServerClient();

    // Check if this session is already saved
    const { data: existing } = await supabase
      .from('purchases')
      .select('id, session_claimed_at')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    // Fetch product details from Stripe (one-time, then cached in DB)
    stripeSession = await stripeServer.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });

    const CLAIM_GRACE_MS = 15 * 60 * 1000;

    if (!existing) {
      if (stripeSession.payment_status === 'paid') {
        const lineItem = stripeSession.line_items?.data[0];
        const product = lineItem?.price?.product as Stripe.Product | undefined;
        const price = lineItem?.price;

        if (product?.metadata?.s3_key) {
          const customerEmail = stripeSession.customer_details?.email ? normalizeEmail(stripeSession.customer_details.email) : undefined;
          if (!customerEmail) {
            console.warn('Save-session: No customer email for session', sessionId);
          } else {
            const userId = stripeSession.metadata?.user_id || null;
            const paymentIntentId = typeof stripeSession.payment_intent === 'string'
              ? stripeSession.payment_intent
              : stripeSession.payment_intent?.id || null;
            await supabase.from('purchases').upsert({
              email: customerEmail,
              purchase_type: 'vod',
              stripe_session_id: sessionId,
              stripe_payment_intent_id: paymentIntentId,
              stripe_product_id: product.id,
              product_name: product.name,
              product_image: product.images?.[0] || null,
              s3_key: product.metadata.s3_key,
              amount_paid: price?.unit_amount || 0,
              currency: price?.currency || 'usd',
              expires_at: null,
              user_id: userId,
              session_claimed_at: new Date().toISOString(),
              session_version: 1,
            }, { onConflict: 'stripe_session_id' });
          }
        }
      }
    } else {
      // Session already in DB — check whether the grace window has passed.
      // If it has, skip setting cookies so the original buyer is not displaced.
      const claimedAt = existing.session_claimed_at
        ? new Date(existing.session_claimed_at).getTime()
        : null;

      if (claimedAt !== null && Date.now() - claimedAt > CLAIM_GRACE_MS) {
        return NextResponse.json({ success: true });
      }

      // First claim (session_claimed_at not set yet) — record it now.
      if (claimedAt === null) {
        await supabase
          .from('purchases')
          .update({ session_claimed_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    }
  } catch (err) {
    console.error('Supabase save error:', err);
    // Don't fail the request — cookie fallback still works
  }

  // Keep cookie fallback for backward compatibility
  const cookieStore = await cookies();

  const existing = cookieStore.get('vod_sessions')?.value;
  let sessionIds: string[] = [];
  try {
    sessionIds = existing ? JSON.parse(existing) : [];
  } catch {
    sessionIds = [];
  }

  const legacy = cookieStore.get('vod_session')?.value;
  if (legacy && !sessionIds.includes(legacy)) {
    sessionIds.push(legacy);
  }

  if (!sessionIds.includes(sessionId)) {
    sessionIds.push(sessionId);
  }

  cookieStore.set('vod_sessions', JSON.stringify(sessionIds), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  cookieStore.set('vod_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  // Store customer email in a readable cookie — reuse the already-fetched session
  if (stripeSession) {
    const email = stripeSession.customer_details?.email ? normalizeEmail(stripeSession.customer_details.email) : undefined;
    if (email) {
      cookieStore.set('customer_email', email, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days — covers replay window
      });
    }
  }

  return NextResponse.json({ success: true });
}
