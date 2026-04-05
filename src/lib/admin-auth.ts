export const ADMIN_COOKIE = 'bstv_adm';

export async function getAdminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.JWT_SECRET;
  if (!password) throw new Error('ADMIN_PASSWORD env var not set');
  if (!secret) throw new Error('JWT_SECRET env var not set');

  // HMAC-SHA256 with JWT_SECRET as key — prevents rainbow tables and adds salt
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`bstv_admin:${password}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    const expected = await getAdminToken();
    // Constant-length comparison (not timing-safe at this layer, but token is already
    // a full HMAC — brute-force requires the JWT_SECRET)
    return value === expected;
  } catch {
    return false;
  }
}
