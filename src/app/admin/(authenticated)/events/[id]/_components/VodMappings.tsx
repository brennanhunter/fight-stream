'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { saveVodMappings } from '../actions';

export type VodOption = {
  id: string;
  name: string;
  image: string | null;
  eventSlug: string;
  eventName: string;
  featured: string | null;
};

export default function VodMappings({
  eventId,
  options,
  initialLinkedIds,
}: {
  eventId: string;
  options: VodOption[];
  initialLinkedIds: string[];
}) {
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set(initialLinkedIds));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  function toggle(productId: string) {
    setLinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setFeedback(null);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveVodMappings(eventId, [...linkedIds]);
      if (res.ok) {
        setFeedback({ kind: 'ok', msg: `Saved — ${res.linked} replay${res.linked === 1 ? '' : 's'} linked.` });
      } else {
        setFeedback({ kind: 'err', msg: res.error });
      }
    });
  }

  // Group options by their original event_slug so the picker is scannable
  const groups = new Map<string, { eventName: string; items: VodOption[] }>();
  for (const opt of options) {
    const g = groups.get(opt.eventSlug);
    if (g) g.items.push(opt);
    else groups.set(opt.eventSlug, { eventName: opt.eventName, items: [opt] });
  }
  const sortedGroups = [...groups.entries()];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">VOD Mappings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tick every Stripe VOD product that belongs to this event. Replay sales for ticked products will roll up to this event in the dashboard and promoter report.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No VOD products configured in Stripe yet.</p>
        ) : (
          sortedGroups.map(([slug, group]) => (
            <div key={slug} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {group.eventName}
                <span className="ml-2 text-muted-foreground/60">{slug}</span>
              </p>
              <ul className="divide-y divide-border border rounded-md">
                {group.items.map((opt) => {
                  const checked = linkedIds.has(opt.id);
                  return (
                    <li key={opt.id}>
                      <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(opt.id)}
                          aria-label={`Link ${opt.name} to this event`}
                        />
                        {opt.image && (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                            <Image src={opt.image} alt="" fill className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{opt.name}</p>
                          {opt.featured === 'full-event' && (
                            <p className="text-xs text-purple-400">Full Event Replay</p>
                          )}
                          {opt.featured === 'true' && (
                            <p className="text-xs text-amber-400">Featured Fight</p>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {linkedIds.size} replay{linkedIds.size === 1 ? '' : 's'} linked
          </p>
          <div className="flex items-center gap-3">
            {feedback && (
              <p className={`text-xs ${feedback.kind === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {feedback.msg}
              </p>
            )}
            <Button onClick={save} disabled={pending}>
              {pending ? 'Saving…' : 'Save Links'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
