import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  // Check for email query param (for logged-in / email-based lookup)
  const email = req.nextUrl.searchParams.get('email');

  // 1. Try Supabase first
  if (email) {
    try {
      const supabase = createServerClient();
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, stripe_session_id, product_name, product_image, s3_key, purchase_type')
        .eq('email', email)
        .eq('purchase_type', 'vod');

      if (purchases && purchases.length > 0) {
        const products = purchases.map((p) => ({
          sessionId: p.stripe_session_id || p.id,
          name: p.product_name,
          image: p.product_image,
        }));
        return NextResponse.json({ purchased: true, products });
      }
    } catch (err) {
      console.error('Supabase lookup error:', err);
    }
  }

  // 2. Fall back to cookie-based lookup (backward compatibility)
  const cookieStore = await cookies();

  const raw = cookieStore.get('vod_sessions')?.value;
  let sessionIds: string[] = [];
  try {
    sessionIds = raw ? JSON.parse(raw) : [];
  } catch {
    sessionIds = [];
  }

  if (sessionIds.length === 0) {
    const legacy = cookieStore.get('vod_session')?.value;
    if (legacy) sessionIds = [legacy];
  }

  if (sessionIds.length === 0) {
    return NextResponse.json({ purchased: false, products: [] });
  }

  // Fetch product details for each session in parallel
  const products = (
    await Promise.all(
      sessionIds.map(async (sid) => {
        try {
          const session = await stripe.checkout.sessions.retrieve(sid, {
            expand: ['line_items.data.price.product'],
          });

          if (session.payment_status !== 'paid') return null;

          const lineItem = session.line_items?.data[0];
          const product = lineItem?.price?.product as Stripe.Product | undefined;

          if (!product || !product.metadata?.s3_key) return null;

          return {
            sessionId: sid,
            name: product.name,
            image: product.images?.[0] || null,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter(Boolean);

  return NextResponse.json({ purchased: products.length > 0, products });
}
