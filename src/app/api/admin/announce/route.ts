import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { inngest } from '@/lib/inngest';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2 announces per hour — prevents accidental double-sends
  const blocked = await rateLimit(request, 'admin-announce', 2, 60 * 60 * 1000);
  if (blocked) return blocked;

  const { eventName, eventDate, ppvPrice } = await request.json();
  if (!eventName || !eventDate || !ppvPrice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Dedup key: same event name + date within a 10-minute window won't trigger twice
  const dedupBucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const dedupId = `announce-${eventName}-${eventDate}-${dedupBucket}`;

  await inngest.send({
    id: dedupId,
    name: 'admin/announce',
    data: { eventName, eventDate, ppvPrice },
  });

  return NextResponse.json({ ok: true, queued: true });
}
