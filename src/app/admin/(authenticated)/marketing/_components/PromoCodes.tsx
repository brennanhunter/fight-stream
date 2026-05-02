import { Tag, ExternalLink } from 'lucide-react';
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
import type Stripe from 'stripe';
import { stripeServer } from '@/lib/stripe';

type PromotionWithCoupon = Stripe.PromotionCode & { coupon: Stripe.Coupon | string };

type PromoRow = {
  id: string;
  code: string;
  active: boolean;
  expired: boolean;
  discount: string;
  duration: string;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  created: number;
};

async function getPromoCodes(): Promise<PromoRow[]> {
  if (!stripeServer) return [];

  const codes: PromoRow[] = [];
  for await (const raw of stripeServer.promotionCodes.list({ limit: 100, expand: ['data.coupon'] })) {
    if (codes.length >= 100) break;
    const promo = raw as PromotionWithCoupon;
    const coupon = typeof promo.coupon === 'string' ? null : promo.coupon;
    let discount = '—';
    if (coupon?.percent_off) discount = `${coupon.percent_off}% off`;
    else if (coupon?.amount_off) discount = `$${(coupon.amount_off / 100).toFixed(2)} off`;

    const now = Math.floor(Date.now() / 1000);
    const expired = (promo.expires_at !== null && promo.expires_at !== undefined && promo.expires_at < now)
      || (promo.max_redemptions !== null && promo.max_redemptions !== undefined && promo.times_redeemed >= promo.max_redemptions);

    codes.push({
      id: promo.id,
      code: promo.code,
      active: promo.active,
      expired,
      discount,
      duration: coupon?.duration ?? 'once',
      timesRedeemed: promo.times_redeemed,
      maxRedemptions: promo.max_redemptions,
      expiresAt: promo.expires_at,
      created: promo.created,
    });
  }

  return codes.sort((a, b) => b.created - a.created);
}

function fmtUnix(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function PromoCodes() {
  const codes = await getPromoCodes();

  const totalRedemptions = codes.reduce((s, c) => s + c.timesRedeemed, 0);
  const activeCodes = codes.filter((c) => c.active && !c.expired).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Promo Codes
            </CardTitle>
            <CardDescription>
              Stripe Promotion Codes. {activeCodes} active · {totalRedemptions.toLocaleString()} total redemptions.
            </CardDescription>
          </div>
          <a
            href="https://dashboard.stripe.com/coupons"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Manage in Stripe
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {codes.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No promotion codes configured in Stripe yet.{' '}
            <a
              href="https://dashboard.stripe.com/coupons/create"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Create one
            </a>
            .
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => {
                const usedDisplay =
                  c.maxRedemptions !== null
                    ? `${c.timesRedeemed.toLocaleString()} / ${c.maxRedemptions.toLocaleString()}`
                    : c.timesRedeemed.toLocaleString();

                let statusBadge;
                if (!c.active) {
                  statusBadge = (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  );
                } else if (c.expired) {
                  statusBadge = (
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/10">
                      Expired
                    </Badge>
                  );
                } else {
                  statusBadge = (
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10">
                      Active
                    </Badge>
                  );
                }

                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="font-mono font-medium">{c.code}</code>
                    </TableCell>
                    <TableCell className="text-foreground/85">
                      {c.discount}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({c.duration})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usedDisplay}</TableCell>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">
                      {fmtUnix(c.expiresAt)}
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function PromoCodesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
