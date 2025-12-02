'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// Load Stripe outside component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Create PaymentIntent when modal opens
      createPaymentIntent();
    }
  }, [isOpen]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#dc2626',
      colorBackground: '#1a1a1a',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-secondary border-2 border-accent/30 rounded-2xl shadow-2xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-red-600 to-primary p-6 border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Purchase PPV Access</h2>
              <p className="text-white/90 text-sm mt-1">Testing Only</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-accent transition-colors p-2 hover:bg-black/20 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Event Info */}
        <div className="bg-black/40 border-b border-accent/20 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <p className="text-gray-400">Event Date</p>
              <p className="text-white font-semibold">TBA</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-gray-400">Price</p>
              <p className="text-accent font-bold text-2xl">$5.00</p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
              <p className="text-gray-400">Initializing payment...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-destructive mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-white text-sm">{error}</p>
              </div>
              <button
                onClick={createPaymentIntent}
                className="mt-3 text-sm text-accent hover:text-accent/80 underline"
              >
                Try again
              </button>
            </div>
          )}

          {clientSecret && !isLoading && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <CheckoutForm onSuccess={onClose} />
            </Elements>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/40 border-t border-accent/20 p-4">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure Payment
            </span>
            <span>•</span>
            <span>Powered by Stripe</span>
            <span>•</span>
            <span>SSL Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
