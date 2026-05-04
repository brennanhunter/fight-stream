import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';
import { getProducts } from '@/lib/vod';
import { verifyTvAuthToken } from '@/lib/tv-pairing';

/**
 * GET /api/tv/catalog
 *
 * Public — no auth required. Returns what's available to buy or watch right
 * now on the TV. Mirrors what a viewer would see browsing boxstreamtv.com:
 *   - active live PPV event (if any)
 *   - VOD products on sale (from Stripe, the source of truth for the catalog)
 *
 * If an `Authorization: Bearer <auth_token>` header is provided, the
 * response is enriched with `owned: true` flags on items the viewer holds —
 * the TV uses those flags to show "Watch" instead of "Buy" inline.
 *
 * No event/product IDs hardcoded; everything is read from `events` (DB) and
 * Stripe products (already filtered by `metadata.site === 'boxstreamtv'`).
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, 'tv-catalog', 60);
  if (limited) return limited;

  // Optional auth — enriches the response but never gates it.
  let viewerEmail: string | null = null;
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const verified = await verifyTvAuthToken(m[1].trim());
    if (verified) viewerEmail = verified.email;
  }

  const supabase = createServerClient();

  // ── Live event currently active or on-air ──────────────────────────────
  const { data: liveEvent } = await supabase
    .from('events')
    .select('id, name, date, is_active, is_streaming, stripe_price_id')
    .or('is_active.eq.true,is_streaming.eq.true')
    .order('is_streaming', { ascending: false })
    .order('is_active', { ascending: false })
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve the live event's poster image via Stripe (same pattern the
  // homepage EventHero uses).
  let livePoster: string | null = null;
  if (liveEvent?.stripe_price_id && stripeServer) {
    try {
      const price = await stripeServer.prices.retrieve(liveEvent.stripe_price_id, {
        expand: ['product'],
      });
      const product = price.product as Stripe.Product;
      livePoster = product?.images?.[0] ?? null;
    } catch (err) {
      console.error('tv-catalog: stripe price retrieve failed', err);
    }
  }

  // ── VOD products on sale (Stripe) ──────────────────────────────────────
  const products = await getProducts();
  const onSale = products.filter((p) => p.available);

  // ── Ownership lookup (only when authed) ────────────────────────────────
  let ownedProductIds = new Set<string>();
  const ownedLiveEventIds = new Set<string>();
  if (viewerEmail) {
    const nowIso = new Date().toISOString();

    const { data: vodRows } = await supabase
      .from('purchases')
      .select('stripe_product_id')
      .eq('email', viewerEmail)
      .eq('purchase_type', 'vod')
      .is('refunded_at', null)
      .or(`expires_at.gt.${nowIso},expires_at.is.null`);

    ownedProductIds = new Set(
      (vodRows ?? [])
        .map((r) => r.stripe_product_id)
        .filter((id): id is string => !!id),
    );

    if (liveEvent?.id) {
      const { data: ppvRows } = await supabase
        .from('purchases')
        .select('id')
        .eq('email', viewerEmail)
        .eq('event_id', liveEvent.id)
        .eq('purchase_type', 'ppv')
        .is('refunded_at', null)
        .or(`expires_at.gt.${nowIso},expires_at.is.null`)
        .limit(1);
      if (ppvRows && ppvRows.length > 0) {
        ownedLiveEventIds.add(liveEvent.id);
      }
    }
  }

  return NextResponse.json({
    live: liveEvent
      ? {
          event_id: liveEvent.id,
          name: liveEvent.name,
          date: liveEvent.date,
          is_streaming: !!liveEvent.is_streaming,
          is_active: !!liveEvent.is_active,
          poster_image: livePoster,
          owned: ownedLiveEventIds.has(liveEvent.id),
        }
      : null,
    vods: onSale.map((p) => ({
      product_id: p.id,
      name: p.name,
      description: p.description,
      image: p.image,
      price: p.price,
      currency: p.currency,
      event_slug: p.eventSlug,
      event_name: p.eventName,
      event_date: p.eventDate,
      event_image: p.eventImage,
      owned: ownedProductIds.has(p.id),
    })),
    viewer: viewerEmail ? { email: viewerEmail } : null,
  });
}
