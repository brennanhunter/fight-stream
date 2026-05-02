'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScramble } from 'use-scramble';
import { useOverlay } from '@/lib/use-overlay';
import { formatNationality } from '@/lib/countries';

type FighterSnapshot = {
  id?: string;
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
};

type TaleOfTapePayload = {
  match_id?: string;
  match_label?: string;
  left?: FighterSnapshot;
  right?: FighterSnapshot;
};

type StatRow = { label: string; left: string; right: string };

// Same character pool the lower third uses for its corner ASCII blocks.
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

function buildStatRows(left: FighterSnapshot, right: FighterSnapshot): StatRow[] {
  const rows: StatRow[] = [];
  function add(label: string, l?: string | number | null, r?: string | number | null) {
    const lv = l === null || l === undefined || l === '' ? '' : String(l);
    const rv = r === null || r === undefined || r === '' ? '' : String(r);
    if (!lv && !rv) return;
    rows.push({ label, left: lv || '—', right: rv || '—' });
  }
  add('Record', left.record, right.record);
  add('Weight', left.weight_class, right.weight_class);
  add('Height', left.height, right.height);
  add('Reach', left.reach, right.reach);
  add('Age', left.age, right.age);
  add('Stance', capitalize(left.stance), capitalize(right.stance));
  add('Hometown', left.hometown, right.hometown);
  return rows;
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SCRAMBLE_OPTS = {
  speed: 0.5,
  tick: 1,
  step: 2,
  scramble: 18,
  seed: 6,
  chance: 1,
  range: [65, 90] as [number, number],
  overdrive: false,
};

export default function TaleOfTapeDisplay() {
  const { visible, payload, loading } = useOverlay<TaleOfTapePayload>('tale_of_tape');
  const ready = !loading;
  const left = payload.left;
  const right = payload.right;

  const show = ready && visible && !!left && !!right;
  const rows = show ? buildStatRows(left, right) : [];

  // Stage names so the scramble doesn't fire until the card is on-screen.
  const [scrambleLeftName, setScrambleLeftName] = useState('');
  const [scrambleRightName, setScrambleRightName] = useState('');

  useEffect(() => {
    if (show) {
      const t1 = setTimeout(() => setScrambleLeftName(left?.display_name ?? ''), 480);
      const t2 = setTimeout(() => setScrambleRightName(right?.display_name ?? ''), 580);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    setScrambleLeftName('');
    setScrambleRightName('');
  }, [show, left?.display_name, right?.display_name]);

  const { ref: leftNameRef } = useScramble({ text: scrambleLeftName, ...SCRAMBLE_OPTS });
  const { ref: rightNameRef } = useScramble({ text: scrambleRightName, ...SCRAMBLE_OPTS });

  // Animated ASCII corner blocks (matches lower-third decoration).
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

  const leftNat = left ? formatNationality(left.nationality) : { flag: '', label: '' };
  const rightNat = right ? formatNationality(right.nationality) : { flag: '', label: '' };

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
            key="tale-of-tape"
            initial={{ y: '6%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '6%', opacity: 0, transition: { duration: 0.28, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 180, damping: 28, mass: 1.1 }}
            style={{
              position: 'absolute',
              left: '2.5vw',
              right: '2.5vw',
              top: '3vh',
              bottom: '3vh',
              background: 'rgba(4, 4, 4, 0.97)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 30px 80px rgba(0,0,0,0.95), 0 0 80px rgba(255,255,255,0.06), inset 0 0 1px rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Top sweep — same effect the lower third uses on its name reveal */}
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
                background:
                  'linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)',
                transform: 'skewX(-14deg)',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />

            {/* ASCII corner blocks — same vocabulary as the lower third */}
            <AsciiCorner block={asciiBlocks[0]} pos={{ top: '14px', left: '18px' }} />
            <AsciiCorner block={asciiBlocks[1]} pos={{ top: '14px', right: '18px' }} />
            <AsciiCorner block={asciiBlocks[2]} pos={{ bottom: '14px', left: '18px' }} />
            <AsciiCorner block={asciiBlocks[3]} pos={{ bottom: '14px', right: '18px' }} />

            {/* Header band */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.32, ease: 'easeOut' }}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.04)',
                padding: '2.4vh 6vw',
                textAlign: 'center',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {payload.match_label && (
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 'clamp(11px, 1.1vw, 16px)',
                    fontWeight: 700,
                    letterSpacing: '0.5em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '0.7em',
                  }}
                >
                  {'// '} {payload.match_label} {' //'}
                </div>
              )}
              <h1
                style={{
                  fontSize: 'clamp(36px, 4.6vw, 76px)',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Tale of the Tape
              </h1>
            </motion.div>

            {/* Body — three columns */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1.15fr 1fr',
                gap: '3vw',
                padding: '4vh 6vw',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
                minHeight: 0,
              }}
            >
              {/* LEFT FIGHTER */}
              <FighterCard
                fighter={left!}
                nat={leftNat}
                nameRef={leftNameRef}
                slideFrom="left"
              />

              {/* CENTER STATS */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  borderTop: '1px solid rgba(255,255,255,0.18)',
                  borderBottom: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                {rows.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.55 + i * 0.08,
                      duration: 0.4,
                      ease: 'easeOut',
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '24px',
                      alignItems: 'baseline',
                      padding: '14px 0',
                      borderBottom:
                        i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'right',
                        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                        fontSize: 'clamp(18px, 2.2vw, 36px)',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#ffffff',
                      }}
                    >
                      {row.left}
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(11px, 1.1vw, 16px)',
                        fontWeight: 700,
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.55)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        textAlign: 'left',
                        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                        fontSize: 'clamp(18px, 2.2vw, 36px)',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#ffffff',
                      }}
                    >
                      {row.right}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* RIGHT FIGHTER */}
              <FighterCard
                fighter={right!}
                nat={rightNat}
                nameRef={rightNameRef}
                slideFrom="right"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        fontSize: 'clamp(8px, 0.8vw, 12px)',
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

function FighterCard({
  fighter,
  nat,
  nameRef,
  slideFrom,
}: {
  fighter: FighterSnapshot;
  nat: { flag: string; label: string };
  nameRef: React.RefObject<HTMLDivElement | null>;
  slideFrom: 'left' | 'right';
}) {
  const dir = slideFrom === 'left' ? -60 : 60;

  return (
    <motion.div
      initial={{ opacity: 0, x: dir }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.32, duration: 0.55, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          aspectRatio: '3 / 4',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.18)',
          overflow: 'hidden',
        }}
      >
        {fighter.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fighter.photo_url}
            alt={fighter.display_name ?? ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
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
              'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Inset glow to match lower-third frame */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 1px rgba(255,255,255,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
        {(nat.flag || nat.label) && (
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 'clamp(11px, 1.1vw, 16px)',
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '0.5em',
            }}
          >
            {nat.flag && <span style={{ marginRight: '0.4em' }}>{nat.flag}</span>}
            {nat.label}
          </div>
        )}
        <div
          ref={nameRef}
          style={{
            fontSize: 'clamp(28px, 3.2vw, 56px)',
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
    </motion.div>
  );
}
