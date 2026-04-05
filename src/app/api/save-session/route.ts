import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'save-session', 30);
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
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    // Fetch product details from Stripe (one-time, then cached in DB)
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });

    if (!existing) {
      if (stripeSession.payment_status === 'paid') {
        const lineItem = stripeSession.line_items?.data[0];
        const product = lineItem?.price?.product as Stripe.Product | undefined;
        const price = lineItem?.price;

        if (product?.metadata?.s3_key) {
          const customerEmail = stripeSession.customer_details?.email?.toLowerCase().trim();
          if (!customerEmail) {
            console.warn('Save-session: No customer email for session', sessionId);
          } else {
            const userId = stripeSession.metadata?.user_id || null;
            await supabase.from('purchases').insert({
              email: customerEmail,
              purchase_type: 'vod',
              stripe_session_id: sessionId,
              stripe_product_id: product.id,
              product_name: product.name,
              product_image: product.images?.[0] || null,
              s3_key: product.metadata.s3_key,
              amount_paid: price?.unit_amount || 0,
              currency: price?.currency || 'usd',
              expires_at: null,
              user_id: userId,
            });
          }
        }
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
    const email = stripeSession.customer_details?.email?.toLowerCase().trim();
    if (email) {
      cookieStore.set('customer_email', email, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return NextResponse.json({ success: true });
}
