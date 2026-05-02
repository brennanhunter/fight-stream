import { Suspense } from 'react';
import Link from 'next/link';
import { X, Star, MessageSquare, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase';
import AdminFeedbackApprove from '../../AdminFeedbackApprove';

export const dynamic = 'force-dynamic';

type Approval = 'all' | 'approved' | 'pending';
type TypeFilter = 'all' | 'ppv' | 'vod';
type SearchParams = { approval?: Approval; type?: TypeFilter };

type FeedbackRow = {
  id: string;
  created_at: string;
  email: string;
  display_name: string | null;
  subject: string;
  trigger_type: 'ppv' | 'vod';
  overall_rating: number;
  quality_rating: number | null;
  process_rating: number | null;
  comment: string | null;
  what_was_missing: string | null;
  approved_for_testimonial: boolean;
};

async function getKpis() {
  const supabase = createServerClient();

  const [
    { count: totalCount },
    { count: approvedCount },
    { data: ratingRows },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('feedback').select('id', { count: 'exact', head: true }),
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('approved_for_testimonial', true),
    supabase.from('feedback').select('overall_rating'),
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .not('comment', 'is', null)
      .eq('approved_for_testimonial', false),
  ]);

  const ratings = ratingRows ?? [];
  const avgRating = ratings.length
    ? ratings.reduce((s, r) => s + r.overall_rating, 0) / ratings.length
    : 0;

  return {
    total: totalCount ?? 0,
    approved: approvedCount ?? 0,
    pending: pendingCount ?? 0,
    avgRating,
  };
}

async function getFeedback(approval: Approval, type: TypeFilter): Promise<FeedbackRow[]> {
  const supabase = createServerClient();
  let query = supabase
    .from('feedback')
    .select(
      'id, created_at, email, display_name, subject, trigger_type, overall_rating, quality_rating, process_rating, comment, what_was_missing, approved_for_testimonial',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (approval === 'approved') query = query.eq('approved_for_testimonial', true);
  else if (approval === 'pending')
    query = query.eq('approved_for_testimonial', false).not('comment', 'is', null);

  if (type !== 'all') query = query.eq('trigger_type', type);

  const { data } = await query;
  return (data ?? []) as FeedbackRow[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function FeedbackKpis() {
  const k = await getKpis();
  const cards = [
    { label: 'Total Responses', value: k.total.toLocaleString(), icon: MessageSquare, tone: 'default' as const },
    {
      label: 'Avg Rating',
      value: k.total > 0 ? k.avgRating.toFixed(2) : '—',
      icon: Star,
      tone: 'default' as const,
    },
    {
      label: 'Approved Testimonials',
      value: k.approved.toLocaleString(),
      icon: CheckCircle2,
      tone: 'default' as const,
    },
    {
      label: 'Pending Review',
      value: k.pending.toLocaleString(),
      icon: MessageSquare,
      tone: k.pending > 0 ? ('warn' as const) : ('default' as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </CardDescription>
              <CardTitle className={`text-3xl tabular-nums ${c.tone === 'warn' ? 'text-amber-400' : ''}`}>
                {c.value}
              </CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

function FeedbackKpisSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-9 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="text-amber-400 tabular-nums whitespace-nowrap">
      {'★'.repeat(value)}
      <span className="text-muted-foreground/30">{'☆'.repeat(5 - value)}</span>
    </span>
  );
}

async function FeedbackTable({ approval, type }: { approval: Approval; type: TypeFilter }) {
  const rows = await getFeedback(approval, type);

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No feedback matches those filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Event / VOD</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Overall</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Process</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead className="w-[140px]">Testimonial</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((f) => (
            <TableRow key={f.id} className="align-top">
              <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                {fmtDate(f.created_at)}
              </TableCell>
              <TableCell className="text-xs">
                <span className="font-medium">{f.email}</span>
                {f.display_name && (
                  <span className="block text-muted-foreground">{f.display_name}</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {f.subject}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase">
                  {f.trigger_type}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                <StarRow value={f.overall_rating} />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums">
                {f.quality_rating ? `${f.quality_rating}/5` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums">
                {f.process_rating ? `${f.process_rating}/5` : '—'}
              </TableCell>
              <TableCell className="text-xs max-w-[280px]">
                {f.comment ? (
                  <p className="line-clamp-3 text-foreground/85">&ldquo;{f.comment}&rdquo;</p>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
                {f.what_was_missing && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    <span className="font-bold">Missing:</span> {f.what_was_missing}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {f.comment ? (
                  <AdminFeedbackApprove id={f.id} approved={f.approved_for_testimonial} />
                ) : (
                  <span className="text-muted-foreground/50 text-[10px]">No comment</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function FeedbackTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </Card>
  );
}

function FilterBar({ approval, type }: { approval: Approval; type: TypeFilter }) {
  const approvalOpts: { value: Approval; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
  ];
  const typeOpts: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ppv', label: 'PPV' },
    { value: 'vod', label: 'VOD' },
  ];

  function buildHref(nextApproval: Approval, nextType: TypeFilter) {
    const params = new URLSearchParams();
    if (nextApproval !== 'all') params.set('approval', nextApproval);
    if (nextType !== 'all') params.set('type', nextType);
    const qs = params.toString();
    return qs ? `/admin/feedback?${qs}` : '/admin/feedback';
  }

  const hasFilters = approval !== 'all' || type !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Approval</span>
        <div className="flex gap-1.5">
          {approvalOpts.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref(opt.value, type)}
              className={buttonVariants({
                variant: approval === opt.value ? 'default' : 'outline',
                size: 'sm',
              })}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Type</span>
        <div className="flex gap-1.5">
          {typeOpts.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref(approval, opt.value)}
              className={buttonVariants({
                variant: type === opt.value ? 'default' : 'outline',
                size: 'sm',
              })}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {hasFilters && (
        <Link
          href="/admin/feedback"
          className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} ml-auto`}
        >
          <X className="h-3 w-3" />
          Clear filters
        </Link>
      )}
    </div>
  );
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { approval: approvalRaw, type: typeRaw } = await searchParams;
  const approval: Approval =
    approvalRaw === 'approved' || approvalRaw === 'pending' ? approvalRaw : 'all';
  const type: TypeFilter = typeRaw === 'ppv' || typeRaw === 'vod' ? typeRaw : 'all';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Survey responses across PPV and VOD. Approve a comment to surface it on the homepage as a testimonial.
        </p>
      </div>

      <Suspense fallback={<FeedbackKpisSkeleton />}>
        <FeedbackKpis />
      </Suspense>

      <FilterBar approval={approval} type={type} />

      <Suspense fallback={<FeedbackTableSkeleton />} key={`${approval}-${type}`}>
        <FeedbackTable approval={approval} type={type} />
      </Suspense>
    </div>
  );
}
