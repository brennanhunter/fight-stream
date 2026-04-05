'use client';

import { useState } from 'react';
import FightPassPrompt, { hasSeenFightPassPrompt, markFightPassPromptSeen } from '@/components/FightPassPrompt';

export default function VodBuyButton({ priceId, subscriptionTier }: { priceId: string; subscriptionTier: 'basic' | 'premium' | null }) {
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
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
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!subscriptionTier && !hasSeenFightPassPrompt()) {
      setShowPrompt(true);
      return;
    }
    startCheckout();
  };

  return (
    <>
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full sm:w-auto px-10 py-4 bg-white text-black text-xl font-bold
          hover:bg-gray-200
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300
          tracking-wide
          border border-white"
      >
        {loading ? 'Redirecting to checkout...' : '🥊 Buy Now'}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}

      <FightPassPrompt
        open={showPrompt}
        onClose={() => {
          markFightPassPromptSeen();
          setShowPrompt(false);
        }}
        onContinue={() => {
          setShowPrompt(false);
          startCheckout();
        }}
      />
    </>
  );
}
