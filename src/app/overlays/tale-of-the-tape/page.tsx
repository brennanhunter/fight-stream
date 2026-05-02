'use client';

import { AnimatePresence, motion } from 'framer-motion';
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

function buildStatRows(left: FighterSnapshot, right: FighterSnapshot): StatRow[] {
  const rows: StatRow[] = [];
  function add(label: string, l?: string | number | null, r?: string | number | null) {
    const lv = l === null || l === undefined || l === '' ? '' : String(l);
    const rv = r === null || r === undefined || r === '' ? '' : String(r);
    if (!lv && !rv) return;
    rows.push({ label, left: lv || '—', right: rv || '—' });
  }
  add('Record', left.record, right.record);
  add('Weight Class', left.weight_class, right.weight_class);
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.4 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function TaleOfTapeDisplay() {
  const { visible, payload, loading } = useOverlay<TaleOfTapePayload>('tale_of_tape');
  const ready = !loading;
  const left = payload.left;
  const right = payload.right;

  const show = ready && visible && !!left && !!right;
  const rows = show ? buildStatRows(left, right) : [];

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, #0a0a0a 0%, #000 80%)',
              fontFamily:
                'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header band */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                padding: '4vh 6vw 2vh',
                textAlign: 'center',
              }}
            >
              {payload.match_label && (
                <div
                  style={{
                    fontSize: 'clamp(14px, 1.6vw, 22px)',
                    fontWeight: 700,
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: '#fbbf24',
                    marginBottom: '0.6em',
                  }}
                >
                  {payload.match_label}
                </div>
              )}
              <h1
                style={{
                  fontSize: 'clamp(40px, 5vw, 88px)',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Tale of the Tape
              </h1>
              <div
                style={{
                  width: '120px',
                  height: '3px',
                  background: '#dc2626',
                  margin: '20px auto 0',
                }}
              />
            </motion.div>

            {/* Body — three columns: left fighter, stats, right fighter */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1.1fr 1fr',
                gap: '3vw',
                padding: '0 6vw 6vh',
                alignItems: 'center',
              }}
            >
              {/* LEFT FIGHTER */}
              <motion.div variants={slideLeft} style={{ textAlign: 'center' }}>
                <FighterCard fighter={left!} nat={leftNat} />
              </motion.div>

              {/* CENTER STATS */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  padding: '2vh 0',
                }}
              >
                {rows.map((row) => (
                  <motion.div
                    key={row.label}
                    variants={fadeUp}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '20px',
                      alignItems: 'baseline',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      padding: '10px 0',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: 'clamp(20px, 2.4vw, 38px)',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
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
                        fontSize: 'clamp(20px, 2.4vw, 38px)',
                        fontWeight: 700,
                      }}
                    >
                      {row.right}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* RIGHT FIGHTER */}
              <motion.div variants={slideRight} style={{ textAlign: 'center' }}>
                <FighterCard fighter={right!} nat={rightNat} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FighterCard({
  fighter,
  nat,
}: {
  fighter: FighterSnapshot;
  nat: { flag: string; label: string };
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          aspectRatio: '3 / 4',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
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
              color: 'rgba(255,255,255,0.2)',
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
              'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div>
        {(nat.flag || nat.label) && (
          <div
            style={{
              fontSize: 'clamp(14px, 1.4vw, 22px)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '0.4em',
            }}
          >
            {nat.flag && <span style={{ marginRight: '0.4em' }}>{nat.flag}</span>}
            {nat.label}
          </div>
        )}
        <div
          style={{
            fontSize: 'clamp(28px, 3.4vw, 60px)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {fighter.display_name}
        </div>
      </div>
    </div>
  );
}
