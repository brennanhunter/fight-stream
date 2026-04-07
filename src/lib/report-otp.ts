async function computeCode(eventId: string, email: string, hourTs: number): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key,
    encoder.encode(`report_otp:${eventId}:${email.toLowerCase()}:${hourTs}`),
  );
  const bytes = new Uint8Array(sig);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1_000_000).padStart(6, '0');
}

export async function generateReportOtp(eventId: string, email: string): Promise<string> {
  const hourTs = Math.floor(Date.now() / 3_600_000);
  return computeCode(eventId, email, hourTs);
}

export async function verifyReportOtp(eventId: string, email: string, code: string): Promise<boolean> {
  const hourTs = Math.floor(Date.now() / 3_600_000);
  const [current, prev] = await Promise.all([
    computeCode(eventId, email, hourTs),
    computeCode(eventId, email, hourTs - 1),
  ]);
  return code === current || code === prev;
}
