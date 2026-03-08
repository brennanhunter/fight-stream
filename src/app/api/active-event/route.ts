import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const revalidate = 60; // revalidate every 60 seconds (ISR)

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, date, price_cents, currency, poster_image, stripe_price_id, expires_at, is_active')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Supabase active-event error:', error);
      return NextResponse.json({ event: null });
    }

    return NextResponse.json({ event: event || null });
  } catch (err) {
    console.error('Active event fetch error:', err);
    return NextResponse.json({ event: null });
  }
}
