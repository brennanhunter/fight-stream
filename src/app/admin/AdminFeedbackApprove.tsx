'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <Button
      onClick={toggle}
      disabled={loading}
      variant={current ? 'default' : 'outline'}
      size="xs"
      className={current ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : undefined}
    >
      <Star className={current ? 'fill-current' : ''} />
      {current ? 'Approved' : 'Approve'}
    </Button>
  );
}
