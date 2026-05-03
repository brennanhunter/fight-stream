import { timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function unb64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Mint a magic-link token for VOD recovery.
 * Token format: base64url(email).base64url(expMs).hexHmac
 * The HMAC binds email + expiry so neither can be tampered with.
 */
export async function generateVodRecoveryToken(email: string): Promise<string> {
  const lower = email.trim().toLowerCase();
  const expMs = Date.now() + TOKEN_TTL_MS;
  const payload = `${b64url(lower)}.${b64url(String(expMs))}`;
  const sig = await hmac(`bstv_vodrec:${payload}`);
  return `${payload}.${sig}`;
}

export async function verifyVodRecoveryToken(token: string): Promise<{ email: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [emailPart, expPart, sig] = parts;
  const payload = `${emailPart}.${expPart}`;

  let expected: string;
  try {
    expected = await hmac(`bstv_vodrec:${payload}`);
  } catch {
    return null;
  }

  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

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
