import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';

export async function POST() {
  try {
    // Check if Stripe is configured
    if (!stripeServer) {
      console.error('Stripe is not configured - STRIPE_SECRET_KEY is missing');
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create a PaymentIntent with the event details
    const paymentIntent = await stripeServer.paymentIntents.create({
      amount: 1999, // $19.99 in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        event_id: 'havoc-hilton-3-2026',
        event_name: 'Havoc at the Hilton 3',
        event_date: '2026-03-07T19:00:00-05:00',
        product_id: process.env.STRIPE_PRODUCT_ID || '',
        price_id: process.env.STRIPE_PRICE_ID || '',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
