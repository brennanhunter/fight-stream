import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function rateLimit(
  req: NextRequest,
  endpoint: string,
  limit: number,
  windowMs = 60_000,
  identifier?: string,
): Promise<NextResponse | null> {
  const id = identifier || getClientIp(req);
  const key = `${endpoint}:${id}`;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return null; // fail open
    }

    if (!data.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(data.retry_after) },
        },
      );
    }

    return null;
  } catch (err) {
    console.error('Rate limit error:', err);
    return null; // fail open
  }
}
