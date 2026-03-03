import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  const cookieStore = await cookies();

  // Read the JSON array of session IDs
  const raw = cookieStore.get('vod_sessions')?.value;
  let sessionIds: string[] = [];
  try {
    sessionIds = raw ? JSON.parse(raw) : [];
  } catch {
    sessionIds = [];
  }

  // Fall back to the legacy single-value cookie so existing customers aren't lost
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
          // Session may have been deleted or be invalid – skip it
          return null;
        }
      }),
    )
  ).filter(Boolean);

  return NextResponse.json({ purchased: products.length > 0, products });
}
