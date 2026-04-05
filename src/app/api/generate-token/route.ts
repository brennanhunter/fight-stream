import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { hasEventAccess } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';

export async function POST() {
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

    // Verify user has purchased access to the active event
    const hasPurchased = await hasEventAccess(activeEvent.id);

    // Also check if user has a premium subscription (grants free PPV)
    let hasPremium = false;
    if (!hasPurchased) {
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

    if (!hasPurchased && !hasPremium) {
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
