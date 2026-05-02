'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="announce-name" className="text-xs text-muted-foreground">
            Event name
          </label>
          <Input
            id="announce-name"
            type="text"
            placeholder="e.g. Alvarez vs. Martinez"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="announce-date" className="text-xs text-muted-foreground">
            Event date &amp; time
          </label>
          <Input
            id="announce-date"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="[color-scheme:dark]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="announce-price" className="text-xs text-muted-foreground">
            PPV price
          </label>
          <Input
            id="announce-price"
            type="text"
            placeholder="$14.99"
            value={ppvPrice}
            onChange={(e) => setPpvPrice(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Goes to every active subscriber + past PPV buyer. Double-check before sending.
        </p>
        <Button type="submit" disabled={status === 'loading'} variant="destructive">
          <Send />
          {status === 'loading' ? 'Sending…' : 'Send Announcement'}
        </Button>
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-400">
          Sent to {result?.sent} recipient{result?.sent !== 1 ? 's' : ''}.
        </p>
      )}
      {status === 'error' && <p className="text-xs text-red-400">{result?.error}</p>}
    </form>
  );
}
