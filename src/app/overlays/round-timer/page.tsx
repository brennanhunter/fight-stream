'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOverlay } from '@/lib/use-overlay';
import { formatNationality } from '@/lib/countries';

type RoundTimerPayload = {
  match_id?: string;
  match_label?: string;
  left_name?: string;
  left_record?: string;
  left_nationality?: string;
  right_name?: string;
  right_record?: string;
  right_nationality?: string;
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
              height: '106px',
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
              flexDirection: 'column',
            }}
          >
            {/* Match label band — top */}
            {payload.match_label && (
              <div
                style={{
                  flexShrink: 0,
                  height: '26px',
                  background: 'rgba(255,255,255,0.05)',
                  borderBottom: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap',
                }}
              >
                {`// ${payload.match_label} //`}
              </div>
            )}

            {/* Body — timer left, name plates right */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'stretch',
                minHeight: 0,
              }}
            >
              {/* Timer column — left */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px 18px',
                  minWidth: '170px',
                  borderRight: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '14px',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Round{' '}
                  <span style={{ color: '#ffffff' }}>{payload.current_round ?? 1}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>
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
              <NamePlate
                name={leftName}
                record={payload.left_record ?? ''}
                nationality={payload.left_nationality ?? ''}
                corner="blue"
              />
              <NamePlate
                name={rightName}
                record={payload.right_record ?? ''}
                nationality={payload.right_nationality ?? ''}
                corner="red"
              />
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Name plate per spec: mostly white/black background with the corner color
 * occupying the right ~25% as a solid tab. Inline content: flag · name · record.
 *  - Blue corner (top): white plate with black text + blue tab on right.
 *  - Red corner (bottom): black plate with white text + red tab on right.
 */
function NamePlate({
  name,
  record,
  nationality,
  corner,
}: {
  name: string;
  record: string;
  nationality: string;
  corner: 'blue' | 'red';
}) {
  const isBlue = corner === 'blue';
  const accentColor = isBlue ? '#2563eb' : '#dc2626';
  const accentSoft = isBlue ? 'rgba(37,99,235,0.45)' : 'rgba(220,38,38,0.45)';
  const { flag } = formatNationality(nationality);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 14px',
        height: '30px',
        // White for the first ~65% of the plate, then a long smooth fade into
        // the corner color — bigger color presence on the right.
        background: `linear-gradient(to right, #ffffff 0%, #ffffff 65%, ${accentColor} 100%)`,
        border: `1px solid ${accentSoft}`,
        boxShadow: `0 0 10px ${accentSoft}`,
        overflow: 'hidden',
      }}
    >
      {flag && (
        <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>{flag}</span>
      )}
      <span
        style={{
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color: '#0a0a0a',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {name || '—'}
      </span>
      {record && (
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '14px',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: '#0a0a0a',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          {record}
        </span>
      )}
    </div>
  );
}
