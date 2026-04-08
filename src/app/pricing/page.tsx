import Stripe from 'stripe';
import type { Metadata } from 'next';
import { PageTransition, FadeInView } from '@/components/motion';
import PricingCards from './PricingCards';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const metadata: Metadata = {
  title: 'Fight Pass Pricing | BoxStreamTV Subscription Plans',
  description: 'Subscribe to BoxStreamTV Fight Pass for unlimited boxing VOD replays and exclusive PPV discounts. Choose Basic or Premium — cancel anytime.',
  keywords: [
    'boxing subscription',
    'Fight Pass boxing',
    'boxing streaming plan',
    'watch boxing monthly',
    'boxing PPV discount',
    'unlimited boxing replays',
    'boxing fight pass price',
  ],
  alternates: {
    canonical: 'https://boxstreamtv.com/pricing',
  },
  openGraph: {
    title: 'Fight Pass Pricing | BoxStreamTV Subscription Plans',
    description: 'Subscribe to BoxStreamTV Fight Pass for unlimited boxing VOD replays and exclusive PPV discounts. Basic or Premium plans.',
    url: 'https://boxstreamtv.com/pricing',
  },
};

async function getStripePrices() {
  const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;
  const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

  const prices: { basic: string | null; premium: string | null; basicPriceId: string | null; premiumPriceId: string | null; basicInterval: string; premiumInterval: string } = {
    basic: null,
    premium: null,
    basicPriceId: basicPriceId || null,
    premiumPriceId: premiumPriceId || null,
    basicInterval: 'month',
    premiumInterval: 'month',
  };

  try {
    if (basicPriceId) {
      const price = await stripe.prices.retrieve(basicPriceId);
      prices.basic = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : null;
      prices.basicInterval = price.recurring?.interval || 'month';
    }
    if (premiumPriceId) {
      const price = await stripe.prices.retrieve(premiumPriceId);
      prices.premium = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : null;
      prices.premiumInterval = price.recurring?.interval || 'month';
    }
  } catch (err) {
    console.error('Failed to fetch Stripe prices:', err);
  }

  return prices;
}

export default async function PricingPage() {
  const prices = await getStripePrices();
  return (
    <PageTransition>
      <section className="min-h-screen bg-black pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
              Subscriptions
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Fight Pass
            </h1>
            <div className="w-16 h-[2px] bg-white mt-6 mx-auto" />
            <p className="text-gray-400 mt-6 max-w-xl mx-auto">
              Unlock the full VOD library and get exclusive perks. Cancel anytime.
            </p>
          </div>

          <PricingCards prices={prices} />

          {/* FAQ / Details */}
          <FadeInView>
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-2">Can I still buy individual fights?</h3>
                <p className="text-gray-400 text-sm">Yes. Individual VOD purchases and PPV events are always available without a subscription.</p>
              </div>
              <div className="border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-2">What happens if I cancel?</h3>
                <p className="text-gray-400 text-sm">You keep access until the end of your current billing period. No refunds for partial months.</p>
              </div>
              <div className="border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-2">Can I switch plans?</h3>
                <p className="text-gray-400 text-sm">Yes — upgrade or downgrade anytime from your account. Changes take effect on your next billing cycle.</p>
              </div>
              <div className="border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-2">How do PPV perks work?</h3>
                <p className="text-gray-400 text-sm">Basic subscribers get 25% off all PPV events. Premium subscribers get PPV events included free — no extra charge.</p>
              </div>
            </div>
          </div>
          </FadeInView>
        </div>
      </section>
    </PageTransition>
  );
}
