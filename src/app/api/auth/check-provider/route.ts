import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'check-provider', 10);
  if (limited) return limited;

  const { email } = await request.json();
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ provider: null });
  }

  const supabase = createServerClient();

  // Use a paginated search — listUsers without filter is the only option in this client version.
  // Rate limited above to prevent enumeration abuse.
  const { data } = await supabase.auth.admin.listUsers();

  const user = data?.users?.find(
    (u) => u.email && normalizeEmail(u.email) === normalizeEmail(email)
  );

  if (!user) return NextResponse.json({ provider: null });

  // identities[0].provider is 'google', 'email', etc.
  const provider = user.identities?.[0]?.provider ?? 'email';
  return NextResponse.json({ provider });
}
