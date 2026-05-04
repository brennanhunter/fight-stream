'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const STORAGE_KEY = 'bstv_tv_auth_token';
const POLL_INTERVAL_MS = 4000;

type Pairing = {
  pairing_id: string;
  code: string;
  device_token: string;
  expires_at: string;
};

/**
 * Pairing screen — shown when the viewer chooses "Get Started" from the
 * intro. Two paths visible at once: scan the QR (preferred) or manually
 * type the code at boxstreamtv.com/activate.
 *
 * Polls /api/tv/pair/status in the background; once the user redeems on
 * their phone the TV detects it and navigates back to /tv (which will now
 * show the personalized library + catalog).
 */
export default function TvPairPage() {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  const startPairing = useCallback(async () => {
    setError(null);
    setPairing(null);
    try {
      const res = await fetch('/api/tv/pair/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_kind: 'web-preview',
          device_label:
            typeof navigator !== 'undefined'
              ? navigator.userAgent.slice(0, 80)
              : 'web',
        }),
      });
      if (!res.ok) {
        setError('Could not start pairing. Try again.');
        return;
      }
      const data: Pairing = await res.json();
      setPairing(data);
    } catch {
      setError('Network error. Try again.');
    }
  }, []);

  // Already paired? Skip straight to the home screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) {
      router.replace('/tv');
      return;
    }
    startPairing();
  }, [router, startPairing]);

  // Poll status while pairing is pending.
  useEffect(() => {
    if (!pairing) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/tv/pair/status', {
          headers: { Authorization: `Bearer ${pairing!.device_token}` },
        });
        if (cancelled) return;
        const data = await res.json();
        if (data.status === 'redeemed' && data.auth_token) {
          localStorage.setItem(STORAGE_KEY, data.auth_token);
          router.replace('/tv');
          return;
        }
        if (data.status === 'expired') {
          startPairing();
          return;
        }
      } catch {
        // Network blip — keep polling.
      }
      if (!cancelled) {
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [pairing, router, startPairing]);

  const activateUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/activate`
      : 'https://boxstreamtv.com/activate';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(activateUrl)}`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-8 py-12">
      <button
        onClick={() => router.back()}
        className="self-start text-xs tracking-[0.2em] uppercase text-gray-400 hover:text-white"
      >
        ← Back
      </button>

      <div className="mt-8 mb-10">
        <Image
          src="/logos/BoxStreamThumbnail.png"
          alt="BoxStreamTV"
          width={84}
          height={84}
          priority
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 text-center">
        Sign in to BoxStreamTV
      </h1>
      <p className="text-base md:text-lg text-gray-400 mb-12 text-center max-w-2xl">
        Two ways — pick whichever is easier.
      </p>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Path 1: QR */}
        <div className="border border-white/15 bg-white/[0.03] p-8 flex flex-col items-center text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">
            Option 1 — Scan
          </p>
          <div className="bg-white p-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Scan to activate" width={240} height={240} />
          </div>
          <p className="text-sm text-gray-300">
            Point your phone&apos;s camera at this code.
          </p>
        </div>

        {/* Path 2: Manual code */}
        <div className="border border-white/15 bg-white/[0.03] p-8 flex flex-col items-center text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">
            Option 2 — Enter Code
          </p>
          {pairing ? (
            <div className="border-2 border-white/30 bg-black px-8 py-6 mb-4">
              <p className="text-5xl md:text-6xl font-mono font-bold tracking-[0.18em]">
                {pairing.code}
              </p>
            </div>
          ) : (
            <div className="h-[124px] flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/40" />
            </div>
          )}
          <p className="text-sm text-gray-300">
            Visit{' '}
            <span className="text-white font-semibold">boxstreamtv.com/activate</span>{' '}
            on your laptop and enter this code.
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-gray-600 tracking-wider uppercase">
        Waiting for activation…
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-400 text-center max-w-md">{error}</p>
      )}
    </div>
  );
}
