'use client';

import { useState } from 'react';

export default function AdminGrantForm({ activeEventId, activeEventName }: { activeEventId: string | null; activeEventName: string | null }) {
  const [email, setEmail] = useState('');
  const [productName, setProductName] = useState('');
  const [purchaseType, setPurchaseType] = useState<'ppv' | 'vod'>('ppv');
  const [eventId, setEventId] = useState(activeEventId ?? '');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, productName, purchaseType, eventId: eventId || null, expiresAt: expiresAt || null }),
    });

    if (res.ok) {
      setStatus('success');
      setEmail('');
      setProductName('');
      setEventId(activeEventId ?? '');
      setExpiresAt('');
    } else {
      const data = await res.json();
      setErrorMsg(data.error || 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="email"
          placeholder="Customer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/5 border border-white/20 text-white placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
        <input
          type="text"
          placeholder="Product name (e.g. Alvarez vs Martinez)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          className="bg-white/5 border border-white/20 text-white placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={purchaseType}
          onChange={(e) => setPurchaseType(e.target.value as 'ppv' | 'vod')}
          className="bg-white/5 border border-white/20 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        >
          <option value="ppv">PPV</option>
          <option value="vod">VOD</option>
        </select>
        <input
          type="text"
          placeholder={activeEventName ? `Event ID (default: ${activeEventName})` : 'Event ID (for PPV grants)'}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="bg-white/5 border border-white/20 text-white placeholder-gray-600 px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="bg-white/5 border border-white/20 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white transition-colors [color-scheme:dark]"
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {status === 'loading' ? 'Granting...' : 'Grant Access'}
        </button>
        {status === 'success' && <span className="text-xs text-green-400 font-bold">Access granted.</span>}
        {status === 'error' && <span className="text-xs text-red-400">{errorMsg}</span>}
      </div>
    </form>
  );
}
