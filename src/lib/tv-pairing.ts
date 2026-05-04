import crypto from 'crypto';

/**
 * TV pairing primitives.
 *
 * Two distinct secrets per pairing:
 *  - `code`: short, human-readable, displayed on the TV screen so the user
 *    can type it into /activate. Curated alphabet (no 0/O, 1/I/L).
 *  - `device_token`: long, opaque, held only by the TV. Hashed at rest.
 *    Used to authorize `/api/tv/pair/status` polls so a leaked code can't
 *    be used to impersonate the TV.
 *
 * Plus the `auth_token` minted at redeem time — an HMAC-signed string
 * containing the user's email + an expiry. Validated server-side on every
 * authenticated TV API call.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const CODE_LENGTH = 6;

export const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const TV_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Generate a 6-char display code, formatted as "ABC-DEF". */
export function generatePairingCode(): string {
  const buf = crypto.randomBytes(CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  }
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/** Generate the long device_token returned to the TV. */
export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 hash for storage. We never log or persist the raw token. */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Normalize a user-typed code: uppercase, strip whitespace/dashes, re-insert dash. */
export function normalizeCode(input: string): string | null {
  const cleaned = input.replace(/[\s-]+/g, '').toUpperCase();
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

// ── Auth token (returned to the TV after redeem) ─────────────────────────

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function unb64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Mint a long-lived TV auth token. Format:
 *   base64url(email).base64url(expMs).hexHmac
 * The HMAC binds email + expiry so neither can be tampered with.
 */
export async function generateTvAuthToken(
  email: string,
  ttlMs: number = TV_AUTH_TTL_MS,
): Promise<{ token: string; expiresAt: string }> {
  const lower = email.trim().toLowerCase();
  const expMs = Date.now() + ttlMs;
  const payload = `${b64url(lower)}.${b64url(String(expMs))}`;
  const sig = await hmac(`bstv_tv:${payload}`);
  return {
    token: `${payload}.${sig}`,
    expiresAt: new Date(expMs).toISOString(),
  };
}

/** Verify a TV auth token. Returns the email or null. */
export async function verifyTvAuthToken(
  token: string,
): Promise<{ email: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [emailPart, expPart, sig] = parts;
  const payload = `${emailPart}.${expPart}`;

  let expected: string;
  try {
    expected = await hmac(`bstv_tv:${payload}`);
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  if (
    !crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  ) {
    return null;
  }

  let email: string;
  let expMs: number;
  try {
    email = unb64url(emailPart);
    expMs = Number(unb64url(expPart));
  } catch {
    return null;
  }

  if (!Number.isFinite(expMs) || expMs < Date.now()) return null;
  if (!email || !email.includes('@')) return null;
  return { email };
}
