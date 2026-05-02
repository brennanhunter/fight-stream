'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useScramble } from 'use-scramble';
import { useOverlay } from '@/lib/use-overlay';

/**
 * Payload written by /control when the lower third is shown. Snapshot of the
 * fighter at show time — see OVERLAY.md "Snapshot at show time, don't reference
 * live fighter rows".
 */
type LowerThirdPayload = {
  match_id?: string;
  fighter_id?: string;
  display_name?: string;
  record?: string;
  weight_class?: string;
};

const ASCII_CHARS = '!@#$%&*+-=|;:.<>?/~▓▒░█■□●◆◇※✦⌬╳╲╱┃═╬╪╫';
const ASCII_COLS = 7;
const ASCII_ROWS = 14;

function randomAsciiBlock(): string {
  let out = '';
  for (let r = 0; r < ASCII_ROWS; r++) {
    for (let c = 0; c < ASCII_COLS; c++) {
      out += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
    }
    if (r < ASCII_ROWS - 1) out += '\n';
  }
  return out;
}

export default function LowerThirdDisplay() {
  const { visible, payload, loading } = useOverlay<LowerThirdPayload>('lower_third');
  const ready = !loading;
  const fighter_name = payload.display_name ?? '';
  const record = payload.record ?? '';
  const weight_class = payload.weight_class ?? '';

  const [displayVisible, setDisplayVisible] = useState(false);
  const [scrambleName, setScrambleName] = useState('');
  const [scrambleStats, setScrambleStats] = useState('');
  const [asciiLeft, setAsciiLeft] = useState('');
  const [asciiRight, setAsciiRight] = useState('');

  const { ref: nameRef } = useScramble({
    text: scrambleName,
    speed: 0.5,
    tick: 1,
    step: 2,
    scramble: 18,
    seed: 6,
    chance: 1,
    range: [65, 90],
    overdrive: false,
  });

  const { ref: statsRef } = useScramble({
    text: scrambleStats,
    speed: 0.55,
    tick: 1,
    step: 1,
    scramble: 12,
    seed: 4,
    chance: 0.85,
    range: [48, 90],
    overdrive: false,
  });

  useEffect(() => {
    if (!ready) return;
    if (visible) {
      setDisplayVisible(true);
      const t1 = setTimeout(() => setScrambleName(fighter_name), 380);
      const subline = [record, weight_class].filter(Boolean).join('   //   ');
      const t2 = setTimeout(() => setScrambleStats(subline), 680);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setDisplayVisible(false);
      setScrambleName('');
      setScrambleStats('');
    }
  }, [visible, fighter_name, record, weight_class, ready]);

  useEffect(() => {
    if (!displayVisible) {
      setAsciiLeft('');
      setAsciiRight('');
      return;
    }
    const tick = () => {
      setAsciiLeft(randomAsciiBlock());
      setAsciiRight(randomAsciiBlock());
    };
    tick();
    const id = setInterval(tick, 110);
    return () => clearInterval(id);
  }, [displayVisible]);

  // Realtime subscription + heartbeat poll handled by useOverlay() at the top
  // of this component. No separate Supabase wiring here anymore.

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'transparent', overflow: 'hidden' }}>
      <AnimatePresence>
        {ready && displayVisible && (
          <motion.div
            key="lower-third"
            initial={{ y: '108%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '108%', opacity: 0, transition: { duration: 0.24, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 220, damping: 30, mass: 1.1 }}
            style={{
              position: 'absolute',
              left: '4vw',
              right: '4vw',
              bottom: '5vh',
              height: '42vh',
              background: 'rgba(4, 4, 4, 0.96)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 30px 80px rgba(0,0,0,0.95), 0 0 80px rgba(255,255,255,0.06), inset 0 0 1px rgba(255,255,255,0.5)',
              display: 'grid',
              gridTemplateColumns: '110px 1fr 110px',
              gridTemplateRows: '52px 1fr 44px',
              overflow: 'hidden',
            }}
          >
            {/* ── Top header strip */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.32, ease: 'easeOut' }}
              style={{
                gridColumn: '1 / 4',
                gridRow: '1',
                borderBottom: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '0 22px',
              }}
            >
              <Image
                src="/logos/BoxStreamThumbnail.png"
                alt="BoxStreamTV"
                width={36}
                height={36}
                priority
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }}
              />
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  color: 'rgba(255,255,255,0.78)',
                  textTransform: 'uppercase',
                }}
              >
                {'// FIGHTER_PROFILE.DAT'}
              </div>
              <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(to right, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)' }} />
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  color: '#ef4444',
                  textShadow: '0 0 10px rgba(239,68,68,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 12px #ef4444' }}
                />
                BROADCASTING
              </div>
            </motion.div>

            {/* ── Left ASCII column */}
            <motion.pre
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              style={{
                gridColumn: '1',
                gridRow: '2',
                margin: 0,
                padding: '14px 0',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 16,
                lineHeight: 1.25,
                color: 'rgba(255,255,255,0.32)',
                textAlign: 'center',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                whiteSpace: 'pre',
                userSelect: 'none',
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,255,0.025) 50%, transparent)',
              }}
            >
              {asciiLeft}
            </motion.pre>

            {/* ── Center content */}
            <div
              style={{
                gridColumn: '2',
                gridRow: '2',
                position: 'relative',
                padding: '14px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 10,
                overflow: 'hidden',
              }}
            >
              {/* ASCII top frame */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.26, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.42)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transformOrigin: 'left',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <span>{'┌─[ ID:0001 ]─[ ENTRY:LIVE ]─'}</span>
                <span style={{ flex: 1, borderTop: '1px dashed currentColor', height: 0 }} />
                <span>{'─┐'}</span>
              </motion.div>

              {/* Fighter name — scrambled. Font shrinks with longer names. */}
              <div style={{ position: 'relative' }}>
                <div
                  ref={nameRef}
                  style={{
                    fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
                    fontSize: `clamp(56px, min(11vw, calc((92vw - 336px) / ${Math.max(fighter_name.length, 6) * 0.6})), 150px)`,
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 0.95,
                    whiteSpace: 'nowrap',
                    minHeight: '1em',
                    overflow: 'hidden',
                    animation: visible ? 'glowPulse 3s ease-in-out 1s 2' : undefined,
                  }}
                />
                {/* Sweep */}
                {visible && (
                  <motion.div
                    initial={{ x: '-120%' }}
                    animate={{ x: '420%' }}
                    transition={{ delay: 0.7, duration: 0.9, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: '22%',
                      background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.28), transparent)',
                      transform: 'skewX(-14deg)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Stats — scrambled, monospace */}
              <div
                ref={statsRef}
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 'clamp(20px, 2.2vw, 36px)',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.82)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  minHeight: '1em',
                  textShadow: '0 0 18px rgba(255,255,255,0.25)',
                }}
              />

              {/* ASCII bottom frame */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.42)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transformOrigin: 'right',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <span>{'└─'}</span>
                <span style={{ flex: 1, borderTop: '1px dashed currentColor', height: 0 }} />
                <span>{'─[ STATUS:ACTIVE ]─[ SIG:OK ]─┘'}</span>
              </motion.div>

              {/* Vertical scan line */}
              <motion.div
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: '120%', opacity: [0, 0.45, 0] }}
                transition={{ delay: 0.5, duration: 1.6, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85), transparent)',
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* ── Right ASCII column */}
            <motion.pre
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              style={{
                gridColumn: '3',
                gridRow: '2',
                margin: 0,
                padding: '14px 0',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 16,
                lineHeight: 1.25,
                color: 'rgba(255,255,255,0.32)',
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                whiteSpace: 'pre',
                userSelect: 'none',
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,255,0.025) 50%, transparent)',
              }}
            >
              {asciiRight}
            </motion.pre>

            {/* ── Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42, duration: 0.4 }}
              style={{
                gridColumn: '1 / 4',
                gridRow: '3',
                borderTop: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 22px',
                gap: 22,
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 13,
                letterSpacing: '0.26em',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span>[ BOXSTREAM.TV ]</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>{'///'}</span>
              <span>BROADCAST_FEED</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>{'///'}</span>
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.3)' }}>
                ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░
              </span>
              <span>SIGNAL OK</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
