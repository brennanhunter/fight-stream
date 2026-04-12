'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getSignedCookiesForKey } from '@/lib/cloudfront';

const SIGN_SECRET = process.env.JWT_SECRET!;

/** Create an HMAC token so only server-authorized s3Keys can be signed. */
export async function createSignToken(s3Key: string) {
  return crypto.createHmac('sha256', SIGN_SECRET).update(s3Key).digest('hex');
}

/** Called from the client component to set CloudFront cookies and return the video URL. */
export async function signAndSetCookies(
  s3Key: string,
  token: string,
  expiresInSeconds: number,
) {
  // Verify the token to prevent arbitrary s3Key signing
  const expected = crypto.createHmac('sha256', SIGN_SECRET).update(s3Key).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    throw new Error('Unauthorized');
  }

  const { cookies: cfCookies, videoUrl } = getSignedCookiesForKey(s3Key, expiresInSeconds);

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    domain: '.boxstreamtv.com',
    path: '/',
    maxAge: expiresInSeconds,
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

  return videoUrl;
}
