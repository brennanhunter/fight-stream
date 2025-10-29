import { NextRequest, NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Create a PaymentIntent with the event details
    const paymentIntent = await stripeServer.paymentIntents.create({
      amount: 2199, // $21.99 in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        event_id: 'havoc-hilton-2025',
        event_name: 'Havoc at Hilton',
        event_date: '2025-11-08T18:00:00-05:00',
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
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
