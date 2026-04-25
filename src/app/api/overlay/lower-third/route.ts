import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('lower_third_state')
    .select('fighter_name, record, weight_class, visible, updated_at')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only allow known fields
  const allowed = ['fighter_name', 'record', 'weight_class', 'visible'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('lower_third_state')
    .update(update)
    .eq('id', 1)
    .select('fighter_name, record, weight_class, visible, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
