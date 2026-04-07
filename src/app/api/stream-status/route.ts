import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('events')
    .select('is_streaming')
    .eq('is_active', true)
    .maybeSingle();

  return NextResponse.json({ live: data?.is_streaming ?? false });
}
