'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

const TIERS = [
  {
    name: 'Fight Pass Basic',
    tier: 'basic',
    price: '$9.99',
    interval: 'month',
    description: 'Full VOD library access',
    features: [
      'Unlimited VOD replays',
      'All events, all fights',
      'Watch on any device',
      'New content added regularly',
    ],
    cta: 'Get Basic',
    featured: false,
  },
  {
    name: 'Fight Pass Premium',
    tier: 'premium',
    price: '$19.99',
    interval: 'month',
    description: 'Everything in Basic + PPV perks',
    features: [
      'Everything in Basic',
      '50% off all PPV events',
      'Early access to new replays',
      'Priority support',
    ],
    cta: 'Get Premium',
    featured: true,
  },
];

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    setLoading(tier);

    try {
      // Check if user is logged in
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      // Get the price ID from env based on tier
      const priceId = tier === 'premium'
        ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;

      if (!priceId) {
        alert('Subscription pricing is not configured yet. Please check back soon.');
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
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      {TIERS.map((plan) => (
        <div
          key={plan.tier}
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
        </div>
      ))}

      <div className="md:col-span-2 text-center mt-4">
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
