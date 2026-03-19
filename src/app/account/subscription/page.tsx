'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

interface Subscription {
  id: string;
  tier: 'basic' | 'premium';
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check for success param
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success')) {
      setSuccess(true);
      // Clean URL
      window.history.replaceState({}, '', '/account/subscription');
    }

    const fetchSubscription = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('subscriptions')
        .select('id, tier, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(data);
      setLoading(false);
    };

    fetchSubscription();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal.');
      }
    } catch {
      alert('Something went wrong.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
          Account
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Subscription</h1>
        <div className="w-12 h-[2px] bg-white mt-4" />
      </div>

      {success && (
        <div className="mb-8 border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-green-400 text-sm font-medium">
            Welcome to Fight Pass! Your subscription is now active.
          </p>
        </div>
      )}

      {subscription ? (
        <div className="border border-white/10 p-6 sm:p-8 max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                Fight Pass {subscription.tier === 'premium' ? 'Premium' : 'Basic'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {subscription.status === 'active' && !subscription.cancel_at_period_end && 'Active'}
                {subscription.status === 'active' && subscription.cancel_at_period_end && 'Cancels at period end'}
                {subscription.status === 'trialing' && 'Trial'}
                {subscription.status === 'past_due' && 'Past due — update payment method'}
              </p>
            </div>
            <span className={`text-xs font-bold tracking-[0.15em] uppercase px-3 py-1 ${
              subscription.status === 'active' && !subscription.cancel_at_period_end
                ? 'bg-white/10 text-white'
                : subscription.status === 'past_due'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {subscription.cancel_at_period_end ? 'Canceling' : subscription.status}
            </span>
          </div>

          {subscription.current_period_end && (
            <div className="mb-6 text-sm text-gray-400">
              {subscription.cancel_at_period_end
                ? 'Access until: '
                : 'Next billing date: '}
              <span className="text-white">
                {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="px-6 py-3 bg-white text-black text-sm font-bold tracking-[0.1em] uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Manage Billing'}
            </button>
            <Link
              href="/pricing"
              className="px-6 py-3 border border-white/20 text-white text-sm font-bold tracking-[0.1em] uppercase hover:border-white transition-colors text-center"
            >
              View Plans
            </Link>
          </div>
        </div>
      ) : (
        <div className="border border-white/10 p-8 max-w-lg text-center">
          <h2 className="text-xl font-bold text-white mb-3">No Active Subscription</h2>
          <p className="text-gray-400 text-sm mb-6">
            Subscribe to Fight Pass for unlimited VOD access and exclusive perks.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-3 bg-white text-black text-sm font-bold tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors border border-white"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  );
}
