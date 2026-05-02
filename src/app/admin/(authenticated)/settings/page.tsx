import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  ExternalLink,
  ShoppingCart,
  Wallet,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PURCHASE_WINDOW_DAYS, REPLAY_WINDOW_DAYS, VOD_ACCESS_HOURS } from '@/lib/constants';
import AdminCopyButton from '../../AdminCopyButton';

export const dynamic = 'force-dynamic';

type IntegrationCheck = {
  label: string;
  required: boolean;
  configured: boolean;
};

type IntegrationGroup = {
  name: string;
  description: string;
  checks: IntegrationCheck[];
};

function buildGroups(): IntegrationGroup[] {
  // NB: never read or expose values — only presence.
  const has = (name: string) => Boolean(process.env[name]);

  return [
    {
      name: 'Stripe',
      description: 'Payments, subscriptions, and webhooks.',
      checks: [
        { label: 'STRIPE_SECRET_KEY', required: true, configured: has('STRIPE_SECRET_KEY') },
        { label: 'STRIPE_WEBHOOK_SECRET', required: true, configured: has('STRIPE_WEBHOOK_SECRET') },
        { label: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, configured: has('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') },
        { label: 'NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID', required: true, configured: has('NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID') },
        { label: 'NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID', required: true, configured: has('NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID') },
      ],
    },
    {
      name: 'Supabase',
      description: 'Database and auth.',
      checks: [
        { label: 'NEXT_PUBLIC_SUPABASE_URL', required: true, configured: has('NEXT_PUBLIC_SUPABASE_URL') },
        { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, configured: has('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
        { label: 'SUPABASE_SERVICE_ROLE_KEY', required: true, configured: has('SUPABASE_SERVICE_ROLE_KEY') },
      ],
    },
    {
      name: 'Resend',
      description: 'Transactional + announcement emails.',
      checks: [
        { label: 'RESEND_API_KEY', required: true, configured: has('RESEND_API_KEY') },
      ],
    },
    {
      name: 'AWS IVS',
      description: 'Live stream ingest and playback.',
      checks: [
        { label: 'IVS_PLAYBACK_URL', required: false, configured: has('IVS_PLAYBACK_URL') },
        { label: 'IVS_CHANNEL_ARN', required: false, configured: has('IVS_CHANNEL_ARN') },
        { label: 'IVS_KEY_PAIR_ARN', required: false, configured: has('IVS_KEY_PAIR_ARN') },
        { label: 'IVS_PRIVATE_KEY', required: false, configured: has('IVS_PRIVATE_KEY') },
      ],
    },
    {
      name: 'AWS CloudFront',
      description: 'Signed VOD URL generation.',
      checks: [
        { label: 'CLOUDFRONT_DOMAIN', required: true, configured: has('CLOUDFRONT_DOMAIN') },
        { label: 'CLOUDFRONT_KEY_ID', required: true, configured: has('CLOUDFRONT_KEY_ID') },
        { label: 'CLOUDFRONT_PRIVATE_KEY', required: true, configured: has('CLOUDFRONT_PRIVATE_KEY') },
      ],
    },
    {
      name: 'Auth & Security',
      description: 'Admin gate, JWT signing, and bot protection.',
      checks: [
        { label: 'ADMIN_PASSWORD', required: true, configured: has('ADMIN_PASSWORD') },
        { label: 'JWT_SECRET', required: true, configured: has('JWT_SECRET') },
        { label: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', required: false, configured: has('NEXT_PUBLIC_TURNSTILE_SITE_KEY') },
      ],
    },
    {
      name: 'URLs',
      description: 'Public-facing and internal links.',
      checks: [
        { label: 'NEXT_PUBLIC_SITE_URL', required: true, configured: has('NEXT_PUBLIC_SITE_URL') },
        { label: 'NEXT_PUBLIC_BASE_URL', required: false, configured: has('NEXT_PUBLIC_BASE_URL') },
      ],
    },
    {
      name: 'Promo',
      description: 'Site-wide promotion codes.',
      checks: [
        { label: 'PPV_PROMO_CODE', required: false, configured: has('PPV_PROMO_CODE') },
      ],
    },
  ];
}

function StatusPill({ check }: { check: IntegrationCheck }) {
  if (check.configured) {
    return (
      <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10 inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Set
      </Badge>
    );
  }
  if (check.required) {
    return (
      <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/10 inline-flex items-center gap-1">
        <CircleAlert className="h-3 w-3" />
        Missing
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground inline-flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      Optional
    </Badge>
  );
}

function IntegrationsCard() {
  const groups = buildGroups();
  const totalRequired = groups.reduce(
    (n, g) => n + g.checks.filter((c) => c.required).length,
    0,
  );
  const configuredRequired = groups.reduce(
    (n, g) => n + g.checks.filter((c) => c.required && c.configured).length,
    0,
  );
  const missingRequired = totalRequired - configuredRequired;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Integrations Status</CardTitle>
            <CardDescription>
              Checks presence of every environment variable on this server. Values are never read or shown.
            </CardDescription>
          </div>
          {missingRequired === 0 ? (
            <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10 inline-flex items-center gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              All required set
            </Badge>
          ) : (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/10 inline-flex items-center gap-1 shrink-0">
              <CircleAlert className="h-3 w-3" />
              {missingRequired} missing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((g, i) => (
          <div key={g.name} className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground/80">{g.description}</p>
            </div>
            <ul className="space-y-1.5">
              {g.checks.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <code className="font-mono text-foreground/80">{c.label}</code>
                  <StatusPill check={c} />
                </li>
              ))}
            </ul>
            {i < groups.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WebhookCard() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
  const webhookUrl = `${baseUrl}/api/webhooks/stripe`;
  const events = [
    'checkout.session.completed',
    'charge.refunded',
    'charge.dispute.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stripe Webhook</CardTitle>
        <CardDescription>
          Paste this URL into your Stripe Dashboard → Developers → Webhooks. The endpoint must be subscribed to all events listed below for the admin panel to stay accurate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Endpoint</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-muted/30 border border-border px-3 py-2 break-all">
              {webhookUrl}
            </code>
            <AdminCopyButton url={webhookUrl} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Required events</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-mono text-foreground/80">
            {events.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        </div>

        <a
          href="https://dashboard.stripe.com/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Stripe Webhooks
        </a>
      </CardContent>
    </Card>
  );
}

function ConstantsCard() {
  const constants = [
    {
      label: 'PPV Purchase Window',
      value: `${PURCHASE_WINDOW_DAYS} days`,
      description: 'How long after an event PPV tickets remain on sale.',
    },
    {
      label: 'PPV Replay Window',
      value: `${REPLAY_WINDOW_DAYS} days`,
      description: 'How long after an event replays stay available to PPV buyers.',
    },
    {
      label: 'VOD Access Window',
      value: `${VOD_ACCESS_HOURS} hours`,
      description: 'How long a VOD purchase is accessible from the moment of purchase.',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operational Constants</CardTitle>
        <CardDescription>
          Tunables defined in <code className="text-xs">src/lib/constants.ts</code>. Change in code, then redeploy — no admin UI for these yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {constants.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono">
                {c.value}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function QuickToolsCard() {
  const tools = [
    {
      label: 'Refund Backfill',
      description: 'Stamp refunded_at on purchases that Stripe refunded but our DB didn’t catch.',
      href: '/admin/purchases',
      icon: Clock,
    },
    {
      label: 'Fix VOD Amounts',
      description: 'Walk every VOD purchase and reconcile amount_paid against Stripe’s actual charged amount.',
      href: '/admin/purchases',
      icon: Wallet,
    },
    {
      label: 'Recent Purchases',
      description: 'Search, filter, refund, send recovery links.',
      href: '/admin/purchases',
      icon: ShoppingCart,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Tools</CardTitle>
        <CardDescription>
          The maintenance / backfill actions live inside Purchases. These are shortcuts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className="block border border-border p-3 hover:border-foreground/40 transition-colors h-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{t.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Integration health, webhook configuration, and operational constants.
        </p>
      </div>

      <IntegrationsCard />

      <WebhookCard />

      <ConstantsCard />

      <QuickToolsCard />
    </div>
  );
}
