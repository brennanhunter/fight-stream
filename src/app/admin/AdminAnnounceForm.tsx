'use client';

import { useState } from 'react';

export default function AdminAnnounceForm() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [ppvPrice, setPpvPrice] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setResult(null);

    const res = await fetch('/api/admin/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, eventDate, ppvPrice }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus('success');
      setResult({ sent: data.sent });
      setEventName('');
      setEventDate('');
      setPpvPrice('');
    } else {
      setStatus('error');
      setResult({ error: data.error || 'Something went wrong.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Event name (e.g. Alvarez vs. Martinez)"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          required
          className="sm:col-span-2 bg-white/5 border border-white/20 text-white placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
        <input
          type="text"
          placeholder="PPV price (e.g. $14.99)"
          value={ppvPrice}
          onChange={(e) => setPpvPrice(e.target.value)}
          required
          className="bg-white/5 border border-white/20 text-white placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <input
          type="datetime-local"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className="bg-white/5 border border-white/20 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors [color-scheme:dark]"
        />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold tracking-[0.2em] uppercase transition-colors disabled:opacity-40"
          >
            {status === 'loading' ? 'Sending...' : 'Send Announcement'}
          </button>
          {status === 'success' && (
            <span className="text-xs text-green-400 font-bold">
              Sent to {result?.sent} recipient{result?.sent !== 1 ? 's' : ''}.
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">{result?.error}</span>
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-600">
        Sends to all active subscribers + past PPV buyers. Double-check before submitting.
      </p>
    </form>
  );
}
