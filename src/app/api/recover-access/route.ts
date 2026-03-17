import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    const supabase = createServerClient();

    // Find an active PPV event
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, expires_at')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeEvent) {
      return NextResponse.json(
        { error: 'No active event found' },
        { status: 404 }
      );
    }

    // Look up purchase by email + event (take the most recent one)
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, email, event_id, product_name, expires_at')
      .eq('email', trimmedEmail)
      .eq('event_id', activeEvent.id)
      .eq('purchase_type', 'ppv')
      .order('created_at', { ascending: false })
      .limit(1);

    const purchase = purchases?.[0] || null;

    if (!purchase) {
      return NextResponse.json(
        { error: 'No purchase found for this email. Please check the email address you used at checkout.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Your access to this event has expired.' },
        { status: 403 }
      );
    }

    // Re-create the JWT session cookie
    const expiresAt = activeEvent.expires_at
      ? new Date(activeEvent.expires_at).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const sessionData = {
      purchaseId: purchase.id,
      email: trimmedEmail,
      eventId: activeEvent.id,
      eventName: activeEvent.name,
      purchasedAt: new Date().toISOString(),
      expiresAt,
    };

    await createSession(sessionData);

    // Also set the customer_email cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('customer_email', trimmedEmail, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({
      success: true,
      message: 'Access restored! Reloading...',
      eventName: activeEvent.name,
    });
  } catch (error) {
    console.error('Access recovery error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
