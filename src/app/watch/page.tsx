import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import SaveSession from './SaveSession';
import VodPlayer from './VodPlayer';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; purchase_id?: string; product_id?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  let s3Key: string | null = null;
  let sessionId: string | null = null;
  let isSubscriber = false;

  // 0. Subscription access by product_id
  if (params.product_id) {
    try {
      const supabase = await createAuthServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tier = await getSubscriptionTier(user.id);
        if (tier) {
          // Subscriber — look up the s3_key from the Stripe product
          const product = await stripe.products.retrieve(params.product_id);
          if (product.metadata?.s3_key) {
            s3Key = product.metadata.s3_key;
            isSubscriber = true;
          }
        }
      }
    } catch (err) {
      console.error('Subscription access error:', err);
    }
  }

  // 1. Try Supabase lookup by purchase_id
  if (params.purchase_id) {
    try {
      const supabase = createServerClient();
      const { data: purchase } = await supabase
        .from('purchases')
        .select('s3_key, stripe_session_id, expires_at, user_id, email')
        .eq('id', params.purchase_id)
        .maybeSingle();

      if (purchase) {
        // Verify ownership: must match authenticated user or customer_email cookie
        let isOwner = false;
        try {
          const authClient = await createAuthServerClient();
          const { data: { user } } = await authClient.auth.getUser();
          if (user && purchase.user_id && user.id === purchase.user_id) {
            isOwner = true;
          } else if (user?.email && purchase.email && user.email.toLowerCase() === purchase.email.toLowerCase()) {
            isOwner = true;
          }
        } catch {
          // Not logged in — fall through to cookie check
        }

        if (!isOwner) {
          const customerEmail = cookieStore.get('customer_email')?.value;
          if (customerEmail && purchase.email && decodeURIComponent(customerEmail).toLowerCase() === purchase.email.toLowerCase()) {
            isOwner = true;
          }
        }

        if (!isOwner) {
          redirect('/recover-access');
        }

        if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
          redirect('/vod');
        }

        if (purchase.s3_key) {
          s3Key = purchase.s3_key;
          sessionId = purchase.stripe_session_id;
        }
      }
    } catch (err) {
      console.error('Supabase lookup error:', err);
    }
  }

  // 2. Fall back to Stripe session_id (from URL or cookie)
  if (!s3Key && !isSubscriber) {
    sessionId = params.session_id || cookieStore.get('vod_session')?.value || null;

    if (!sessionId) redirect('/vod');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });

    if (session.payment_status !== 'paid') redirect('/vod');

    // Verify ownership: session must belong to the current user or customer_email cookie
    const sessionEmail = session.customer_details?.email?.toLowerCase() || session.customer_email?.toLowerCase();
    let sessionOwner = false;
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user?.email && sessionEmail && user.email.toLowerCase() === sessionEmail) {
        sessionOwner = true;
      }
    } catch {
      // Not logged in — fall through to cookie check
    }
    if (!sessionOwner) {
      const customerEmail = cookieStore.get('customer_email')?.value;
      if (customerEmail && sessionEmail && decodeURIComponent(customerEmail).toLowerCase() === sessionEmail) {
        sessionOwner = true;
      }
    }
    if (!sessionOwner) redirect('/recover-access');

    const lineItem = session.line_items?.data[0];
    const product = lineItem?.price?.product as import('stripe').Stripe.Product;
    s3Key = product?.metadata?.s3_key || null;
  }

  if (!s3Key) redirect('/vod');

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: s3Key,
  });

  const videoUrl = await getSignedUrl(s3, command, { expiresIn: 21600 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
      {sessionId && <SaveSession sessionId={sessionId} />}
      <div className="vod-watch-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-24 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">
          Now Playing
        </h1>
        <p className="text-gray-400 mb-8 text-center">
          {isSubscriber ? 'Enjoy your replay with Fight Pass.' : 'Enjoy your replay.'}
        </p>

        <div className="vod-player-wrapper w-full rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl shadow-accent/10">
          <VodPlayer src={videoUrl} />
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Having trouble? Try refreshing the page or contact support.
        </p>
      </div>
    </main>
  );
}
