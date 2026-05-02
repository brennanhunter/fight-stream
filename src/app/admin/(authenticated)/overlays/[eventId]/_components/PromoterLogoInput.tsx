'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setEventPromoterLogo } from '../actions';

export default function PromoterLogoInput({
  eventId,
  initialUrl,
}: {
  eventId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await setEventPromoterLogo(eventId, url.trim() || null);
      if (res.ok) toast.success('Promoter logo saved');
      else toast.error(res.error);
    });
  }

  function clear() {
    setUrl('');
    startTransition(async () => {
      const res = await setEventPromoterLogo(eventId, null);
      if (res.ok) toast.success('Promoter logo removed');
      else toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Promoter Logo</CardTitle>
        <CardDescription>
          URL to the promoter&rsquo;s logo. The live <code>/control</code> panel will toggle this
          on/off via its own button. PNG with transparent background reads cleanest on broadcast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/promoter-logo.png"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            {initialUrl && (
              <Button variant="ghost" onClick={clear} disabled={pending}>
                Clear
              </Button>
            )}
          </div>
        </div>
        {url && (
          <div className="flex items-center gap-3 rounded-md border bg-card p-3">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div className="rounded border bg-muted/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Promoter"
                style={{
                  height: '40px',
                  width: 'auto',
                  maxWidth: '160px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
