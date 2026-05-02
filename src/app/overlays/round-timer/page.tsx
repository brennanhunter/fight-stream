'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOverlay } from '@/lib/use-overlay';

type RoundTimerPayload = {
  match_id?: string;
  match_label?: string;
  left_name?: string;
  right_name?: string;
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

  // Local tick — only runs when actively fighting. Paused / ended hold their value.
  useEffect(() => {
    if (!visible || payload.state !== 'fighting') return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [visible, payload.state, payload.state_started_at]);

  const show = ready && visible && !!payload.match_id && !!payload.state_started_at;

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

  const leftName = (payload.left_name ?? '').toUpperCase();
  const rightName = (payload.right_name ?? '').toUpperCase();

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
            initial={{ x: '-110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-110%', opacity: 0, transition: { duration: 0.24, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 200, damping: 28, mass: 1 }}
            style={{
              position: 'absolute',
              bottom: '4vh',
              left: '14vw',
              width: '540px',
              background: 'rgba(4, 4, 4, 0.96)',
              border: `1px solid ${isPaused ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.85)'}`,
              boxShadow: isPaused
                ? '0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(220,38,38,0.35), inset 0 0 1px rgba(255,255,255,0.4)'
                : '0 12px 40px rgba(0,0,0,0.85), 0 0 40px rgba(255,255,255,0.05), inset 0 0 1px rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              overflow: 'hidden',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
            {/* Match label */}
            {payload.match_label && (
              <div
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '8px 16px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                }}
              >
                {'// '} {payload.match_label} {' //'}
              </div>
            )}

            {/* Body — name plates left, round/timer right */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '14px',
                padding: '14px',
                alignItems: 'stretch',
              }}
            >
              {/* Stacked name plates */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  minWidth: 0,
                }}
              >
                <NamePlate name={leftName} corner="blue" />
                <NamePlate name={rightName} corner="red" />
              </div>

              {/* Round + Time */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingLeft: '6px',
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                  minWidth: '128px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.6)',
                    textAlign: 'right',
                  }}
                >
                  Round
                  <div
                    style={{
                      fontSize: '20px',
                      letterSpacing: '0.05em',
                      color: '#ffffff',
                      marginTop: '2px',
                    }}
                  >
                    {payload.current_round ?? 1}
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {' / '}
                      {payload.total_rounds ?? 1}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '38px',
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
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.4em',
                      textTransform: 'uppercase',
                      color: isPaused ? '#dc2626' : 'rgba(255,255,255,0.5)',
                      marginTop: '4px',
                    }}
                  >
                    {isPaused ? '// PAUSED //' : '// ENDED //'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NamePlate({ name, corner }: { name: string; corner: 'blue' | 'red' }) {
  // Per spec: red→black gradient (red corner) and blue→white gradient (blue corner).
  // Text aligned left so it always sits in the colored zone — the white/black tail
  // is decorative.
  const gradient =
    corner === 'blue'
      ? 'linear-gradient(to right, #2563eb 0%, #1e3a8a 50%, rgba(255,255,255,0.9) 100%)'
      : 'linear-gradient(to right, #dc2626 0%, #7f1d1d 50%, #000000 100%)';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        padding: '0 14px',
        background: gradient,
        border: `1px solid ${corner === 'blue' ? 'rgba(37,99,235,0.6)' : 'rgba(220,38,38,0.6)'}`,
        boxShadow: `inset 0 0 1px rgba(255,255,255,0.4), 0 0 12px ${corner === 'blue' ? 'rgba(37,99,235,0.3)' : 'rgba(220,38,38,0.3)'}`,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          // Constrain to ~70% of the plate so the colored end is always visible
          maxWidth: '70%',
        }}
      >
        {name || '—'}
      </span>
    </div>
  );
}
