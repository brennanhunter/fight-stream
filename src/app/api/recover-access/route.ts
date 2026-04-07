import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'recover-access', 10);
  if (limited) return limited;

  try {
    const { email, code, eventId: clientEventId } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Per-email rate limit: 5 attempts per hour
    const emailLimited = rateLimit(req, 'recover-access-email', 5, 60 * 60 * 1000, trimmedEmail);
    if (emailLimited) return emailLimited;

    const supabase = createServerClient();

    // Resolve target event
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
      return NextResponse.json({ error: 'No event found' }, { status: 404 });
    }

    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, email, event_id, expires_at, session_version, recovery_code, recovery_code_expires_at')
      .eq('email', trimmedEmail)
      .eq('event_id', targetEvent.id)
      .eq('purchase_type', 'ppv')
      .order('created_at', { ascending: false })
      .limit(1);

    const purchase = purchases?.[0] || null;

    const genericError = 'Invalid or expired code. Please request a new one.';

    if (!purchase) {
      return NextResponse.json({ error: genericError }, { status: 404 });
    }

    // Check purchase expiry
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json({ error: genericError }, { status: 403 });
    }

    // Verify code exists and matches
    if (!purchase.recovery_code || purchase.recovery_code !== trimmedCode) {
      return NextResponse.json({ error: genericError }, { status: 403 });
    }

    // Verify code hasn't expired
    if (!purchase.recovery_code_expires_at || new Date(purchase.recovery_code_expires_at) < new Date()) {
      return NextResponse.json({ error: genericError }, { status: 403 });
    }

    // Code is valid — atomically claim it by filtering on the code itself.
    // If two concurrent requests both pass the checks above, only the first
    // UPDATE will match (recovery_code is still set); the second gets 0 rows
    // back because the first already cleared it.
    const newSessionVersion = (purchase.session_version || 0) + 1;
    const { data: claimed } = await supabase
      .from('purchases')
      .update({
        session_version: newSessionVersion,
        recovery_code: null,
        recovery_code_expires_at: null,
      })
      .eq('id', purchase.id)
      .eq('recovery_code', trimmedCode)
      .select('session_version');

    if (!claimed || claimed.length === 0) {
      // Another concurrent request already consumed this code
      return NextResponse.json({ error: genericError }, { status: 403 });
    }

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
      message: 'Access restored!',
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
