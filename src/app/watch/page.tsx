import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

  // Save session_id in a cookie so user can come back (48 hours)
  cookieStore.set('vod_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 48, // 48 hours
  });

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: 'Fix Robinson final.mov',
  });

  const videoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return (
    <main>
      <video
        src={videoUrl}
        controls
        autoPlay
        style={{ width: '100%', maxWidth: '1280px' }}
      />
    </main>
  );
}
