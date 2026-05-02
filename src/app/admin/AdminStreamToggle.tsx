'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  if (isStreaming) {
    return (
      <Button onClick={toggle} disabled={loading} variant="destructive">
        <Square className="fill-current" />
        {loading ? 'Updating…' : 'End Stream'}
      </Button>
    );
  }

  return (
    <Button onClick={toggle} disabled={loading}>
      <Radio />
      {loading ? 'Updating…' : 'Go Live'}
    </Button>
  );
}
