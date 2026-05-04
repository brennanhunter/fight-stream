'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ActivatePage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/tv/pair/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setErrorMessage(
            'Sign in or recover access first so we know which account to pair.',
          );
        } else {
          setErrorMessage(data.error || 'Could not pair that TV.');
        }
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMessage('Network error. Try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
            BoxStreamTV
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {status === 'success' ? 'TV Paired' : 'Activate Your TV'}
          </h1>
          <div className="w-12 h-[2px] bg-white mx-auto mt-4" />
          {status !== 'success' && (
            <p className="mt-4 text-sm text-gray-400">
              Enter the 6-character code shown on your TV.
            </p>
          )}
        </div>

        {status === 'success' ? (
          <div className="space-y-6 text-center">
            <div className="border border-white/15 bg-white/[0.03] p-6">
              <p className="text-sm text-gray-300 leading-relaxed">
                Your TV is paired and signed in. Head back to your TV — it should be
                ready to play within a few seconds.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block text-sm text-gray-400 hover:text-white underline underline-offset-2"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <label
                htmlFor="code"
                className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1.5"
              >
                Pairing Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABC-DEF"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                maxLength={8}
                disabled={status === 'submitting'}
                className="w-full bg-black border border-white/20 text-white text-center text-2xl tracking-[0.4em] font-mono uppercase py-4 px-3 focus:outline-none focus:border-white/60 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'submitting' || code.trim().length < 6}
              className="w-full bg-white text-black font-bold py-3 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Pairing…' : 'Pair TV'}
            </button>

            <p className="text-[11px] text-gray-500 text-center mt-6 leading-relaxed">
              The code expires after 10 minutes. If yours has, restart pairing on your
              TV to generate a new one.
            </p>
            <p className="text-[11px] text-gray-500 text-center">
              Need to sign in first?{' '}
              <Link
                href="/login"
                className="text-gray-300 hover:text-white underline underline-offset-2"
              >
                Log in
              </Link>{' '}
              or{' '}
              <Link
                href="/recover-access"
                className="text-gray-300 hover:text-white underline underline-offset-2"
              >
                recover access
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
