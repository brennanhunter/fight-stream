'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorType, setErrorType] = useState<'incomplete' | 'system' | 'no_session'>('system');
  const [eventInfo, setEventInfo] = useState<{ eventId: string; eventName: string; expiresAt: string; isStreaming: boolean } | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [isGuest, setIsGuest] = useState(false);
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  const sessionId = searchParams.get('session_id');

  // Detect whether the buyer has an account. Drives the "check your email"
  // callout — guests need it most.
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setIsGuest(!data.user))
      .catch(() => setIsGuest(true));
  }, []);

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

      setEventInfo(data.eventAccess ? { eventId: data.eventAccess.eventId, eventName: data.eventAccess.eventName, expiresAt: data.eventAccess.expiresAt, isStreaming: data.eventAccess.isStreaming ?? false } : null);
      setStatus('success');
      setCountdown(8);

      // Redirect to watch page only if actively streaming, otherwise home
      const redirectUrl = data.eventAccess?.isStreaming ? `/watch?event_id=${data.eventAccess.eventId}` : '/';
      redirectTimer.current = setTimeout(() => {
        router.push(redirectUrl);
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
      <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-20">
        <div aria-hidden="true" className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-6"></div>
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
          {eventInfo?.isStreaming ? (
            <p>The event is live now — head to the watch page to start watching</p>
          ) : eventInfo ? (
            <p>You&apos;ll be able to watch the live stream and replay when the event starts</p>
          ) : (
            <p>You can start watching now from your library</p>
          )}
        </div>

        {/* Guest-only: tell them to check email — important because they
            have no account session to fall back on. */}
        {isGuest && (
          <div className="border border-white/15 bg-white/[0.03] p-4 mb-8 text-left">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white mb-1">
              📧 Check your email
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              We just sent your purchase confirmation. Save it — you can use the same email
              to restore access on any device anytime via{' '}
              <Link href="/recover-access" className="text-gray-200 underline underline-offset-2">
                recover access
              </Link>
              .
            </p>
          </div>
        )}

        {/* Redirect Message */}
        <p aria-live="polite" aria-atomic="true" className="text-gray-500 text-sm mb-6 tracking-wide">
          Redirecting you {eventInfo?.isStreaming ? 'to the watch page' : 'home'} in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {eventInfo?.isStreaming ? (
            <>
              <Link
                href={`/watch?event_id=${eventInfo.eventId}`}
                className="inline-block bg-white text-black font-bold py-4 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 text-center"
              >
                Watch Now
              </Link>
              <Link
                href="/"
                className="inline-block border border-white/20 text-white font-bold py-4 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:border-white text-center"
              >
                Go to Home
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="inline-block bg-white text-black font-bold py-4 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 text-center"
            >
              Go to Home
            </Link>
          )}
        </div>

        <p className="mt-8 text-xs text-gray-600">
          Questions about your purchase?{' '}
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
          >
            hunter@boxstreamtv.com
          </a>
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span>Stay updated on future events —</span>
          <a
            href="https://www.instagram.com/boxstreamtv/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
            </svg>
            follow @boxstreamtv on Instagram
          </a>
        </div>
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
