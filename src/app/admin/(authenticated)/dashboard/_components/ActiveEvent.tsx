import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createServerClient } from '@/lib/supabase';
import { PURCHASE_WINDOW_DAYS, REPLAY_WINDOW_DAYS } from '@/lib/constants';
import AdminStreamToggle from '../../../AdminStreamToggle';

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function ActiveEvent() {
  const supabase = createServerClient();
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, date, ivs_playback_url, is_streaming')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Active Event
          </CardDescription>
          <CardTitle className="text-base font-medium text-muted-foreground">None</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Set <code className="rounded bg-muted px-1 py-0.5">is_active = true</code> on an event row in Supabase to enable purchases and streaming.
        </CardContent>
      </Card>
    );
  }

  const eventDate = new Date(activeEvent.date);
  const replayDeadline = new Date(eventDate.getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const purchaseDeadline = new Date(eventDate.getTime() + PURCHASE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const replayExpired = replayDeadline < now;
  const purchaseClosed = purchaseDeadline < now;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Active Event
            </CardDescription>
            <CardTitle className="text-xl">{activeEvent.name}</CardTitle>
          </div>
          <Badge
            className={
              replayExpired
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10'
                : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/10'
            }
          >
            {replayExpired ? 'Expired' : 'Live'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <AdminStreamToggle isStreaming={!!activeEvent.is_streaming} />
          <p className="mt-2 text-xs text-muted-foreground">
            {activeEvent.is_streaming
              ? 'Watch Now button is visible to buyers.'
              : 'Watch Now button is hidden from buyers.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Event Date</p>
            <p>{fmtDate(eventDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Purchase Deadline</p>
            <p className={purchaseClosed ? 'text-red-400' : 'text-green-400'}>
              {fmtDate(purchaseDeadline)}
              {purchaseClosed && ' (closed)'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Replay Until</p>
            <p className={replayExpired ? 'text-red-400' : 'text-green-400'}>
              {fmtDate(replayDeadline)}
              {replayExpired && ' (expired)'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">IVS Playback URL</p>
            <p className={activeEvent.ivs_playback_url ? 'text-green-400' : 'text-red-400 font-bold'}>
              {activeEvent.ivs_playback_url ? 'Set' : 'NOT SET'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveEventSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-64" />
      </CardHeader>
      <CardContent className="space-y-5">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
