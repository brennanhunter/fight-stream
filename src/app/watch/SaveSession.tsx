'use client';

import { useEffect } from 'react';

export default function SaveSession({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    let retried = false;

    function save() {
      fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch((err) => {
        console.error('SaveSession failed:', err);
        if (!retried) {
          retried = true;
          setTimeout(save, 3000);
        }
      });
    }

    save();
  }, [sessionId]);

  return null;
}
