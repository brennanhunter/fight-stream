import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';

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

    // Get the active event from Supabase
    const supabase = createServerClient();
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, date, price_cents, stripe_price_id')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeEvent) {
      return NextResponse.json(
        { error: 'No active event found.' },
        { status: 404 }
      );
    }

    // Create a PaymentIntent with the event details
    const paymentIntent = await stripeServer.paymentIntents.create({
      amount: activeEvent.price_cents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        event_id: activeEvent.id,
        event_name: activeEvent.name,
        event_date: activeEvent.date,
        price_id: activeEvent.stripe_price_id || '',
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
