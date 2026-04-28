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

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (payload.type !== 'magic-link' || !payload.purchaseId || !payload.email) {
      redirect('/');
    }

    const cookieStore = await cookies();
    cookieStore.set('customer_email', encodeURIComponent(payload.email as string), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    redirect(`/watch?purchase_id=${payload.purchaseId}`);
  } catch {
    redirect('/');
  }
}
