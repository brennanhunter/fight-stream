import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { hasEventAccess, getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'generate-token', 30);
  if (limited) return limited;

  try {
    // Find the active event
    const supabase = createServerClient();
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, ivs_channel_arn, ivs_playback_url')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeEvent) {
      return NextResponse.json(
        { error: 'No active event.' },
        { status: 404 }
      );
    }

    // 1) Check session cookie
    const cookieAccess = await hasEventAccess(activeEvent.id);
    let hasCookieAccess = cookieAccess.valid;

    // Validate session_version against the DB (prevents shared/stolen sessions)
    if (hasCookieAccess && cookieAccess.sessionVersion != null) {
      const session = await getSession();
      if (session?.purchaseId) {
        const { data: purchaseRow } = await supabase
          .from('purchases')
          .select('session_version')
          .eq('stripe_payment_intent_id', session.purchaseId)
          .maybeSingle();

        if (!purchaseRow) {
          // Purchase was deleted or refunded — deny access
          hasCookieAccess = false;
        } else if (purchaseRow.session_version !== cookieAccess.sessionVersion) {
          // Someone else has claimed this session — deny access
          hasCookieAccess = false;
        }
      }
    }

    // 2) Check purchases table and premium subscription (fallback when cookie expired)
    let hasPurchaseRecord = false;
    let hasPremium = false;
    if (!hasCookieAccess) {
      // Get user once for both checks
      let user = null;
      try {
        const authClient = await createAuthServerClient();
        const { data } = await authClient.auth.getUser();
        user = data.user;
      } catch {
        // Not logged in — continue
      }

      // Check by logged-in user
      if (user) {
        const { data: byId } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', activeEvent.id)
          .eq('purchase_type', 'ppv')
          .limit(1)
          .maybeSingle();
        if (byId) hasPurchaseRecord = true;

        if (!hasPurchaseRecord && user.email) {
          const { data: byEmail } = await supabase
            .from('purchases')
            .select('id')
            .eq('email', user.email.toLowerCase())
            .eq('event_id', activeEvent.id)
            .eq('purchase_type', 'ppv')
            .limit(1)
            .maybeSingle();
          if (byEmail) hasPurchaseRecord = true;
        }

        // Check premium subscription
        if (!hasPurchaseRecord) {
          const tier = await getSubscriptionTier(user.id);
          hasPremium = tier === 'premium';
        }
      }

      // Note: customer_email cookie fallback removed here because it bypasses
      // session_version enforcement. Anonymous users whose ppv_session expired
      // should use recover-access to get a fresh session.
    }

    if (!hasCookieAccess && !hasPurchaseRecord && !hasPremium) {
      // Distinguish between "never purchased" and "purchased but session invalid"
      // so the client can show recover-access instead of a buy button.
      const { cookies: getCookies } = await import('next/headers');
      const cookieStore = await getCookies();
      const customerEmail = cookieStore.get('customer_email')?.value;
      let hasExistingPurchase = false;
      if (customerEmail) {
        const now = new Date().toISOString();
        const { data: emailPurchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('email', customerEmail.toLowerCase())
          .eq('event_id', activeEvent.id)
          .eq('purchase_type', 'ppv')
          .or(`expires_at.gt.${now},expires_at.is.null`)
          .limit(1)
          .maybeSingle();
        hasExistingPurchase = !!emailPurchase;
      }

      return NextResponse.json(
        {
          error: 'Access denied.',
          reason: hasExistingPurchase ? 'session_invalid' : 'no_purchase',
        },
        { status: 403 }
      );
    }

    // Get the private key from environment
    const privateKey = process.env.IVS_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Use per-event IVS settings from DB, fall back to env vars
    const channelArn = activeEvent.ivs_channel_arn || process.env.IVS_CHANNEL_ARN;
    const playbackUrl = activeEvent.ivs_playback_url || process.env.IVS_PLAYBACK_URL;

    if (!channelArn || !playbackUrl) {
      return NextResponse.json(
        { error: 'Stream not configured for this event' },
        { status: 500 }
      );
    }

    // Generate IVS token
    const token = jwt.sign(
      {
        'aws:channel-arn': channelArn,
        'aws:access-control-allow-origin': process.env.NEXT_PUBLIC_SITE_URL,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12) // 12 hour expiry — covers longest possible live event
      },
      privateKey,
      {
        algorithm: 'ES384',
        keyid: process.env.IVS_KEY_PAIR_ARN
      }
    );

    return NextResponse.json({ 
      token, 
      playbackUrl 
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
