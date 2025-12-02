import { NextRequest, NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createSession, getEventExpirationDate } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!stripeServer) {
      console.error('Stripe is not configured - STRIPE_SECRET_KEY is missing');
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripeServer.paymentIntents.retrieve(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Get customer email from payment intent
    const customerEmail = paymentIntent.receipt_email || 'customer@example.com';

    // Create session data
    const sessionData = {
      purchaseId: paymentIntent.id,
      email: customerEmail,
      eventId: 'havoc-hilton-2025',
      eventName: 'Havoc at Hilton',
      purchasedAt: new Date().toISOString(),
      expiresAt: getEventExpirationDate(),
    };

    // Create JWT session cookie
    await createSession(sessionData);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and access granted',
      eventAccess: {
        eventId: sessionData.eventId,
        eventName: sessionData.eventName,
        expiresAt: sessionData.expiresAt,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
