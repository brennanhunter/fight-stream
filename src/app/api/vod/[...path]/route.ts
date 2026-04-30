import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CLOUDFRONT_KEY_ID = process.env.CLOUDFRONT_KEY_ID!;
const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY!;
const SIGN_SECRET = process.env.JWT_SECRET!;

/**
 * Proxy VOD requests to CloudFront with a signed URL.
 * The client passes ?token=<hmac>&prefix=<s3Prefix> to authorize access.
 * Token is an HMAC of the prefix, so only server-issued prefixes can be accessed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const s3Path = path.join('/');

  const token = request.nextUrl.searchParams.get('token');
  const prefix = request.nextUrl.searchParams.get('prefix');

  if (!token || !prefix) {
    return NextResponse.json({ error: 'Missing token or prefix' }, { status: 400 });
  }

  // Verify that s3Path starts with the authorized prefix
  if (!s3Path.startsWith(prefix)) {
    return NextResponse.json({ error: 'Path outside authorized prefix' }, { status: 403 });
  }

  // Verify HMAC
  const expected = crypto.createHmac('sha256', SIGN_SECRET).update(prefix).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Generate a signed URL for this specific file
  const cfUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Path}`;
  const signedUrl = getSignedUrl({
    keyPairId: CLOUDFRONT_KEY_ID,
    privateKey: CLOUDFRONT_PRIVATE_KEY,
    url: cfUrl,
    dateLessThan: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  });

  // For HLS manifests, proxy and rewrite relative paths to include auth query params
  // so that HLS.js sub-requests (sub-playlists, segments) also pass auth.
  if (s3Path.endsWith('.m3u8')) {
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }
    const text = await upstream.text();
    const qs = `?token=${token}&prefix=${encodeURIComponent(prefix)}`;
    const rewritten = text.replace(/^(?!#)(\S+)$/gm, (match) => match + qs);
    const headers = new Headers();
    headers.set('content-type', 'application/vnd.apple.mpegurl');
    headers.set('cache-control', 'private, max-age=5');
    return new NextResponse(rewritten, { status: 200, headers });
  }

  // For all other assets (segments, MP4s), redirect the client directly to CloudFront.
  // This avoids proxying video bytes through the serverless function.
  return NextResponse.redirect(signedUrl, { status: 302 });
}
