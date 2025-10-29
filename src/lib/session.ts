import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Session data structure
export interface SessionData {
  purchaseId: string;        // Stripe payment intent ID
  email: string;             // Customer email
  eventId: string;           // Event identifier (e.g., "havoc-hilton-2025")
  eventName: string;         // Human-readable event name
  purchasedAt: string;       // ISO timestamp of purchase
  expiresAt: string;         // ISO timestamp when access expires
}

// Cookie name for the session
const SESSION_COOKIE_NAME = 'ppv_session';

// Secret key for signing JWTs (in production, use a proper secret from env)
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  return new TextEncoder().encode(secret);
};

/**
 * Create a signed JWT session token and set it as a cookie
 */
export async function createSession(data: SessionData): Promise<string> {
  // Convert ISO date string to Unix timestamp (seconds since epoch)
  const expirationTimestamp = Math.floor(new Date(data.expiresAt).getTime() / 1000);
  
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTimestamp)
    .sign(getSecretKey());

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(data.expiresAt),
    path: '/',
  });

  return token;
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    
    // Verify the token hasn't expired
    const now = new Date();
    const expiresAt = new Date(payload.expiresAt as string);
    
    if (now > expiresAt) {
      return null; // Session expired
    }

    return payload as unknown as SessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Check if user has access to a specific event
 */
export async function hasEventAccess(eventId: string): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    return false;
  }

  // Check if the session is for the requested event
  if (session.eventId !== eventId) {
    return false;
  }

  // Check if access hasn't expired
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  return now <= expiresAt;
}

/**
 * Delete the session cookie (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Helper to create session data for Havoc at Hilton event
 */
export function createHavocAtHiltonSession(
  purchaseId: string,
  email: string
): Omit<SessionData, 'purchasedAt' | 'expiresAt'> {
  return {
    purchaseId,
    email,
    eventId: 'havoc-hilton-2025',
    eventName: 'Havoc at Hilton',
  };
}

/**
 * Get expiration date for event access (day after event)
 */
export function getEventExpirationDate(): string {
  // Event is Nov 8, 2025 at 6 PM EST
  // Access expires Nov 9, 2025 at 11:59 PM EST
  return new Date('2025-11-09T23:59:59-05:00').toISOString();
}
