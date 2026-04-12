import { createHmac } from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxstreamtv.com';

function sign(email: string, type: string, ref: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return createHmac('sha256', secret).update(`${email}:${type}:${ref}`).digest('hex');
}

/** Verify that a survey token matches the given email/type/ref triple. */
export function verifySurveyToken(
  email: string,
  type: string,
  ref: string,
  token: string,
): boolean {
  const expected = sign(email, type, ref);
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Build a signed survey URL for the given recipient. */
export function surveyUrl(
  email: string,
  type: 'ppv' | 'vod',
  ref: string,
  subject: string,
): string {
  const token = sign(email, type, ref);
  const params = new URLSearchParams({ email, type, ref, subject, token });
  return `${BASE_URL}/survey?${params}`;
}
