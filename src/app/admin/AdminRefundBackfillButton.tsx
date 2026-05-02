'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
      <Button onClick={run} disabled={busy} variant="outline" size="sm">
        {busy ? 'Scanning Stripe…' : 'Backfill Refunds (24h)'}
      </Button>
      {result && <p className="max-w-xs text-xs text-green-400">{result}</p>}
      {error && <p className="max-w-xs text-xs text-red-400">{error}</p>}
    </div>
  );
}
