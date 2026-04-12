import { getSignedCookies, type CloudfrontSignedCookiesOutput } from '@aws-sdk/cloudfront-signer';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CLOUDFRONT_KEY_ID = process.env.CLOUDFRONT_KEY_ID!;
const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY!;

/**
 * Issue CloudFront signed cookies for a given S3 key path.
 * Cookies are valid for the specified duration (default 6 hours).
 * The wildcard policy covers the full path so HLS segments all pass through.
 */
export function getSignedCookiesForKey(s3Key: string, expiresInSeconds = 21600) {
  const url = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;

  // For HLS we need a wildcard so all .ts segments under the path are covered.
  // We sign the directory prefix with a wildcard rather than the exact file.
  const isHls = s3Key.endsWith('.m3u8') || s3Key.includes('/hls/');
  const resourceUrl = isHls
    ? `https://${CLOUDFRONT_DOMAIN}/${s3Key.substring(0, s3Key.lastIndexOf('/') + 1)}*`
    : url;

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  let cookies: CloudfrontSignedCookiesOutput;

  if (isHls) {
    // Wildcards require a custom policy. We must pass the `policy` param
    // directly — the SDK's url+dateLessThan always creates a canned policy
    // (CloudFront-Expires) which doesn't support wildcards.
    const policy = JSON.stringify({
      Statement: [{
        Resource: resourceUrl,
        Condition: {
          DateLessThan: { 'AWS:EpochTime': expiresAt },
        },
      }],
    });

    cookies = getSignedCookies({
      keyPairId: CLOUDFRONT_KEY_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      policy,
    });
  } else {
    cookies = getSignedCookies({
      keyPairId: CLOUDFRONT_KEY_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      url: resourceUrl,
      dateLessThan: new Date(expiresAt * 1000).toISOString(),
    });
  }

  return { cookies, videoUrl: `https://${CLOUDFRONT_DOMAIN}/${s3Key}` };
}
