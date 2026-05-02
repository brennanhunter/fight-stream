'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOverlay } from '@/lib/use-overlay';

type RoundTimerPayload = {
  match_id?: string;
  match_label?: string;
  current_round?: number;
  total_rounds?: number;
  round_seconds?: number;
  rest_seconds?: number;
  state?: 'fighting' | 'paused' | 'ended';
  state_started_at?: string;
  paused_remaining_seconds?: number;
};

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RoundTimerDisplay() {
  const { visible, payload, loading } = useOverlay<RoundTimerPayload>('round_timer');
  const ready = !loading;

  const [now, setNow] = useState(() => Date.now());

  // Local 100ms tick so the display updates smoothly even though the server
  // only writes on state changes. ~10 renders/sec — cheap, smooth.
  useEffect(() => {
    if (!visible || payload.state === 'ended' || payload.state === 'paused') return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [visible, payload.state, payload.state_started_at]);

  const show = ready && visible && !!payload.match_id && !!payload.state_started_at;

  // Compute remaining seconds based on current state
  let remaining = 0;
  const total = payload.round_seconds ?? 180;
  if (show) {
    if (payload.state === 'paused') {
      remaining = payload.paused_remaining_seconds ?? 0;
    } else if (payload.state === 'fighting') {
      const elapsed = (now - new Date(payload.state_started_at!).getTime()) / 1000;
      remaining = total - elapsed;
    } else if (payload.state === 'ended') {
      remaining = 0;
    }
  }

  const isPaused = payload.state === 'paused';
  const isEnded = payload.state === 'ended';
  const display = formatTime(remaining);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key="round-timer"
            initial={{ y: '-110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-110%', opacity: 0, transition: { duration: 0.24, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, mass: 1 }}
            style={{
              position: 'absolute',
              top: '4vh',
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: '320px',
              padding: '18px 36px',
              background: 'rgba(4, 4, 4, 0.96)',
              border: `1px solid ${isPaused ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.85)'}`,
              boxShadow: isPaused
                ? '0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(220,38,38,0.35), inset 0 0 1px rgba(255,255,255,0.4)'
                : '0 12px 40px rgba(0,0,0,0.85), 0 0 40px rgba(255,255,255,0.05), inset 0 0 1px rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              textAlign: 'center',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            {payload.match_label && (
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  marginBottom: '6px',
                }}
              >
                {payload.match_label}
              </div>
            )}

            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.65)',
                marginBottom: '4px',
              }}
            >
              Round {payload.current_round ?? 1}
              <span style={{ color: 'rgba(255,255,255,0.3)' }}> / {payload.total_rounds ?? 1}</span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: '64px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                letterSpacing: '0.04em',
                color: isPaused ? '#dc2626' : isEnded ? 'rgba(255,255,255,0.65)' : '#ffffff',
                transition: 'color 0.3s',
              }}
            >
              {display}
            </div>

            {(isPaused || isEnded) && (
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: isPaused ? '#dc2626' : 'rgba(255,255,255,0.5)',
                  marginTop: '6px',
                }}
              >
                {isPaused ? '// PAUSED //' : '// ENDED //'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
