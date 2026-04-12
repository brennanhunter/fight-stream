import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import SaveSession from './SaveSession';
import VodPlayer from './VodPlayer';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { getSignedCookiesForKey } from '@/lib/cloudfront';
import { normalizeEmail } from '@/lib/utils';
import { REPLAY_WINDOW_DAYS } from '@/lib/constants';
import { stripeServer } from '@/lib/stripe';

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; purchase_id?: string; product_id?: string; event_id?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  let s3Key: string | null = null;
  let sessionId: string | null = null;
  let isSubscriber = false;
  let expiresAt: string | null = null;
  let contentName: string | null = null;

  // ── Path 0: PPV replay by event_id ──────────────────────────────────────
  // Verifies PPV purchase or subscription, serves replay from events.replay_url
  if (params.event_id) {
    const supabase = createServerClient();

    // Look up event replay key
    const { data: event } = await supabase
      .from('events')
      .select('id, name, replay_url, date')
      .eq('id', params.event_id)
      .maybeSingle();

    if (!event?.replay_url) redirect('/');

    contentName = event.name;

    // Replay is available for REPLAY_WINDOW_DAYS after event start
    if (event.date && Date.now() > new Date(event.date).getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000) redirect('/');

    // Countdown shown to buyer = event.date + 4 days (the replay window close time)
    if (event.date) {
      expiresAt = new Date(new Date(event.date).getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    }

    // Verify access: subscription or PPV purchase
    let hasAccess = false;

    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();

      if (user) {
        const tier = await getSubscriptionTier(user.id);
        if (tier === 'premium') {
          hasAccess = true;
          isSubscriber = true;
        }

        if (!hasAccess) {
          const { data: purchase } = await supabase
            .from('purchases')
            .select('id, expires_at')
            .eq('user_id', user.id)
            .eq('event_id', params.event_id)
            .eq('purchase_type', 'ppv')
            .limit(1)
            .maybeSingle();

          if (purchase && !(purchase.expires_at && new Date(purchase.expires_at) < new Date())) hasAccess = true;
        }

        if (!hasAccess && user.email) {
          const { data: emailPurchase } = await supabase
            .from('purchases')
            .select('id, expires_at')
            .eq('email', normalizeEmail(user.email))
            .eq('event_id', params.event_id)
            .eq('purchase_type', 'ppv')
            .limit(1)
            .maybeSingle();

          if (emailPurchase && !(emailPurchase.expires_at && new Date(emailPurchase.expires_at) < new Date())) hasAccess = true;
        }
      }
    } catch {
      // Not logged in — fall through to cookie check
    }

    // Check customer_email cookie
    if (!hasAccess) {
      const customerEmail = cookieStore.get('customer_email')?.value;
      if (customerEmail) {
        const { data: cookiePurchase } = await supabase
          .from('purchases')
          .select('id, expires_at')
          .eq('email', normalizeEmail(decodeURIComponent(customerEmail)))
          .eq('event_id', params.event_id)
          .eq('purchase_type', 'ppv')
          .limit(1)
          .maybeSingle();

        if (cookiePurchase && !(cookiePurchase.expires_at && new Date(cookiePurchase.expires_at) < new Date())) hasAccess = true;
      }
    }

    if (!hasAccess) redirect('/recover-access');

    s3Key = event.replay_url;
  }

  // ── Path 1: Subscription access by product_id ────────────────────────────
  if (!s3Key && params.product_id) {
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const tier = await getSubscriptionTier(user.id);
        if (tier) {
          if (!stripeServer) redirect('/vod');
          const product = await stripeServer.products.retrieve(params.product_id);
          if (product.metadata?.s3_key) {
            s3Key = product.metadata.s3_key;
            isSubscriber = true;
            contentName = product.name;
          }
        }
      }
    } catch (err) {
      console.error('Subscription access error:', err);
    }
  }

  // ── Path 2: Purchase record by purchase_id ───────────────────────────────
  if (!s3Key && params.purchase_id) {
    try {
      const supabase = createServerClient();
      const { data: purchase } = await supabase
        .from('purchases')
        .select('s3_key, stripe_session_id, expires_at, user_id, email, product_name')
        .eq('id', params.purchase_id)
        .maybeSingle();

      if (purchase) {
        let isOwner = false;
        try {
          const authClient = await createAuthServerClient();
          const { data: { user } } = await authClient.auth.getUser();
          if (user && purchase.user_id && user.id === purchase.user_id) {
            isOwner = true;
          } else if (user?.email && purchase.email && normalizeEmail(user.email) === normalizeEmail(purchase.email)) {
            isOwner = true;
          }
        } catch {
          // Not logged in
        }

        if (!isOwner) {
          const customerEmail = cookieStore.get('customer_email')?.value;
          if (customerEmail && purchase.email && normalizeEmail(decodeURIComponent(customerEmail)) === normalizeEmail(purchase.email)) {
            isOwner = true;
          }
        }

        if (!isOwner) redirect('/recover-access');

        if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
          redirect('/recover-access?reason=expired');
        }

        if (purchase.s3_key) {
          s3Key = purchase.s3_key;
          sessionId = purchase.stripe_session_id;
          expiresAt = purchase.expires_at ?? null;
          contentName = purchase.product_name ?? null;
        }
      }
    } catch (err) {
      console.error('Supabase lookup error:', err);
    }
  }

  // ── Path 3: Stripe session_id (from URL or cookie) ───────────────────────
  if (!s3Key && !isSubscriber) {
    sessionId = params.session_id || cookieStore.get('vod_session')?.value || null;

    if (!sessionId) redirect('/vod');

    // Check if we already have a purchase row for this session (avoids Stripe API call)
    const supabase = createServerClient();
    const { data: cachedPurchase } = await supabase
      .from('purchases')
      .select('id, s3_key, expires_at, user_id, email, product_name')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (cachedPurchase) {
      // Redirect to the purchase_id path so all future loads skip Path 3
      redirect(`/watch?purchase_id=${cachedPurchase.id}`);
    }

    // No cached row — retrieve from Stripe (first visit only)
    if (!stripeServer) redirect('/vod');
    const session = await stripeServer.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });

    if (session.payment_status !== 'paid') redirect('/vod');

    const rawSessionEmail = session.customer_details?.email || session.customer_email;
    const sessionEmail = rawSessionEmail ? normalizeEmail(rawSessionEmail) : undefined;
    let sessionOwner = false;
    let sessionUserId: string | null = null;
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user?.email && sessionEmail && normalizeEmail(user.email) === sessionEmail) {
        sessionOwner = true;
        sessionUserId = user.id;
      }
    } catch {
      // Not logged in
    }
    if (!sessionOwner) {
      const customerEmail = cookieStore.get('customer_email')?.value;
      if (customerEmail && sessionEmail && normalizeEmail(decodeURIComponent(customerEmail)) === sessionEmail) {
        sessionOwner = true;
      }
    }
    if (!sessionOwner) redirect('/recover-access');

    const lineItem = session.line_items?.data[0];
    const product = lineItem?.price?.product as import('stripe').Stripe.Product;
    s3Key = product?.metadata?.s3_key || null;
    if (product?.name) contentName = product.name;

    // Cache in Supabase so future loads use Path 2 instead
    if (s3Key && sessionEmail) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;
      const userId = session.metadata?.user_id || sessionUserId || null;

      const { data: savedRow } = await supabase
        .from('purchases')
        .upsert({
          email: sessionEmail,
          purchase_type: 'vod',
          stripe_session_id: sessionId,
          stripe_payment_intent_id: paymentIntentId,
          stripe_product_id: product?.id || null,
          product_name: product?.name || 'VOD Purchase',
          product_image: (product?.images && product.images[0]) || null,
          s3_key: s3Key,
          amount_paid: session.amount_total || 0,
          currency: session.currency || 'usd',
          user_id: userId,
          session_claimed_at: new Date().toISOString(),
          session_version: 1,
        }, { onConflict: 'stripe_session_id' })
        .select('id')
        .single();

      if (savedRow) {
        redirect(`/watch?purchase_id=${savedRow.id}`);
      }
    }
  }

  if (!s3Key) redirect('/vod');

  // ── Issue CloudFront signed cookies and build video URL ──────────────────
  // If we have a known expiry (PPV replay), issue cookies that last until the
  // window actually closes so they never expire before the UI countdown reaches zero.
  // For subscribers and VOD (no fixed expiry), fall back to 6 hours.
  const CF_DEFAULT_SECONDS = 6 * 60 * 60;
  const cfExpiresInSeconds = expiresAt
    ? Math.max(300, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : CF_DEFAULT_SECONDS;

  const { cookies: cfCookies, videoUrl } = getSignedCookiesForKey(s3Key, cfExpiresInSeconds);

  // Set the three CloudFront signed cookies on the response
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    domain: '.boxstreamtv.com',
    path: '/',
    maxAge: cfExpiresInSeconds,
  };

  if (cfCookies['CloudFront-Policy']) {
    cookieStore.set('CloudFront-Policy', cfCookies['CloudFront-Policy'], cookieOptions);
  }
  if (cfCookies['CloudFront-Signature']) {
    cookieStore.set('CloudFront-Signature', cfCookies['CloudFront-Signature'], cookieOptions);
  }
  if (cfCookies['CloudFront-Key-Pair-Id']) {
    cookieStore.set('CloudFront-Key-Pair-Id', cfCookies['CloudFront-Key-Pair-Id'], cookieOptions);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
      {sessionId && <SaveSession sessionId={sessionId} />}
      <div className="vod-watch-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-24 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">
          {contentName || 'Now Playing'}
        </h1>
        <p className="text-gray-400 mb-2 text-center">
          {isSubscriber ? 'Enjoy your replay with Fight Pass.' : 'Enjoy your replay.'}
        </p>
        {expiresAt && (
          <div className="mb-8 text-center">
            <ExpiryCountdown expiresAt={expiresAt} />
          </div>
        )}

        <div className="vod-player-wrapper w-full rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl shadow-accent/10">
          <VodPlayer src={videoUrl} expiresAt={expiresAt} />
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Having trouble? Try refreshing the page or{' '}
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </main>
  );
}
