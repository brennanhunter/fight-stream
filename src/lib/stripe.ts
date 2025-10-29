import Stripe from 'stripe';
import { loadStripe as loadStripeJS, Stripe as StripeJS } from '@stripe/stripe-js';

// Server-side Stripe instance (for API routes)
// This includes the secret key and should ONLY be used in server components/API routes
export const stripeServer = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

// Client-side Stripe promise (for frontend components)
// This uses the publishable key and is safe for client-side use
let stripePromise: Promise<StripeJS | null>;

export const loadStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripeJS(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Helper function to format amount for Stripe (converts dollars to cents)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper function to format amount for display (converts cents to dollars)
export const formatAmountForDisplay = (amount: number): string => {
  return (amount / 100).toFixed(2);
};
