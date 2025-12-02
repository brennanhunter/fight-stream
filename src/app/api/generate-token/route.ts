import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { hasEventAccess } from '@/lib/session';

export async function POST() {
  try {
    // Verify user has purchased access to the event
    const hasPurchased = await hasEventAccess('havoc-hilton-2025');
    
    if (!hasPurchased) {
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

    // Generate IVS token
    const token = jwt.sign(
      {
        'aws:channel-arn': process.env.IVS_CHANNEL_ARN,
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
      playbackUrl: process.env.IVS_PLAYBACK_URL 
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
