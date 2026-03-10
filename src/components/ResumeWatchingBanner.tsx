'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PurchasedProduct {
  sessionId: string;
  name: string;
  image: string | null;
}

function getEmailFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)customer_email=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ResumeWatchingBanner() {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);

  useEffect(() => {
    const email = getEmailFromCookie();
    const url = email
      ? `/api/check-purchase?email=${encodeURIComponent(email)}`
      : '/api/check-purchase';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.products?.length) setProducts(data.products);
      })
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-1">Continue</p>
      <h2 className="text-xl font-bold text-white tracking-tight">Your Purchases</h2>
      <div className="w-12 h-px bg-white/20 mb-2" />

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <div
            key={product.sessionId}
            className="border border-white/10 p-4 flex items-center gap-4 hover:border-white/30 transition-colors"
          >
            {product.image && (
              <div className="relative w-24 h-14 flex-shrink-0 overflow-hidden border border-white/10">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{product.name}</p>
            </div>

            <Link
              href={`/watch?session_id=${product.sessionId}`}
              className="flex-shrink-0 px-5 py-2 bg-white text-black text-xs font-bold tracking-[0.1em] uppercase
                hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              ▶ Resume
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
