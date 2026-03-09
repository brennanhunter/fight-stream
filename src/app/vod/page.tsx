import Stripe from 'stripe';
import Footer from '@/components/layout/Footer';
import ResumeWatchingBanner from '@/components/ResumeWatchingBanner';
import VodContent, { type VodProduct, type EventGroup } from './VodContent';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getProducts(): Promise<VodProduct[]> {
  const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });

  return products.data
    .filter((p) => p.metadata.s3_key && p.metadata.site === 'boxstreamtv')
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

function groupByEvent(products: VodProduct[]): EventGroup[] {
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
    // Use explicit event_image if any product provides one, else fall back to first product image
    if (product.eventImage) {
      groups[product.eventSlug].image = product.eventImage;
    } else if (!groups[product.eventSlug].image && product.image) {
      groups[product.eventSlug].image = product.image;
    }
    // Track featured status by type
    if (product.featured === 'full-event') {
      groups[product.eventSlug].hasFullEvent = true;
    } else if (product.featured === 'true') {
      groups[product.eventSlug].hasFeaturedFight = true;
    }
  }

  // Sort events by date, newest first
  return Object.values(groups).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export default async function VodPage() {
  const products = await getProducts();
  const events = groupByEvent(products);

  return (
    <>
      <section className="min-h-screen bg-gradient-to-b from-black via-secondary to-black overflow-x-hidden pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
          <div className="mb-10">
            <ResumeWatchingBanner />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-12 text-center">
            Video on Demand
          </h1>

          <VodContent events={events} />
        </div>
      </section>
      <Footer />
    </>
  );
}
