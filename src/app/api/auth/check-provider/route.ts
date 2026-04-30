import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ provider: null });

  const supabase = createServerClient();
  const { data } = await supabase.auth.admin.listUsers();

  const user = data?.users?.find(
    (u) => u.email && normalizeEmail(u.email) === normalizeEmail(email)
  );

  if (!user) return NextResponse.json({ provider: null });

  // identities[0].provider is 'google', 'email', etc.
  const provider = user.identities?.[0]?.provider ?? 'email';
  return NextResponse.json({ provider });
}
