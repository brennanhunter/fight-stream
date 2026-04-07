import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function createReportSession(eventId: string, email: string): Promise<string> {
  return new SignJWT({ eventId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyReportSession(eventId: string, token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.eventId === eventId;
  } catch {
    return false;
  }
}

export function reportCookieName(eventId: string): string {
  return `rpt_${eventId.replace(/-/g, '')}`;
}
