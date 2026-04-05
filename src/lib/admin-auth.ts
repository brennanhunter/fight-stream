export const ADMIN_COOKIE = 'bstv_adm';

export async function getAdminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD env var not set');
  const data = new TextEncoder().encode(`bstv_admin:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    return value === (await getAdminToken());
  } catch {
    return false;
  }
}
