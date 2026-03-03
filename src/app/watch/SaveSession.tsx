'use client';

import { useEffect } from 'react';

export default function SaveSession({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    fetch('/api/save-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }, [sessionId]);

  return null;
}
