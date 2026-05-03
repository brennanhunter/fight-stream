'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScramble } from 'use-scramble';
import { useOverlay } from '@/lib/use-overlay';
import { formatNationality } from '@/lib/countries';
import AsciiReveal from '@/components/overlays/AsciiReveal';

type FighterSnapshot = {
  display_name?: string;
  record?: string | null;
  weight_class?: string | null;
  height?: string | null;
  reach?: string | null;
  age?: number | null;
  stance?: string | null;
  hometown?: string | null;
  nationality?: string | null;
  photo_url?: string | null;
  photo_ascii?: string | null;
};

type BoxerCardPayload = {
  match_id?: string;
  match_label?: string;
  fighter_id?: string;
  fighter?: FighterSnapshot;
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

const NAME_SCRAMBLE_OPTS = {
  speed: 0.5,
  tick: 1,
  step: 2,
  scramble: 16,
  seed: 5,
  chance: 1,
  range: [65, 90] as [number, number],
  overdrive: false,
};

const STAT_SCRAMBLE_OPTS = {
  speed: 0.55,
  tick: 1,
  step: 1,
  scramble: 10,
  seed: 4,
  chance: 0.85,
  range: [48, 90] as [number, number],
  overdrive: false,
};

type StatRow = { label: string; value: string };

function buildStatRows(f: FighterSnapshot): StatRow[] {
  const rows: StatRow[] = [];
  function add(label: string, v?: string | number | null) {
    const val = v === null || v === undefined || v === '' ? '' : String(v);
    if (val) rows.push({ label, value: val });
  }
  add('Record', f.record);
  add('Weight', f.weight_class);
  add('Height', f.height);
  add('Reach', f.reach);
  add('Age', f.age);
  add('Stance', capitalize(f.stance));
  add('Hometown', f.hometown);
  return rows;
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function BoxerCardDisplay() {
  const { visible, payload, loading } = useOverlay<BoxerCardPayload>('boxer_card');
  const ready = !loading;
  const fighter = payload.fighter;

  const show = ready && visible && !!fighter;
  const rows = show && fighter ? buildStatRows(fighter) : [];
  const nat = fighter ? formatNationality(fighter.nationality) : { flag: '', label: '' };

  // Stage scramble — name kicks in after card slides into place
  const [scrambleName, setScrambleName] = useState('');
  useEffect(() => {
    if (show && fighter?.display_name) {
      const t = setTimeout(() => setScrambleName(fighter.display_name ?? ''), 380);
      return () => clearTimeout(t);
    }
    setScrambleName('');
  }, [show, fighter?.display_name]);
  const { ref: nameRef } = useScramble({ text: scrambleName, ...NAME_SCRAMBLE_OPTS });

  // ASCII corner ticking
  const [asciiBlocks, setAsciiBlocks] = useState<string[]>(['', '', '', '']);
  useEffect(() => {
    if (!show) {
      setAsciiBlocks(['', '', '', '']);
      return;
    }
    const tick = () =>
      setAsciiBlocks([
        randomAsciiBlock(),
        randomAsciiBlock(),
        randomAsciiBlock(),
        randomAsciiBlock(),
      ]);
    tick();
    const id = setInterval(tick, 110);
    return () => clearInterval(id);
  }, [show]);

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
        {show && fighter && (
          <motion.div
            key="boxer-card"
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0, transition: { duration: 0.28, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 200, damping: 28, mass: 1.1 }}
            style={{
              position: 'absolute',
              right: '3vw',
              top: '8vh',
              bottom: '8vh',
              width: 'min(28vw, 480px)',
              background: 'rgba(4, 4, 4, 0.96)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 30px 80px rgba(0,0,0,0.95), 0 0 60px rgba(255,255,255,0.05), inset 0 0 1px rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ASCII corners */}
            <AsciiCorner block={asciiBlocks[0]} pos={{ top: '8px', left: '10px' }} />
            <AsciiCorner block={asciiBlocks[1]} pos={{ top: '8px', right: '10px' }} />
            <AsciiCorner block={asciiBlocks[2]} pos={{ bottom: '8px', left: '10px' }} />
            <AsciiCorner block={asciiBlocks[3]} pos={{ bottom: '8px', right: '10px' }} />

            {/* Top sweep */}
            <motion.div
              initial={{ x: '-120%' }}
              animate={{ x: '420%' }}
              transition={{ delay: 0.55, duration: 0.85, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '22%',
                background:
                  'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)',
                transform: 'skewX(-14deg)',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />

            {/* Match label band */}
            {payload.match_label && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.32, ease: 'easeOut' }}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '12px 18px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {'// '} {payload.match_label} {' //'}
              </motion.div>
            )}

            {/* Photo with name overlay */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '3 / 4',
                flexShrink: 0,
                overflow: 'hidden',
                borderBottom: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {fighter.photo_url ? (
                <AsciiReveal
                  ascii={fighter.photo_ascii}
                  photoUrl={fighter.photo_url}
                  alt={fighter.display_name ?? ''}
                  triggerKey={payload.fighter_id}
                  objectFit="cover"
                  color={payload.corner === 'red' ? '#dc2626' : '#2563eb'}
                  glow={
                    payload.corner === 'red'
                      ? 'rgba(220,38,38,0.55)'
                      : 'rgba(37,99,235,0.55)'
                  }
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4vw',
                    color: 'rgba(255,255,255,0.15)',
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  }}
                >
                  ?
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.92) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  boxShadow: 'inset 0 0 1px rgba(255,255,255,0.4)',
                  pointerEvents: 'none',
                }}
              />

              {/* Name + nationality at bottom of photo */}
              <div
                style={{
                  position: 'absolute',
                  left: '18px',
                  right: '18px',
                  bottom: '14px',
                }}
              >
                {(nat.flag || nat.label) && (
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.7)',
                      marginBottom: '4px',
                    }}
                  >
                    {nat.flag && <span style={{ marginRight: '0.4em' }}>{nat.flag}</span>}
                    {nat.label}
                  </div>
                )}
                <div
                  ref={nameRef}
                  style={{
                    fontSize: 'clamp(28px, 2.6vw, 44px)',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    minHeight: '1em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                />
              </div>
            </div>

            {/* Stats list */}
            <div
              style={{
                flex: 1,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {rows.map((row, i) => (
                <ScrambleStatLine
                  key={row.label}
                  row={row}
                  delaySec={0.45 + i * 0.07}
                  isLast={i === rows.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScrambleStatLine({
  row,
  delaySec,
  isLast,
}: {
  row: StatRow;
  delaySec: number;
  isLast: boolean;
}) {
  const [scrambled, setScrambled] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setScrambled(row.value), delaySec * 1000);
    return () => clearTimeout(t);
  }, [row.value, delaySec]);

  const { ref } = useScramble({ text: scrambled, ...STAT_SCRAMBLE_OPTS });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delaySec, duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '12px',
        padding: '8px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          whiteSpace: 'nowrap',
        }}
      >
        {row.label}
      </span>
      <span
        ref={ref}
        style={{
          textAlign: 'right',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 'clamp(13px, 1.2vw, 18px)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: '#ffffff',
          minHeight: '1em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '60%',
        }}
      />
    </motion.div>
  );
}

function AsciiCorner({
  block,
  pos,
}: {
  block: string;
  pos: { top?: string; bottom?: string; left?: string; right?: string };
}) {
  return (
    <pre
      style={{
        position: 'absolute',
        ...pos,
        margin: 0,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontSize: '7px',
        lineHeight: 1,
        letterSpacing: 0,
        color: 'rgba(255,255,255,0.16)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 3,
      }}
    >
      {block}
    </pre>
  );
}
