'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PurchasedProduct {
  sessionId: string;
  name: string;
  image: string | null;
}

export default function ResumeWatchingBanner() {
  const [products, setProducts] = useState<PurchasedProduct[]>([]);

  useEffect(() => {
    fetch('/api/check-purchase')
      .then((res) => res.json())
      .then((data) => {
        if (data.products?.length) setProducts(data.products);
      })
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Your Purchases</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <div
            key={product.sessionId}
            className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 border border-accent/30 rounded-xl p-4 flex items-center gap-4"
          >
            {product.image && (
              <div className="relative w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-accent/20">
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
              className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-primary via-red-600 to-primary text-white text-sm font-bold rounded-lg
                hover:from-red-700 hover:via-red-500 hover:to-red-700
                transition-all duration-300 transform hover:scale-105
                shadow-lg shadow-primary/30 whitespace-nowrap"
            >
              ▶ Resume
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
