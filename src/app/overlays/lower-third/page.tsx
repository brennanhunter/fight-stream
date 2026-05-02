'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScramble } from 'use-scramble';
import { useOverlay } from '@/lib/use-overlay';
import { formatNationality } from '@/lib/countries';

/**
 * Payload written by /control when the lower third is shown. Snapshot of the
 * fighter at show time — see OVERLAY.md "Snapshot at show time, don't reference
 * live fighter rows".
 */
type LowerThirdPayload = {
  match_id?: string;
  fighter_id?: string;
  match_label?: string;
  display_name?: string;
  record?: string;
  weight_class?: string;
  nationality?: string;
  corner?: 'blue' | 'red';
};

const ASCII_CHARS = '!@#$%&*+-=|;:.<>?/~▓▒░█■□●◆◇※✦⌬╳╲╱┃═╬╪╫';
const ASCII_COLS = 5;
const ASCII_ROWS = 8;

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

  const fighterName = (payload.display_name ?? '').toUpperCase();
  const record = payload.record ?? '';
  const weightClass = payload.weight_class ?? '';
  const matchLabel = payload.match_label ?? '';
  const corner: 'blue' | 'red' = payload.corner ?? 'blue';
  const { flag, label: countryLabel } = formatNationality(payload.nationality ?? '');

  const isBlue = corner === 'blue';
  const accentColor = isBlue ? '#2563eb' : '#dc2626';
  const accentSoft = isBlue ? 'rgba(37,99,235,0.55)' : 'rgba(220,38,38,0.55)';
  const accentGlow = isBlue ? 'rgba(37,99,235,0.45)' : 'rgba(220,38,38,0.45)';
  const cornerLabel = isBlue ? 'BLUE CORNER' : 'RED CORNER';

  const [displayVisible, setDisplayVisible] = useState(false);
  const [scrambleName, setScrambleName] = useState('');
  const [scrambleSub, setScrambleSub] = useState('');
  const [asciiBlock, setAsciiBlock] = useState('');

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

  const { ref: subRef } = useScramble({
    text: scrambleSub,
    speed: 0.6,
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
      const t1 = setTimeout(() => setScrambleName(fighterName), 380);
      const subParts = [weightClass, countryLabel, cornerLabel].filter(Boolean);
      const subline = subParts.join('   ///   ');
      const t2 = setTimeout(() => setScrambleSub(subline), 620);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setDisplayVisible(false);
      setScrambleName('');
      setScrambleSub('');
    }
  }, [visible, fighterName, weightClass, countryLabel, cornerLabel, ready]);

  useEffect(() => {
    if (!displayVisible) {
      setAsciiBlock('');
      return;
    }
    const tick = () => setAsciiBlock(randomAsciiBlock());
    tick();
    const id = setInterval(tick, 110);
    return () => clearInterval(id);
  }, [displayVisible]);

  // Tighten the name slightly for very long names so it never truncates.
  const nameFontSize =
    fighterName.length > 18 ? '52px' : fighterName.length > 14 ? '60px' : '70px';

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
        {ready && displayVisible && (
          <motion.div
            key="lower-third"
            initial={{ x: '-110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-110%', opacity: 0, transition: { duration: 0.28, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 1.05 }}
            style={{
              position: 'absolute',
              bottom: '6vh',
              left: '8vw',
              width: '960px',
              background: 'rgba(4, 4, 4, 0.96)',
              border: `1px solid ${accentSoft}`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.92), 0 0 60px ${accentGlow}, inset 0 0 1px rgba(255,255,255,0.5)`,
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ── Top broadcast band */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.32, ease: 'easeOut' }}
              style={{
                flexShrink: 0,
                height: '30px',
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '14px',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.34em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.78)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{'// NOW ENTERING'}</span>
              {matchLabel && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'///'}</span>
                  <span style={{ color: '#ffffff' }}>{matchLabel}</span>
                </>
              )}
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    'repeating-linear-gradient(to right, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)',
                }}
              />
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#ef4444',
                  textShadow: '0 0 10px rgba(239,68,68,0.7)',
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 10px #ef4444',
                  }}
                />
                LIVE
              </span>
            </motion.div>

            {/* ── Name plate — white→accent gradient, HUGE name */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                padding: '0 26px',
                height: '108px',
                background: `linear-gradient(to right, #ffffff 0%, #ffffff 62%, ${accentColor} 100%)`,
                borderBottom: `1px solid ${accentSoft}`,
                overflow: 'hidden',
              }}
            >
              {/* Subtle scan grid in the gradient */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, rgba(0,0,0,0.04) 0 1px, transparent 1px 4px)',
                  mixBlendMode: 'multiply',
                }}
              />

              {flag && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.32, type: 'spring', stiffness: 320, damping: 22 }}
                  style={{ fontSize: '52px', flexShrink: 0, lineHeight: 1, position: 'relative' }}
                >
                  {flag}
                </motion.span>
              )}

              <span
                ref={nameRef}
                style={{
                  fontSize: nameFontSize,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#0a0a0a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  flex: 1,
                  minWidth: 0,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  position: 'relative',
                  textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                }}
              />

              {record && (
                <motion.span
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.42, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '32px',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#0a0a0a',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '0.02em',
                    position: 'relative',
                  }}
                >
                  {record}
                </motion.span>
              )}

              {/* White sweep across the plate */}
              {visible && (
                <motion.div
                  initial={{ x: '-120%' }}
                  animate={{ x: '420%' }}
                  transition={{ delay: 0.7, duration: 0.95, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '22%',
                    background:
                      'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)',
                    transform: 'skewX(-14deg)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Vertical scan line */}
              <motion.div
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: '120%', opacity: [0, 0.45, 0] }}
                transition={{ delay: 0.55, duration: 1.5, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4), transparent)',
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* ── Subline: stats + ASCII block on right */}
            <div
              style={{
                flexShrink: 0,
                height: '46px',
                display: 'flex',
                alignItems: 'stretch',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {/* ASCII corner detail — left. Fixed width so glyph-width
                  variance can't shift the stats line beside it. */}
              <motion.pre
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.46, duration: 0.4 }}
                style={{
                  flexShrink: 0,
                  width: '70px',
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: '4px 10px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 8,
                  lineHeight: 1.05,
                  color: 'rgba(255,255,255,0.28)',
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                  userSelect: 'none',
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {asciiBlock}
              </motion.pre>

              {/* Stats scramble */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 18px',
                  minWidth: 0,
                }}
              >
                <span
                  ref={subRef}
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    color: 'rgba(255,255,255,0.85)',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                    textShadow: '0 0 12px rgba(255,255,255,0.2)',
                  }}
                />
              </div>

              {/* Right-side accent block */}
              <div
                style={{
                  flexShrink: 0,
                  width: '90px',
                  background: `linear-gradient(to right, transparent, ${accentColor})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  padding: '0 14px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.32em',
                  color: '#ffffff',
                  textShadow: `0 0 12px ${accentGlow}`,
                  textTransform: 'uppercase',
                }}
              >
                {isBlue ? '◆ BLUE' : '◆ RED'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
