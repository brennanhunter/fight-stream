'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { createBrowserClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if this email is a Google OAuth account
    const providerRes = await fetch('/api/auth/check-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const { provider } = await providerRes.json();

    if (provider === 'google') {
      setIsGoogleAccount(true);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
      captchaToken: captchaToken ?? undefined,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    turnstileRef.current?.reset();
  }

  if (isGoogleAccount) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-white tracking-[0.15em] uppercase mb-4">
          Sign In with Google
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          <span className="text-white">{email}</span> is linked to a Google account. You don&apos;t have a password — sign in with Google instead.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-white tracking-[0.15em] uppercase mb-4">
          Check Your Email
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          We sent a password reset link to <span className="text-white">{email}</span>.
        </p>
        <Link
          href="/login"
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white text-center tracking-[0.15em] uppercase mb-2">
        Reset Password
      </h1>
      <p className="text-xs text-gray-500 text-center mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs sm:text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'dark', size: 'flexible' }}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase border border-white text-white hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-white hover:underline">
          Sign In
        </Link>
      </p>
    </>
  );
}
