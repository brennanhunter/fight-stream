import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createServerClient } from '@/lib/supabase';
import { getProducts } from '@/lib/vod';
import { generateReportToken } from '@/lib/report-token';
import { getPromoterRate, getTierLabel } from '@/lib/promoter-rate';
import { PURCHASE_WINDOW_DAYS, REPLAY_WINDOW_DAYS } from '@/lib/constants';
import AdminStreamToggle from '../../../AdminStreamToggle';
import { Badge } from '@/components/ui/badge';
import AdminCopyButton from '../../../AdminCopyButton';
import VodMappings, { type VodOption } from './_components/VodMappings';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://boxstreamtv.com';

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function EventDrilldownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name, date, ivs_playback_url, is_streaming, is_active, promoter_email, promoter_name')
    .eq('id', id)
    .maybeSingle();

  if (!event) notFound();

  const [
    { data: ppvRows },
    { data: mappingRows },
    products,
    { data: boxerRows },
    { data: feedbackRows },
    reportToken,
  ] = await Promise.all([
    supabase
      .from('purchases')
      .select('amount_paid')
      .eq('event_id', event.id)
      .eq('purchase_type', 'ppv')
      .gt('amount_paid', 0)
      .is('refunded_at', null),
    supabase
      .from('event_vod_mapping')
      .select('stripe_product_id')
      .eq('event_id', event.id),
    getProducts(),
    supabase
      .from('purchases')
      .select('boxer_name')
      .eq('event_id', event.id)
      .eq('purchase_type', 'ppv')
      .is('refunded_at', null)
      .not('boxer_name', 'is', null),
    supabase
      .from('feedback')
      .select('id, created_at, email, overall_rating, quality_rating, process_rating, comment')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(50),
    generateReportToken(event.id),
  ]);

  // PPV stats
  const ppvCount = ppvRows?.length ?? 0;
  const ppvRevenue = (ppvRows ?? []).reduce((s, p) => s + p.amount_paid, 0);
  const rate = getPromoterRate(ppvCount);
  const tier = getTierLabel(ppvCount);
  const promoterCut = Math.round(ppvRevenue * rate);
  const ourCut = ppvRevenue - promoterCut;

  // VOD stats — sum purchases across linked products
  const linkedProductIds = new Set((mappingRows ?? []).map((m) => m.stripe_product_id));
  const linkedIdArray = [...linkedProductIds];
  const { data: vodRows } = linkedIdArray.length
    ? await supabase
        .from('purchases')
        .select('amount_paid')
        .eq('purchase_type', 'vod')
        .gt('amount_paid', 0)
        .is('refunded_at', null)
        .in('stripe_product_id', linkedIdArray)
    : { data: [] };

  const vodCount = vodRows?.length ?? 0;
  const vodRevenue = (vodRows ?? []).reduce((s, p) => s + p.amount_paid, 0);

  // VOD split — same rate as PPV (determined by PPV count tier), applied to VOD revenue.
  // Tier itself is still PPV-only; this is a courtesy split so promoters aren't unrewarded
  // for replay sales when their event drove a high tier.
  const vodPromoterCut = Math.round(vodRevenue * rate);
  const vodOurCut = vodRevenue - vodPromoterCut;

  // Boxer comp tally
  const boxerTally = new Map<string, number>();
  for (const row of boxerRows ?? []) {
    if (row.boxer_name) {
      boxerTally.set(row.boxer_name, (boxerTally.get(row.boxer_name) ?? 0) + 1);
    }
  }
  const boxerLeaderboard = [...boxerTally.entries()].sort((a, b) => b[1] - a[1]);

  // Event window state
  const eventDate = new Date(event.date);
  const replayDeadline = new Date(eventDate.getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const purchaseDeadline = new Date(eventDate.getTime() + PURCHASE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const replayExpired = replayDeadline < now;
  const purchaseClosed = purchaseDeadline < now;

  // VOD options for mapping form (sourced from Stripe, not Supabase)
  const vodOptions: VodOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.image,
    eventSlug: p.eventSlug,
    eventName: p.eventName,
    featured: p.featured,
  }));

  const reportUrl = `${BASE_URL}/report/${event.id}/${reportToken}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All events
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <p className="text-sm text-muted-foreground">
              {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {event.is_active && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/10">
                Active
              </Badge>
            )}
            {replayExpired && (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10">
                Replay Expired
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="vod">VOD Mappings</TabsTrigger>
          <TabsTrigger value="boxer">Boxer Comp</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="report">Promoter Report</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stream Control</CardTitle>
              <CardDescription>
                Toggles whether the &ldquo;Watch Now&rdquo; button is visible to buyers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminStreamToggle isStreaming={!!event.is_streaming} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <p className={event.ivs_playback_url ? 'text-green-400' : 'text-red-400 font-bold'}>
                    {event.ivs_playback_url ? 'Set' : 'NOT SET'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(event.promoter_email || event.promoter_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Promoter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Name</p>
                    <p>{event.promoter_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Email</p>
                    <p>{event.promoter_email || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PAYOUTS */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>PPV (Live + Replay)</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{fmtMoney(ppvRevenue)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>{ppvCount.toLocaleString()} paid sales · refunds excluded</p>
                <p>Tier: {tier} ({Math.round(rate * 100)}% promoter rate)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>VOD Replays</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {vodCount > 0 ? fmtMoney(vodRevenue) : <span className="text-muted-foreground">—</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>{vodCount.toLocaleString()} paid sales across {linkedIdArray.length} linked product{linkedIdArray.length === 1 ? '' : 's'}</p>
                {linkedIdArray.length === 0 && (
                  <p className="text-amber-400">No VOD products linked yet — see VOD Mappings tab.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PPV Split</CardTitle>
              <CardDescription>Tier rate ({Math.round(rate * 100)}%) applied to PPV revenue.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Promoter cut</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(promoterCut)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">You &amp; Ryan</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(ourCut)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Total PPV</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(ppvRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">VOD Split</CardTitle>
              <CardDescription>
                Same tier rate ({Math.round(rate * 100)}%) applied to VOD revenue. Tier itself is still determined by PPV count only — this isn&rsquo;t shown on the promoter report yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vodCount === 0 ? (
                <p className="text-sm text-muted-foreground">No VOD sales linked yet — see the VOD Mappings tab.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Promoter cut</p>
                    <p className="text-2xl font-semibold tabular-nums">{fmtMoney(vodPromoterCut)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">You &amp; Ryan</p>
                    <p className="text-2xl font-semibold tabular-nums">{fmtMoney(vodOurCut)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Total VOD</p>
                    <p className="text-2xl font-semibold tabular-nums">{fmtMoney(vodRevenue)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Combined Total</CardTitle>
              <CardDescription>PPV + VOD using the same tier rate.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Promoter total</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(promoterCut + vodPromoterCut)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Our total</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(ourCut + vodOurCut)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Gross total</p>
                  <p className="text-2xl font-semibold tabular-nums">{fmtMoney(ppvRevenue + vodRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOD MAPPINGS */}
        <TabsContent value="vod">
          <VodMappings
            eventId={event.id}
            options={vodOptions}
            initialLinkedIds={linkedIdArray}
          />
        </TabsContent>

        {/* BOXER COMP */}
        <TabsContent value="boxer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Boxer Comp Leaderboard</CardTitle>
              <CardDescription>
                Buyers per boxer. Comp purchases are excluded; refunded purchases excluded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boxerLeaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">No boxer-tagged purchases yet for this event.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {boxerLeaderboard.map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="capitalize">{name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {count} buyer{count !== 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEEDBACK */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback</CardTitle>
              <CardDescription>Survey responses for this event.</CardDescription>
            </CardHeader>
            <CardContent>
              {!feedbackRows?.length ? (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {feedbackRows.map((f) => (
                    <li key={f.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{f.email}</span>
                        <span className="text-amber-400 tabular-nums">
                          {'★'.repeat(f.overall_rating)}
                          <span className="text-muted-foreground/40">{'☆'.repeat(5 - f.overall_rating)}</span>
                        </span>
                      </div>
                      {f.comment && (
                        <p className="text-sm text-foreground/80">&ldquo;{f.comment}&rdquo;</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {f.quality_rating && <span>Quality {f.quality_rating}/5</span>}
                        {f.process_rating && <span>Process {f.process_rating}/5</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMOTER REPORT */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promoter Report Link</CardTitle>
              <CardDescription>
                Cryptographically-unique URL to share with the promoter. No login required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 border border-border px-3 py-2 text-xs font-mono break-all">
                {reportUrl}
              </div>
              <div className="flex items-center gap-3">
                <AdminCopyButton url={reportUrl} />
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
