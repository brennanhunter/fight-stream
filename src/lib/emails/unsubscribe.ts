import { createHmac } from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxstreamtv.com';

/** Generate an HMAC-SHA256 signature for the given email address. */
function sign(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return createHmac('sha256', secret).update(email).digest('hex');
}

/** Verify that a signature matches the email. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = sign(email);
  if (expected.length !== token.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Build the full unsubscribe URL for a given email. */
export function unsubscribeUrl(email: string): string {
  const token = sign(email);
  return `${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

/** Return the headers object to pass to Resend for one-click + link unsubscribe. */
export function unsubscribeHeaders(email: string): Record<string, string> {
  const url = unsubscribeUrl(email);
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
