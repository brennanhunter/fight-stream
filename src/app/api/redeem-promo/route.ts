import { NextRequest, NextResponse } from 'next/server';
import { createSession, getEventExpirationDate } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const validCode = process.env.PPV_PROMO_CODE;

    if (!validCode) {
      return NextResponse.json(
        { error: 'No promo codes are currently active' },
        { status: 400 }
      );
    }

    // Case-insensitive comparison
    if (code.trim().toUpperCase() !== validCode.trim().toUpperCase()) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    // Code is valid — grant access by creating a session
    const sessionData = {
      purchaseId: `promo-${code.trim().toUpperCase()}-${Date.now()}`,
      email: 'promo@boxstreamtv.com',
      eventId: 'havoc-hilton-3-2026',
      eventName: 'Havoc at the Hilton 3',
      purchasedAt: new Date().toISOString(),
      expiresAt: getEventExpirationDate(),
    };

    await createSession(sessionData);

    return NextResponse.json({
      success: true,
      message: 'Promo code redeemed! Access granted.',
    });
  } catch (error) {
    console.error('Promo redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem promo code' },
      { status: 500 }
    );
  }
}
