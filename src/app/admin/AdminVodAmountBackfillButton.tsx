'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Window = 'all' | '720h' | '168h';

const LABELS: Record<Window, string> = {
  all: 'All time',
  '720h': 'Last 30 days',
  '168h': 'Last 7 days',
};

export default function AdminVodAmountBackfillButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [window, setWindow] = useState<Window>('all');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (
      !confirm(
        `Walk every VOD purchase from "${LABELS[window]}" and ask Stripe what was actually charged. Mismatches will be corrected.\n\nSafe to re-run.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const hours = window === 'all' ? null : parseInt(window, 10);
      const res = await fetch('/api/admin/backfill-vod-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours ? { hours } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Backfill failed');
        return;
      }
      setResult(
        `Scanned ${data.scanned} · corrected ${data.corrected} · unchanged ${data.unchanged} · failed ${data.lookupFailed}.`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || pending;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        For each VOD purchase, looks up the actual amount charged via Stripe and corrects{' '}
        <code className="text-foreground">amount_paid</code> when it disagrees. Use this to retroactively
        reflect promo / 100%-off codes that were applied before the webhook fix.
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted-foreground">Window</label>
        <div className="flex gap-1.5">
          {(Object.keys(LABELS) as Window[]).map((w) => (
            <Button
              key={w}
              type="button"
              size="sm"
              variant={window === w ? 'default' : 'outline'}
              onClick={() => setWindow(w)}
              disabled={busy}
            >
              {LABELS[w]}
            </Button>
          ))}
        </div>
      </div>
      <Button onClick={run} disabled={busy}>
        {busy ? 'Walking Stripe…' : 'Run Backfill'}
      </Button>
      {result && <p className="text-xs text-green-400">{result}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
