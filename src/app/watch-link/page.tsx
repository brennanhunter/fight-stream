import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
};

export default async function WatchLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect('/');

  let purchaseId: string | null = null;
  let email: string | null = null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.type === 'magic-link' && payload.purchaseId && payload.email) {
      purchaseId = payload.purchaseId as string;
      email = payload.email as string;
    }
  } catch {
    // Invalid or expired token
  }

  if (!purchaseId || !email) redirect('/');

  const cookieStore = await cookies();
  cookieStore.set('customer_email', encodeURIComponent(email), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 3650, // 10 years
    path: '/',
  });

  redirect(`/watch?purchase_id=${purchaseId}`);
}
