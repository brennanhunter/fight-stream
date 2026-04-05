'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // global-error replaces the root layout entirely, so we need full HTML
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#000', color: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '400px', width: '100%' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '12px' }}>
              500
            </p>
            <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              Something Went Wrong
            </h1>
            <div style={{ width: '48px', height: '2px', backgroundColor: '#fff', margin: '0 auto 24px' }} />
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '40px' }}>
              A critical error occurred. Try refreshing, or contact us at{' '}
              <a href="mailto:hunter@boxstreamtv.com" style={{ color: '#d1d5db' }}>
                hunter@boxstreamtv.com
              </a>
              .
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{ padding: '12px 32px', backgroundColor: '#fff', color: '#000', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
              >
                Try Again
              </button>
              <Link
                href="/"
                style={{ padding: '12px 32px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none' }}
              >
                Go Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
