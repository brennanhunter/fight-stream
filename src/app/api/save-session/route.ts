import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Read existing session IDs from the cookie (stored as JSON array)
  const existing = cookieStore.get('vod_sessions')?.value;
  let sessionIds: string[] = [];
  try {
    sessionIds = existing ? JSON.parse(existing) : [];
  } catch {
    sessionIds = [];
  }

  // Migrate the legacy single-value cookie so older purchases aren't lost
  const legacy = cookieStore.get('vod_session')?.value;
  if (legacy && !sessionIds.includes(legacy)) {
    sessionIds.push(legacy);
  }

  // Append the new ID if it isn't already saved
  if (!sessionIds.includes(sessionId)) {
    sessionIds.push(sessionId);
  }

  cookieStore.set('vod_sessions', JSON.stringify(sessionIds), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  // Keep a single-value cookie as a quick fallback for the watch page
  cookieStore.set('vod_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ success: true });
}
