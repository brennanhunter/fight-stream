import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'check-purchase', 30);
  if (limited) return limited;

  try {
    const { eventId } = await req.json();

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ purchased: false });
    }

    // Check JWT session cookie first (fastest, no DB call)
    const session = await getSession();
    if (session?.eventId === eventId) {
      return NextResponse.json({ purchased: true });
    }

    const supabase = createServerClient();

    // Check by logged-in user's ID first
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        // Premium subscribers have access to all events
        const tier = await getSubscriptionTier(user.id);
        if (tier === 'premium') {
          return NextResponse.json({ purchased: true });
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
          return NextResponse.json({ purchased: true });
        }

        // Also check by user's email
        if (user.email) {
          const { data: emailPurchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('email', user.email.toLowerCase())
            .eq('event_id', eventId)
            .eq('purchase_type', 'ppv')
            .or(`expires_at.gt.${now},expires_at.is.null`)
            .limit(1)
            .maybeSingle();

          if (emailPurchase) {
            return NextResponse.json({ purchased: true });
          }
        }

        // Authenticated user with no matching purchase — don't fall through to cookie
        return NextResponse.json({ purchased: false });
      }
    } catch {
      // Not logged in — continue to cookie check
    }

    // Fall back to customer_email cookie
    const cookieStore = await cookies();
    const customerEmail = cookieStore.get('customer_email')?.value;

    if (customerEmail) {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('email', customerEmail.toLowerCase())
        .eq('event_id', eventId)
        .eq('purchase_type', 'ppv')
        .or(`expires_at.gt.${now},expires_at.is.null`)
        .limit(1)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ purchased: true });
      }
    }

    return NextResponse.json({ purchased: false });
  } catch (error) {
    console.error('Check purchase error:', error);
    return NextResponse.json({ purchased: false });
  }
}
