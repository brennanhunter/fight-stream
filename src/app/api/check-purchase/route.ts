import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('vod_session')?.value;

  return NextResponse.json({ purchased: !!sessionId });
}
