import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import SaveSession from './SaveSession';

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
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // Get session_id from URL or from saved cookie
  const sessionId = params.session_id || cookieStore.get('vod_session')?.value;

  if (!sessionId) redirect('/vod');

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') redirect('/vod');

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: 'Fix Robinson final.mov',
  });

  const videoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
      <SaveSession sessionId={sessionId} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">
          Now Playing
        </h1>
        <p className="text-gray-400 mb-8 text-center">
          Enjoy your replay. Your access is valid for 48 hours.
        </p>

        <div className="w-full rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl shadow-accent/10">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full"
          />
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Having trouble? Try refreshing the page or contact support.
        </p>
      </div>
    </main>
  );
}
