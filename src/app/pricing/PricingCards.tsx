'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

interface PricingProps {
  prices: {
    basic: string | null;
    premium: string | null;
    basicPriceId: string | null;
    premiumPriceId: string | null;
    basicInterval: string;
    premiumInterval: string;
  };
}

export default function PricingCards({ prices }: PricingProps) {
  const TIERS = [
    {
      name: 'Fight Pass Basic',
      tier: 'basic',
      price: prices.basic || '$9.99',
      priceId: prices.basicPriceId,
      interval: prices.basicInterval,
      description: 'VOD library + PPV savings',
      features: [
        'Unlimited VOD replays',
        '25% off all PPV events',
        'Watch on any device',
        'New content added regularly',
      ],
      cta: 'Get Basic',
      featured: false,
    },
    {
      name: 'Fight Pass Premium',
      tier: 'premium',
      price: prices.premium || '$19.99',
      priceId: prices.premiumPriceId,
      interval: prices.premiumInterval,
      description: 'The full experience',
      features: [
        'Unlimited VOD replays',
        'Free PPV events included',
        'Early access to new replays',
        'Priority support',
      ],
      cta: 'Get Premium',
      featured: true,
    },
  ];
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    setLoading(tier);
    setError(null);

    try {
      // Check if user is logged in
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      const plan = TIERS.find(t => t.tier === tier);
      const priceId = plan?.priceId;

      if (!priceId) {
        setError('Subscription pricing is not configured yet. Please check back soon.');
        return;
      }

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      {TIERS.map((plan, index) => (
        <motion.div
          key={plan.tier}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.15, ease: 'easeOut' }}
          className={`relative flex flex-col p-8 ${
            plan.featured
              ? 'border-2 border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]'
              : 'border border-white/10'
          }`}
        >
          {plan.featured && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-1">
                Most Popular
              </span>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
            <p className="text-sm text-gray-400">{plan.description}</p>
          </div>

          <div className="mb-6">
            <span className="text-4xl font-bold text-white">{plan.price}</span>
            <span className="text-gray-500 ml-1">/{plan.interval}</span>
            <p className="text-xs text-gray-500 mt-1">Billed {plan.interval}ly · Cancel anytime</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                <svg className="w-4 h-4 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSubscribe(plan.tier)}
            disabled={loading !== null}
            className={`w-full py-3 text-sm font-bold tracking-[0.15em] uppercase transition-all duration-200 ${
              plan.featured
                ? 'bg-white text-black hover:bg-gray-200 border border-white'
                : 'bg-transparent text-white border border-white hover:bg-white hover:text-black'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading === plan.tier ? 'Redirecting...' : plan.cta}
          </button>
          <p className="text-[11px] text-gray-600 text-center mt-3 leading-relaxed">
            By subscribing you authorize BoxStreamTV to charge {plan.price}/{plan.interval} on a recurring basis until you cancel.
          </p>
        </motion.div>
      ))}

      <div className="md:col-span-2 text-center mt-4">
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}
        <p className="text-sm text-gray-500">
          Already have a subscription?{' '}
          <Link href="/account/subscription" className="text-white underline hover:no-underline">
            Manage it here
          </Link>
        </p>
      </div>
    </div>
  );
}
