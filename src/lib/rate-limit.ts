import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Simple sliding-window rate limiter.
 * Returns null if allowed, or a 429 Response if blocked.
 *
 * @param req       - Incoming request (used to extract IP)
 * @param endpoint  - Unique identifier for the endpoint (e.g., 'recover-access')
 * @param limit     - Max requests allowed in the window
 * @param windowMs  - Window size in milliseconds (default: 60 000 = 1 min)
 */
export function rateLimit(
  req: NextRequest,
  endpoint: string,
  limit: number,
  windowMs = 60_000,
): NextResponse | null {
  const ip = getClientIp(req);
  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  return null;
}
