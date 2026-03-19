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
        .select('s3_key, stripe_session_id, expires_at')
        .eq('id', params.purchase_id)
        .maybeSingle();

      if (purchase?.expires_at && new Date(purchase.expires_at) < new Date()) {
        redirect('/vod');
      }

      if (purchase?.s3_key) {
        s3Key = purchase.s3_key;
        sessionId = purchase.stripe_session_id;
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

    const lineItem = session.line_items?.data[0];
    const product = lineItem?.price?.product as import('stripe').Stripe.Product;
    s3Key = product?.metadata?.s3_key || null;
  }

  if (!s3Key) redirect('/vod');

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: s3Key,
  });

  const videoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
      {sessionId && <SaveSession sessionId={sessionId} />}
      <div className="vod-watch-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-24 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">
          Now Playing
        </h1>
        <p className="text-gray-400 mb-8 text-center">
          {isSubscriber ? 'Enjoy your replay with Fight Pass.' : 'Enjoy your replay. Your access is valid for 48 hours.'}
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
