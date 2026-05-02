'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

export type OverlayType =
  | 'lower_third'
  | 'boxer_card'
  | 'tale_of_tape'
  | 'round_timer'
  | 'logo'
  | 'promoter_logo';

export type OverlayState<P = Record<string, unknown>> = {
  visible: boolean;
  payload: P;
  updated_at: string | null;
};

const HEARTBEAT_MS = 2500;

/**
 * Subscribe a browser source to a single overlay's row in `overlay_state`.
 *
 * Realtime drives normal updates (<1s latency). A 2.5s heartbeat poll runs in
 * parallel as a backstop — if Realtime drops a websocket frame (rare but real),
 * the next poll catches up so a stale "visible" state doesn't stay on air.
 *
 * Returns `{ visible, payload, updated_at }`. `loading` is true until the first
 * read completes; render nothing visible until then to avoid a flash.
 */
export function useOverlay<P = Record<string, unknown>>(type: OverlayType) {
  const [state, setState] = useState<OverlayState<P>>({
    visible: false,
    payload: {} as P,
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;

    async function read() {
      const { data, error } = await supabase
        .from('overlay_state')
        .select('visible, payload, updated_at')
        .eq('overlay_type', type)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setState({
        visible: !!data.visible,
        payload: (data.payload ?? {}) as P,
        updated_at: data.updated_at,
      });
      setLoading(false);
    }

    // Initial read
    read();

    // Realtime subscription
    const channel = supabase
      .channel(`overlay_state:${type}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'overlay_state',
          filter: `overlay_type=eq.${type}`,
        },
        (payload) => {
          const row = payload.new as {
            visible: boolean;
            payload: P;
            updated_at: string;
          };
          setState({
            visible: !!row.visible,
            payload: (row.payload ?? {}) as P,
            updated_at: row.updated_at,
          });
        },
      )
      .subscribe();

    // Heartbeat poll fallback — catches missed Realtime events
    const heartbeat = setInterval(read, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [type]);

  return { ...state, loading };
}
