'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorType, setErrorType] = useState<'incomplete' | 'system' | 'no_session'>('system');
  const [eventInfo, setEventInfo] = useState<{ eventName: string; expiresAt: string } | null>(null);
  const [countdown, setCountdown] = useState(8);
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  const sessionId = searchParams.get('session_id');

  const verifyPayment = useCallback(async () => {
    if (!sessionId) {
      setErrorType('no_session');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorType(data.error === 'payment_incomplete' ? 'incomplete' : 'system');
        setStatus('error');
        return;
      }

      setEventInfo(data.eventAccess ? { eventName: data.eventAccess.eventName, expiresAt: data.eventAccess.expiresAt } : null);
      setStatus('success');
      setCountdown(8);

      // Redirect to home page after 8 seconds
      redirectTimer.current = setTimeout(() => {
        router.push('/');
      }, 8000);

      // Tick countdown every second
      let remaining = 8;
      countdownTimer.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) clearInterval(countdownTimer.current!);
      }, 1000);
    } catch {
      setErrorType('system');
      setStatus('error');
    }
  }, [sessionId, router]);

  useEffect(() => {
    verifyPayment();

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [verifyPayment]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Verifying Payment...</h2>
        <p className="text-gray-500">Please wait while we confirm your purchase</p>
      </div>
    );
  }

  if (status === 'error') {
    const isIncomplete = errorType === 'incomplete';
    const heading = isIncomplete ? 'Payment Not Completed' : 'Something Went Wrong';
    const body = isIncomplete
      ? "Your payment didn't go through and you have not been charged. Please try purchasing again."
      : "We couldn't confirm your purchase. If your card was charged, your access will be activated shortly — check your account or contact us and we'll sort it out right away.";

    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="border border-white/10 p-8">
          <div className="w-16 h-16 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{heading}</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">{body}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isIncomplete ? (
              <Link
                href="/"
                className="inline-block bg-white text-black font-bold py-3 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 text-center"
              >
                Back to Home
              </Link>
            ) : (
              <button
                onClick={verifyPayment}
                className="inline-block bg-white text-black font-bold py-3 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
              >
                Try Again
              </button>
            )}
            <Link
              href="/contact"
              className="inline-block border border-white/20 text-white font-bold py-3 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:border-white text-center"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="border border-white/10 p-8 sm:p-12">
        {/* Success Icon */}
        <div className="w-20 h-20 border border-white/20 flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
          Payment Successful
        </h1>
        <div className="w-16 h-[2px] bg-white mx-auto mb-6" />
        <p className="text-lg text-gray-400 mb-8">
          {eventInfo
            ? <>You now have access to <span className="text-white font-semibold">{eventInfo.eventName}</span></>
            : 'Your purchase has been confirmed.'}
        </p>

        {/* Event Details */}
        {eventInfo && (
          <div className="border border-white/10 p-6 mb-8 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Event</p>
                <p className="text-white font-semibold">{eventInfo.eventName}</p>
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Access Until</p>
                <p className="text-white font-semibold">{new Date(eventInfo.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="border border-white/10 p-4 mb-8 text-sm text-gray-400 space-y-2">
          <p>Your purchase has been confirmed</p>
          <p>You can now watch the live stream when it starts</p>
          <p>Access is valid until the day after the event</p>
        </div>

        {/* Redirect Message */}
        <p className="text-gray-500 text-sm mb-6 tracking-wide">
          Redirecting you to the home page in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>

        {/* CTA Button */}
        <Link
          href="/"
          className="inline-block bg-white text-black font-bold py-4 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
        >
          Go to Home
        </Link>

        <p className="mt-8 text-xs text-gray-600">
          Questions about your purchase?{' '}
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
          >
            hunter@boxstreamtv.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen bg-black py-12 px-4"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent"></div>
        </div>
      }>
        <PaymentSuccessContent />
      </Suspense>
    </motion.div>
  );
}
