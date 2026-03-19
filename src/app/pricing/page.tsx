import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';
import PricingCards from './PricingCards';

export const metadata: Metadata = {
  title: 'Fight Pass Pricing | BoxStreamTV',
  description: 'Subscribe to Fight Pass for unlimited VOD replays and exclusive PPV discounts. Choose Basic or Premium.',
  openGraph: {
    title: 'Fight Pass Pricing | BoxStreamTV',
    description: 'Subscribe to Fight Pass for unlimited VOD replays and exclusive PPV discounts.',
  },
};

export default function PricingPage() {
  return (
    <>
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

          <PricingCards />

          {/* FAQ / Details */}
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
                <h3 className="text-white font-semibold mb-2">How does the Premium PPV discount work?</h3>
                <p className="text-gray-400 text-sm">Premium subscribers get 50% off all PPV events, applied automatically at checkout.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
