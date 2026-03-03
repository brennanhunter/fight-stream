import { redirect } from 'next/navigation';
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
  searchParams: { session_id: string };
}) {
  if (!searchParams.session_id) redirect('/vod');

  const session = await stripe.checkout.sessions.retrieve(
    searchParams.session_id
  );

  if (session.payment_status !== 'paid') redirect('/vod');

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
