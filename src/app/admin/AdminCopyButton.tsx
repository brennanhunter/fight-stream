'use client';

import { useState } from 'react';

export default function AdminCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select a hidden input
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 border transition-all duration-150 ${
        copied
          ? 'border-green-600/60 text-green-400'
          : 'border-white/20 text-gray-400 hover:border-white hover:text-white'
      }`}
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
