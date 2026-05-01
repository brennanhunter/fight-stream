'use client';

import { useState } from 'react';

export default function AdminSendVodRecoveryForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/recover-vod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to send recovery link');
        return;
      }
      setResult(`Sent recovery link to ${data.sentTo} (${data.vodCount} replay${data.vodCount === 1 ? '' : 's'}).`);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recovery link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="flex-1 bg-white/5 border border-white/20 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send Recovery Link'}
        </button>
      </div>
      {result && <p className="text-[11px] text-green-400">{result}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </form>
  );
}
