'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RecoverAccessPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetch('/api/recover-access/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Always advance — don't reveal whether email exists
      setStep('code');
      startResendCooldown();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/recover-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: fullCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
        return;
      }

      router.push('/');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setCode(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await fetch('/api/recover-access/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      startResendCooldown();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
            {step === 'email' ? 'Recover Access' : 'Enter Your Code'}
          </h1>
          <div className="w-12 h-[2px] bg-white mx-auto mt-4" />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1.5">
                Email used at checkout
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase border border-white text-white hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <p className="text-sm text-gray-400 text-center">
              We sent a 6-digit code to{' '}
              <span className="text-white">{email}</span>.
              It expires in 15 minutes.
            </p>

            {/* 6-digit code input */}
            <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="w-11 h-14 bg-white/5 border border-white/10 text-white text-xl font-bold text-center focus:outline-none focus:border-white/40 transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.join('').length < 6}
              className="w-full py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase border border-white text-white hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Restore Access'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-600">
          <Link href="/" className="hover:text-white transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
