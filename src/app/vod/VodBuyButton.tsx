'use client';

import { useState } from 'react';

export default function VodBuyButton() {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-primary via-red-600 to-primary text-white text-xl font-bold rounded-xl 
        hover:from-red-700 hover:via-red-500 hover:to-red-700 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-300 transform hover:scale-105 
        shadow-lg shadow-primary/30 hover:shadow-primary/50
        border border-accent/20"
    >
      {loading ? 'Redirecting to checkout...' : '🥊 Buy Now'}
    </button>
  );
}
