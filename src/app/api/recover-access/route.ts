import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'recover-access', 5);
  if (limited) return limited;

  try {
    const { email, eventId: clientEventId } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Per-email rate limit: 2 attempts per hour
    const emailLimited = rateLimit(req, 'recover-email', 2, 60 * 60 * 1000, trimmedEmail);
    if (emailLimited) return emailLimited;

    const supabase = createServerClient();

    // Look up specific event or fall back to active event
    let targetEvent;
    if (clientEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('id', clientEventId)
        .maybeSingle();
      targetEvent = data;
    }
    if (!targetEvent) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('is_active', true)
        .maybeSingle();
      targetEvent = data;
    }

    if (!targetEvent) {
      return NextResponse.json(
        { error: 'No event found' },
        { status: 404 }
      );
    }

    // Look up purchase by email + event (take the most recent one)
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, email, event_id, product_name, expires_at, session_version')
      .eq('email', trimmedEmail)
      .eq('event_id', targetEvent.id)
      .eq('purchase_type', 'ppv')
      .order('created_at', { ascending: false })
      .limit(1);

    const purchase = purchases?.[0] || null;

    if (!purchase) {
      return NextResponse.json(
        { error: 'Unable to recover access. Please check the email address you used at checkout.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Unable to recover access. Please check the email address you used at checkout.' },
        { status: 403 }
      );
    }

    // Re-create the JWT session cookie
    // Bump session_version to invalidate any other active session for this purchase
    const newSessionVersion = (purchase.session_version || 0) + 1;
    await supabase
      .from('purchases')
      .update({ session_version: newSessionVersion })
      .eq('id', purchase.id);

    const expiresAt = targetEvent.expires_at
      ? new Date(targetEvent.expires_at).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const sessionData = {
      purchaseId: purchase.id,
      email: trimmedEmail,
      eventId: targetEvent.id,
      eventName: targetEvent.name,
      purchasedAt: new Date().toISOString(),
      expiresAt,
      sessionVersion: newSessionVersion,
    };

    await createSession(sessionData);

    // Also set the customer_email cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('customer_email', trimmedEmail, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({
      success: true,
      message: 'Access restored! Reloading...',
      eventName: targetEvent.name,
    });
  } catch (error) {
    console.error('Access recovery error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
