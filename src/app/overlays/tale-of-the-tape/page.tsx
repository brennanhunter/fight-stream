'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScramble } from 'use-scramble';
import { useOverlay } from '@/lib/use-overlay';
import { formatNationality } from '@/lib/countries';
import AsciiReveal from '@/components/overlays/AsciiReveal';

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
  photo_ascii?: string | null;
};

type TaleOfTapePayload = {
  match_id?: string;
  match_label?: string;
  left?: FighterSnapshot;
  right?: FighterSnapshot;
};

type StatRow = { label: string; left: string; right: string };

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

const NAME_SCRAMBLE_OPTS = {
  speed: 0.5,
  tick: 1,
  step: 2,
  scramble: 18,
  seed: 6,
  chance: 1,
  range: [65, 90] as [number, number],
  overdrive: false,
};

// Lighter scramble for stat values — same settings as the lower third's
// record/weight subline so the two overlays feel consistent.
const STAT_SCRAMBLE_OPTS = {
  speed: 0.55,
  tick: 1,
  step: 1,
  scramble: 12,
  seed: 4,
  chance: 0.85,
  range: [48, 90] as [number, number],
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

  const { ref: leftNameRef } = useScramble({ text: scrambleLeftName, ...NAME_SCRAMBLE_OPTS });
  const { ref: rightNameRef } = useScramble({ text: scrambleRightName, ...NAME_SCRAMBLE_OPTS });

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
            {/* Boxing corner gradients — blue (left) + red (right) bleed in
                from the card edges. Subtle but reads at any size. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '32%',
                background:
                  'linear-gradient(to right, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.06) 60%, transparent)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '32%',
                background:
                  'linear-gradient(to left, rgba(220, 38, 38, 0.22), rgba(220, 38, 38, 0.06) 60%, transparent)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

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

            {/* Body — three columns. Stats column gets the most room since
                 longer values like "14-2-1 (3 KOs)" or city names need to fit
                 on one line without wrapping. */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '0.85fr 1.5fr 0.85fr',
                gap: '2.5vw',
                padding: '4vh 6vw',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
                minHeight: 0,
              }}
            >
              {/* LEFT FIGHTER — blue corner */}
              <FighterCard
                fighter={left!}
                nat={leftNat}
                nameRef={leftNameRef}
                slideFrom="left"
                corner="blue"
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
                  <ScrambleStatRow
                    key={row.label}
                    row={row}
                    delaySec={0.55 + i * 0.08}
                    isLast={i === rows.length - 1}
                  />
                ))}
              </div>

              {/* RIGHT FIGHTER — red corner */}
              <FighterCard
                fighter={right!}
                nat={rightNat}
                nameRef={rightNameRef}
                slideFrom="right"
                corner="red"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScrambleStatRow({
  row,
  delaySec,
  isLast,
}: {
  row: StatRow;
  delaySec: number;
  isLast: boolean;
}) {
  // Empty until the row's stagger window opens, then snap to the real value.
  // use-scramble cycles characters from '' → real text, giving the same
  // wash-in feel the lower third uses for its record/weight subline.
  const [scrambleLeft, setScrambleLeft] = useState('');
  const [scrambleRight, setScrambleRight] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setScrambleLeft(row.left), delaySec * 1000);
    const t2 = setTimeout(() => setScrambleRight(row.right), delaySec * 1000 + 60);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [row.left, row.right, delaySec]);

  const { ref: leftRef } = useScramble({ text: scrambleLeft, ...STAT_SCRAMBLE_OPTS });
  const { ref: rightRef } = useScramble({ text: scrambleRight, ...STAT_SCRAMBLE_OPTS });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delaySec, duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '24px',
        alignItems: 'baseline',
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        ref={leftRef}
        style={{
          textAlign: 'right',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 'clamp(15px, 1.7vw, 26px)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: '#ffffff',
          minHeight: '1em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />
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
        ref={rightRef}
        style={{
          textAlign: 'left',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 'clamp(15px, 1.7vw, 26px)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: '#ffffff',
          minHeight: '1em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />
    </motion.div>
  );
}

function FighterCard({
  fighter,
  nat,
  nameRef,
  slideFrom,
  corner,
}: {
  fighter: FighterSnapshot;
  nat: { flag: string; label: string };
  nameRef: React.RefObject<HTMLDivElement | null>;
  slideFrom: 'left' | 'right';
  corner: 'blue' | 'red';
}) {
  const dir = slideFrom === 'left' ? -60 : 60;
  const cornerColor = corner === 'blue' ? '#2563eb' : '#dc2626';
  const cornerSoft = corner === 'blue' ? 'rgba(37,99,235,0.55)' : 'rgba(220,38,38,0.55)';

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
          border: `2px solid ${cornerSoft}`,
          boxShadow: `0 0 24px ${cornerSoft}`,
          overflow: 'hidden',
        }}
      >
        {fighter.photo_url ? (
          <AsciiReveal
            ascii={fighter.photo_ascii}
            photoUrl={fighter.photo_url}
            alt={fighter.display_name ?? ''}
            triggerKey={fighter.id}
            objectFit="cover"
            color={cornerColor}
            glow={cornerSoft}
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
        {/* Inset glow tinted with the corner color */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 1px rgba(255,255,255,0.4), inset 0 0 60px ${cornerSoft}`,
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
        {/* Corner accent line — blue under fighter A's name, red under B's */}
        <div
          style={{
            width: '60px',
            height: '3px',
            background: cornerColor,
            margin: '14px auto 0',
            boxShadow: `0 0 12px ${cornerColor}`,
          }}
        />
      </div>
    </motion.div>
  );
}
