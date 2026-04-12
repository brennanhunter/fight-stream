'use client';

import { useState } from 'react';

export default function AdminFeedbackApprove({
  id,
  approved,
}: {
  id: string;
  approved: boolean;
}) {
  const [current, setCurrent] = useState(approved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_for_testimonial: !current }),
      });
      if (res.ok) setCurrent((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 border transition-colors disabled:opacity-50 ${
        current
          ? 'border-amber-500/50 text-amber-400 hover:border-amber-500/80'
          : 'border-white/10 text-gray-600 hover:border-white/30 hover:text-gray-400'
      }`}
    >
      {current ? '★ Approved' : 'Approve'}
    </button>
  );
}
