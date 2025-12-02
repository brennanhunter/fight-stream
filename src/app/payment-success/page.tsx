'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    
    if (!paymentIntent) {
      setStatus('error');
      setErrorMessage('No payment information found');
      return;
    }

    const verifyPayment = async (paymentIntentId: string) => {
      try {
        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Payment verification failed');
        }

        setStatus('success');
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
      }
    };

    // Verify payment and create session
    verifyPayment(paymentIntent);
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h2>
        <p className="text-gray-400">Please wait while we confirm your purchase</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-destructive/10 border-2 border-destructive rounded-2xl p-8">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Verification Failed</h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          <Link 
            href="/"
            className="inline-block bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-accent rounded-2xl p-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-white mb-4">
          Payment Successful! 🥊
        </h1>
        <p className="text-xl text-gray-300 mb-6">
          You now have access to <span className="text-accent font-bold">Havoc at Hilton</span>
        </p>

        {/* Event Details */}
        <div className="bg-black/40 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-gray-400 text-sm">Event</p>
              <p className="text-white font-semibold">Havoc at Hilton</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Date</p>
              <p className="text-white font-semibold">Nov 8, 2025 at 6 PM EST</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Amount Paid</p>
              <p className="text-accent font-bold text-lg">$21.99</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Access Until</p>
              <p className="text-white font-semibold">Nov 9, 2025</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-black/40 rounded-xl p-4 mb-6">
          <p className="text-white text-sm">
            ✅ A confirmation email has been sent to your inbox
            <br />
            ✅ You can now watch the live stream when it starts
            <br />
            ✅ Access is valid until the day after the event
          </p>
        </div>

        {/* Redirect Message */}
        <p className="text-gray-400 text-sm mb-6">
          Redirecting you to the stream in 3 seconds...
        </p>

        {/* CTA Button */}
        <Link 
          href="/"
          className="inline-block bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Go to Stream Now
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-secondary py-12 px-4">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent"></div>
        </div>
      }>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
