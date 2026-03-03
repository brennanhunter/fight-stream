'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ResumeWatchingBanner() {
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    fetch('/api/check-purchase')
      .then((res) => res.json())
      .then((data) => setPurchased(data.purchased))
      .catch(() => {});
  }, []);

  if (!purchased) return null;

  return (
    <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 border border-accent/30 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-center sm:text-left">
        <p className="text-white font-bold text-lg">You have a purchased replay!</p>
        <p className="text-gray-400 text-sm">Pick up where you left off.</p>
      </div>
      <Link
        href="/watch"
        className="px-6 py-3 bg-gradient-to-r from-primary via-red-600 to-primary text-white font-bold rounded-lg 
          hover:from-red-700 hover:via-red-500 hover:to-red-700
          transition-all duration-300 transform hover:scale-105 
          shadow-lg shadow-primary/30 whitespace-nowrap"
      >
        ▶ Resume Watching
      </Link>
    </div>
  );
}
