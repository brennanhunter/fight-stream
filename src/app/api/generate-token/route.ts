import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    // TODO: Verify user has paid/has access
    // const userId = req.session?.userId; // or however you handle auth
    // const hasPurchased = await checkUserPurchase(userId);
    
    // For now, we'll allow access (you'll add auth later)
    const hasPurchased = true;
    
    if (!hasPurchased) {
      return NextResponse.json(
        { error: 'Access denied' },
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
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
