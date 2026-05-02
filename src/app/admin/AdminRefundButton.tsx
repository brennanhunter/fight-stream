'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AdminRefundButton({
  purchaseId,
  email,
  amountPaid,
  productName,
}: {
  purchaseId: string;
  email: string;
  amountPaid: number;
  productName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefund() {
    const amount = `$${(amountPaid / 100).toFixed(2)}`;
    if (!confirm(`Refund ${amount} to ${email} for "${productName}"?\n\nThis cannot be undone — Stripe will return the funds and the buyer's access will be revoked.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Refund failed');
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || pending;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={handleRefund} disabled={busy} variant="destructive" size="xs">
        {busy ? 'Refunding…' : 'Refund'}
      </Button>
      {error && <span className="max-w-[160px] text-xs text-red-400">{error}</span>}
    </div>
  );
}
