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
              width: '600px',
              height: '90px',
              background: 'rgba(4, 4, 4, 0.96)',
              border: `1px solid ${isPaused ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.85)'}`,
              boxShadow: isPaused
                ? '0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(220,38,38,0.35), inset 0 0 1px rgba(255,255,255,0.4)'
                : '0 12px 40px rgba(0,0,0,0.85), 0 0 40px rgba(255,255,255,0.05), inset 0 0 1px rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              overflow: 'hidden',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              display: 'flex',
              alignItems: 'stretch',
            }}
          >
            {/* Timer column — left */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '8px 18px',
                minWidth: '160px',
                borderRight: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {payload.match_label ? (
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {payload.match_label}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Round{' '}
                <span style={{ color: '#ffffff' }}>{payload.current_round ?? 1}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {' / '}
                  {payload.total_rounds ?? 1}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '36px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                  color: isPaused ? '#dc2626' : isEnded ? 'rgba(255,255,255,0.65)' : '#ffffff',
                  transition: 'color 0.3s',
                  textShadow: isPaused
                    ? '0 0 14px rgba(220,38,38,0.5)'
                    : isEnded
                      ? 'none'
                      : '0 0 10px rgba(255,255,255,0.12)',
                  marginTop: '2px',
                }}
              >
                {display}
              </div>
              {(isPaused || isEnded) && (
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: isPaused ? '#dc2626' : 'rgba(255,255,255,0.5)',
                    lineHeight: 1,
                    marginTop: '2px',
                  }}
                >
                  {isPaused ? '// PAUSED //' : '// ENDED //'}
                </div>
              )}
            </div>

            {/* Name plates column — right, stacked */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                minWidth: 0,
              }}
            >
              <NamePlate name={leftName} corner="blue" />
              <NamePlate name={rightName} corner="red" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Name plate per spec: mostly white/black background with the corner color
 * occupying the right ~25% as a solid tab.
 *  - Blue corner (top): white plate with black text + blue tab on right.
 *  - Red corner (bottom): black plate with white text + red tab on right.
 */
function NamePlate({ name, corner }: { name: string; corner: 'blue' | 'red' }) {
  const isBlue = corner === 'blue';
  const baseColor = isBlue ? '#f5f5f5' : '#0a0a0a';
  const textColor = isBlue ? '#0a0a0a' : '#ffffff';
  const accentColor = isBlue ? '#2563eb' : '#dc2626';
  const accentSoft = isBlue ? 'rgba(37,99,235,0.45)' : 'rgba(220,38,38,0.45)';

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 28%',
        alignItems: 'stretch',
        height: '30px',
        border: `1px solid ${accentSoft}`,
        boxShadow: `0 0 10px ${accentSoft}`,
        overflow: 'hidden',
      }}
    >
      {/* Name area — mostly white or black */}
      <div
        style={{
          background: baseColor,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name || '—'}
        </span>
      </div>

      {/* Color tab on the right */}
      <div
        style={{
          background: accentColor,
          boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.35), inset 0 0 14px rgba(0,0,0,0.18)',
        }}
      />
    </div>
  );
}
