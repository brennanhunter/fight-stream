'use client';

import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { compVodAccess } from '../../purchases/actions';

type Product = {
  id: string;
  name: string;
  eventName: string;
  price: string | null;
  image: string | null;
};

export default function CompVodForm({
  products,
  defaultTtlHours,
}: {
  products: Product[];
  defaultTtlHours: number;
}) {
  const [email, setEmail] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [ttlHours, setTtlHours] = useState<string>(String(defaultTtlHours));
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [pending, startTransition] = useTransition();

  // Group products by event for the picker — same shape as /vod page.
  const grouped = useMemo(() => {
    const filtered = products.filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) || p.eventName.toLowerCase().includes(q)
      );
    });
    const byEvent = new Map<string, Product[]>();
    for (const p of filtered) {
      const list = byEvent.get(p.eventName) ?? [];
      list.push(p);
      byEvent.set(p.eventName, list);
    }
    return Array.from(byEvent.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products, search]);

  const selected = products.find((p) => p.id === productId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !productId) return;
    startTransition(async () => {
      const ttl = parseInt(ttlHours, 10);
      const res = await compVodAccess({
        email: email.trim(),
        productId,
        ttlHours: Number.isFinite(ttl) && ttl > 0 ? ttl : undefined,
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Comped ${res.productName} to ${email.trim()} — link emailed.`,
      );
      // Reset email + note but keep the product/TTL so multiple sends are easy.
      setEmail('');
      setNote('');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send a free watch link</CardTitle>
        <CardDescription>
          The recipient gets a magic-link email. Clicking it grants them access on whatever
          device they click from — same flow as a paying buyer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Recipient email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@example.com"
              disabled={pending}
            />
          </div>

          {/* Product picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pick a VOD</label>
            <Input
              type="search"
              placeholder="Filter by event or fight name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={pending}
              className="mb-2"
            />
            <div className="max-h-80 overflow-y-auto rounded-md border">
              {grouped.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No products match your search.
                </p>
              ) : (
                grouped.map(([eventName, items]) => (
                  <div key={eventName} className="border-b last:border-b-0">
                    <p className="bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {eventName}
                    </p>
                    {items.map((p) => (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${
                          productId === p.id ? 'bg-muted/60' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="product"
                          value={p.id}
                          checked={productId === p.id}
                          onChange={() => setProductId(p.id)}
                          className="shrink-0"
                          disabled={pending}
                        />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {p.price ? `$${p.price}` : '—'}
                        </span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
            {selected && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selected.name}</span>
              </p>
            )}
          </div>

          {/* TTL */}
          <div className="space-y-2">
            <label htmlFor="ttl" className="text-sm font-medium">
              Access window (hours)
            </label>
            <Input
              id="ttl"
              type="number"
              min={1}
              max={24 * 365}
              value={ttlHours}
              onChange={(e) => setTtlHours(e.target.value)}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              How long the recipient can watch from when they click the link.
            </p>
          </div>

          {/* Note (operator-only, doesn't go to the recipient) */}
          <div className="space-y-2">
            <label htmlFor="note" className="text-sm font-medium">
              Note (optional, for your records)
            </label>
            <Input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Press review, refund replacement, promo"
              disabled={pending}
            />
          </div>

          <Button
            type="submit"
            disabled={pending || !email.trim() || !productId}
            className="w-full sm:w-auto"
          >
            {pending ? 'Sending…' : 'Send free watch link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
