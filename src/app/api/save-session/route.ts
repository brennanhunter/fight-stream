import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  // Save to Supabase
  try {
    const supabase = createServerClient();

    // Check if this session is already saved
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (!existing) {
      // Fetch product details from Stripe (one-time, then cached in DB)
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product'],
      });

      if (session.payment_status === 'paid') {
        const lineItem = session.line_items?.data[0];
        const product = lineItem?.price?.product as Stripe.Product | undefined;
        const price = lineItem?.price;

        if (product?.metadata?.s3_key) {
          const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          await supabase.from('purchases').insert({
            email: session.customer_details?.email || 'unknown@boxstreamtv.com',
            purchase_type: 'vod',
            stripe_session_id: sessionId,
            stripe_product_id: product.id,
            product_name: product.name,
            product_image: product.images?.[0] || null,
            s3_key: product.metadata.s3_key,
            amount_paid: price?.unit_amount || 0,
            currency: price?.currency || 'usd',
            expires_at: expiresAt,
          });
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

  // Store customer email in a readable cookie for Supabase lookups
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email;
    if (email) {
      cookieStore.set('customer_email', email, {
        httpOnly: false, // readable by client JS
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  } catch {
    // email cookie is best-effort
  }

  return NextResponse.json({ success: true });
}
