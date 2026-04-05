'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Image
          src="/logos/BoxStreamVerticalLogo.png"
          alt="BoxStreamTV"
          width={160}
          height={64}
          className="mx-auto mb-12"
        />

        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
          500
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Something Went Wrong</h1>
        <div className="w-12 h-[2px] bg-white mx-auto mb-6" />
        <p className="text-sm text-gray-400 leading-relaxed mb-10">
          We hit an unexpected error. Try refreshing the page — if the problem persists,
          email us and we&apos;ll get it sorted quickly.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-3 border border-white/20 text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white transition-colors"
          >
            Go Home
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-600">
          Need help?{' '}
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="text-gray-500 hover:text-white transition-colors underline underline-offset-2"
          >
            hunter@boxstreamtv.com
          </a>
        </p>
      </div>
    </main>
  );
}
