'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminStreamToggle({ isStreaming }: { isStreaming: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    await fetch('/api/admin/toggle-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live: !isStreaming }),
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-6 py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isStreaming
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {loading ? 'Updating…' : isStreaming ? 'End Stream' : 'Go Live'}
    </button>
  );
}
