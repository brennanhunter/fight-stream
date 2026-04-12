import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'check-purchase', 30);
  if (limited) return limited;

  try {
    const { eventId } = await req.json();

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ purchased: false });
    }

    const supabase = createServerClient();

    // Check JWT session cookie first
    const session = await getSession();
    if (session?.eventId === eventId && (!session.expiresAt || new Date(session.expiresAt) > new Date())) {
      const { data: sessionPurchase } = await supabase
        .from('purchases')
        .select('id, session_version, expires_at')
        .eq('stripe_payment_intent_id', session.purchaseId)
        .maybeSingle();

      if (sessionPurchase) {
        // Validate session_version matches the DB (detects refunds/revocations that
        // bump the version) and that the purchase hasn't been expired by a refund.
        const versionOk = (sessionPurchase.session_version ?? 1) === (session.sessionVersion ?? 1);
        const notExpired = !(sessionPurchase.expires_at && new Date(sessionPurchase.expires_at) < new Date());
        if (!versionOk || !notExpired) {
          return NextResponse.json({ purchased: false });
        }
        return NextResponse.json({ purchased: true, purchaseId: sessionPurchase.id });
      }

      // No DB record yet (webhook/verify-payment race) — trust the JWT for now
      return NextResponse.json({ purchased: true, purchaseId: null });
    }

    // Check by logged-in user's ID first
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        // Premium subscribers have access to all events
        const tier = await getSubscriptionTier(user.id);
        if (tier === 'premium') {
          return NextResponse.json({ purchased: true, purchaseId: null, isSubscriber: true });
        }

        const now = new Date().toISOString();
        const { data } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', eventId)
          .eq('purchase_type', 'ppv')
          .or(`expires_at.gt.${now},expires_at.is.null`)
          .limit(1)
          .maybeSingle();

        if (data) {
          return NextResponse.json({ purchased: true, purchaseId: data.id });
        }

        // Also check by user's email
        if (user.email) {
          const { data: emailPurchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('email', normalizeEmail(user.email))
            .eq('event_id', eventId)
            .eq('purchase_type', 'ppv')
            .or(`expires_at.gt.${now},expires_at.is.null`)
            .limit(1)
            .maybeSingle();

          if (emailPurchase) {
            return NextResponse.json({ purchased: true, purchaseId: emailPurchase.id });
          }
        }

        // Authenticated user with no matching purchase — don't fall through to cookie
        return NextResponse.json({ purchased: false });
      }
    } catch (err) {
      // getUser() returns { user: null } for unauthenticated requests without throwing,
      // so this catch only fires on real errors (Supabase unreachable, bad env vars, etc.).
      console.error('check-purchase: auth lookup failed:', err);
      // Fall through to cookie check rather than blocking the request.
    }

    // Fall back to customer_email cookie — used only to distinguish "never purchased"
    // from "purchased but session expired" so the client can show recover-access.
    // We intentionally do NOT return purchased:true here because the customer_email
    // cookie cannot enforce session_version (single-device) checks.
    const cookieStore = await cookies();
    const customerEmail = cookieStore.get('customer_email')?.value;

    if (customerEmail) {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('email', normalizeEmail(customerEmail))
        .eq('event_id', eventId)
        .eq('purchase_type', 'ppv')
        .or(`expires_at.gt.${now},expires_at.is.null`)
        .limit(1)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ purchased: false, needsRecovery: true });
      }
    }

    return NextResponse.json({ purchased: false });
  } catch (error) {
    console.error('Check purchase error:', error);
    return NextResponse.json({ purchased: false });
  }
}
