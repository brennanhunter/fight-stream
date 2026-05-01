'use client';

import { useState } from 'react';

export default function VodRecoverForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recover-vod/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="border border-white/10 p-6 text-center bg-white/[0.02]">
        <p className="text-sm text-white font-medium mb-1">Check your email</p>
        <p className="text-xs text-gray-500">
          If a replay purchase exists for that address, we just sent a recovery link. Click it from this device to restore access.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-white/10 p-6 bg-white/[0.02]">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">Already purchased?</p>
      <p className="text-sm text-gray-300 mb-4 leading-relaxed">
        Bought a replay as a guest on another device? Enter the email you used at checkout and we&apos;ll send you a one-click link to restore access here.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-black border border-white/20 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send Link'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-400 mt-3">{error}</p>}
    </form>
  );
}
