import Stripe from 'stripe';
import { stripeServer } from '@/lib/stripe';

export interface VodProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string | null;
  currency: string;
  priceId: string | undefined;
  note: string | null;
  available: boolean;
  featured: string | null;
  sortOrder: number;
  eventSlug: string;
  eventName: string;
  eventDate: string;
  eventImage: string | null;
}

export interface EventGroup {
  slug: string;
  name: string;
  date: string;
  image: string | null;
  hasFeaturedFight: boolean;
  hasFullEvent: boolean;
  fightCount: number;
  products: VodProduct[];
}

export async function getProducts(): Promise<VodProduct[]> {
  if (!stripeServer) return [];
  const products: Stripe.Product[] = [];
  for await (const product of stripeServer.products.list({ active: true, expand: ['data.default_price'], limit: 100 })) {
    products.push(product);
  }

  return products
    .filter((p) => p.metadata.site === 'boxstreamtv' && (p.metadata.s3_key || p.metadata.available === 'false'))
    .map((p) => {
      const price = p.default_price as Stripe.Price;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0] || null,
        price: price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : null,
        currency: price?.currency || 'usd',
        priceId: price?.id,
        note: p.metadata.note || null,
        available: p.metadata.available !== 'false',
        featured: p.metadata.featured || null,
        sortOrder: parseInt(p.metadata.sort_order || '99', 10),
        eventSlug: p.metadata.event_slug || 'uncategorized',
        eventName: p.metadata.event_name || 'Other Fights',
        eventDate: p.metadata.event_date || '2020-01-01',
        eventImage: p.metadata.event_image
          ? p.metadata.event_image.startsWith('/') || p.metadata.event_image.startsWith('http')
            ? p.metadata.event_image
            : `/${p.metadata.event_image}`
          : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function groupByEvent(products: VodProduct[]): EventGroup[] {
  const groups: Record<string, EventGroup> = {};

  for (const product of products) {
    if (!groups[product.eventSlug]) {
      groups[product.eventSlug] = {
        slug: product.eventSlug,
        name: product.eventName,
        date: product.eventDate,
        image: product.eventImage,
        hasFeaturedFight: false,
        hasFullEvent: false,
        fightCount: 0,
        products: [],
      };
    }
    groups[product.eventSlug].products.push(product);
    groups[product.eventSlug].fightCount++;
    if (product.eventImage) {
      // Prefer explicit event_image metadata; full-event overrides any earlier value
      if (!groups[product.eventSlug].image || product.featured === 'full-event') {
        groups[product.eventSlug].image = product.eventImage;
      }
    } else if (product.image) {
      // Fall back to Stripe product image; full-event product wins over others
      if (!groups[product.eventSlug].image || product.featured === 'full-event') {
        groups[product.eventSlug].image = product.image;
      }
    }
    if (product.featured === 'full-event') {
      groups[product.eventSlug].hasFullEvent = true;
    } else if (product.featured === 'true') {
      groups[product.eventSlug].hasFeaturedFight = true;
    }
  }

  return Object.values(groups).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
