'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRefundBackfillButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!confirm('Scan the last 24 hours of Stripe refunds and stamp matching purchases with refunded_at?\n\nSafe to re-run — already-marked purchases are skipped.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/refund/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 24 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Backfill failed');
        return;
      }
      setResult(`Scanned ${data.refundsScanned} refunds — updated ${data.purchasesUpdated}, already marked ${data.alreadyMarked}, unmatched ${data.unmatched}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || pending;

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={busy}
        className="text-[10px] font-bold tracking-[0.2em] uppercase border border-white/20 px-3 py-1.5 text-gray-300 hover:border-white hover:text-white transition-colors disabled:opacity-50"
      >
        {busy ? 'Scanning Stripe…' : 'Backfill Refunds (24h)'}
      </button>
      {result && <p className="text-[10px] text-green-400 max-w-xs">{result}</p>}
      {error && <p className="text-[10px] text-red-400 max-w-xs">{error}</p>}
    </div>
  );
}
