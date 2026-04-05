import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { hasEventAccess } from '@/lib/session';
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
    const hasCookieAccess = await hasEventAccess(activeEvent.id);

    // 2) Check purchases table (fallback when cookie expired)
    let hasPurchaseRecord = false;
    if (!hasCookieAccess) {
      // Check by logged-in user
      try {
        const authClient = await createAuthServerClient();
        const { data: { user } } = await authClient.auth.getUser();
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
        }
      } catch {
        // Not logged in — continue
      }

      // Check by customer_email cookie
      if (!hasPurchaseRecord) {
        const cookieStore = await cookies();
        const customerEmail = cookieStore.get('customer_email')?.value;
        if (customerEmail) {
          const { data: byCookie } = await supabase
            .from('purchases')
            .select('id')
            .eq('email', customerEmail.toLowerCase())
            .eq('event_id', activeEvent.id)
            .eq('purchase_type', 'ppv')
            .limit(1)
            .maybeSingle();
          if (byCookie) hasPurchaseRecord = true;
        }
      }
    }

    // 3) Check premium subscription
    let hasPremium = false;
    if (!hasCookieAccess && !hasPurchaseRecord) {
      try {
        const authClient = await createAuthServerClient();
        const { data: { user } } = await authClient.auth.getUser();
        if (user) {
          const tier = await getSubscriptionTier(user.id);
          hasPremium = tier === 'premium';
        }
      } catch {
        // Not logged in or error — continue
      }
    }

    if (!hasCookieAccess && !hasPurchaseRecord && !hasPremium) {
      return NextResponse.json(
        { error: 'Access denied. Please purchase the event to watch.' },
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
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2) // 2 hour expiry
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
