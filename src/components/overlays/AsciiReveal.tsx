'use client';

import { useEffect, useRef, useState } from 'react';

const SCRAMBLE_PHASE_MS = 350;
const REVEAL_PHASE_MS = 800;
const HOLD_MS = 800;
const SWEEP_MS = 3500;

const SCRAMBLE_POOL = '.:-=+*#%@';

type Props = {
  /** Pre-baked ASCII string from event_fighters.photo_ascii. */
  ascii?: string | null;
  /** Live photo URL from event_fighters.photo_url. */
  photoUrl?: string | null;
  /** Fallback alt for the <img>. */
  alt?: string;
  /** A key that, when changed, restarts the entrance animation. */
  triggerKey?: string;
  /** objectFit for the resolved image — `cover` for tale-of-the-tape /
   *  boxer-card frames; `contain` to letterbox. Defaults to `cover`. */
  objectFit?: 'cover' | 'contain';
  /** Color of the ASCII glyphs. Defaults to white. Use the corner color
   *  (blue/red) on overlays that already use corner accents. */
  color?: string;
  /** Optional glow tint behind the ASCII glyphs. Set this to a soft version
   *  of `color` for a punchier reveal. */
  glow?: string;
};

/**
 * Renders an ASCII portrait that scrambles in, resolves to its real cells,
 * holds, then sweeps diagonally TL→BR into the actual photo. If no ASCII is
 * available it falls back to the photo with no animation. If neither is
 * available it renders nothing — caller should branch on photoUrl absence.
 *
 * Sized to 100% of its container; the <pre> uses a fixed font-size and is
 * centered so its natural pixel dimensions remain consistent.
 */
export default function AsciiReveal({
  ascii,
  photoUrl,
  alt,
  triggerKey,
  objectFit = 'cover',
  color = '#ffffff',
  glow,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [displayed, setDisplayed] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [scale, setScale] = useState(1);

  // Scale the <pre> so its natural dimensions match the container the same
  // way the photo's object-fit does. `cover` fills the slot (ASCII may clip);
  // `contain` letterboxes.
  useEffect(() => {
    if (!ascii) return;
    const wrapper = wrapperRef.current;
    const pre = preRef.current;
    if (!wrapper || !pre) return;

    function measure() {
      const wW = wrapper!.clientWidth;
      const wH = wrapper!.clientHeight;
      const pW = pre!.scrollWidth;
      const pH = pre!.scrollHeight;
      if (!wW || !wH || !pW || !pH) return;
      const sx = wW / pW;
      const sy = wH / pH;
      setScale(objectFit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    ro.observe(pre);
    return () => ro.disconnect();
  }, [ascii, objectFit]);

  useEffect(() => {
    if (!ascii) {
      // No ASCII available — just show the photo, no animation.
      setRevealed(true);
      setDisplayed('');
      return;
    }

    setRevealed(false);
    const rows = ascii.split('\n');
    const revealAt: number[][] = rows.map((row) =>
      Array.from({ length: row.length }, (_, c) =>
        row[c] === ' '
          ? 0
          : SCRAMBLE_PHASE_MS + Math.random() * REVEAL_PHASE_MS,
      ),
    );

    let rafId = 0;
    let finished = false;
    const startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime;
      const out: string[] = [];
      let allLocked = true;

      for (let r = 0; r < rows.length; r++) {
        const targetRow = rows[r];
        let line = '';
        for (let c = 0; c < targetRow.length; c++) {
          const target = targetRow[c];
          if (elapsed >= revealAt[r][c]) {
            line += target;
          } else {
            allLocked = false;
            line += SCRAMBLE_POOL[
              Math.floor(Math.random() * SCRAMBLE_POOL.length)
            ];
          }
        }
        out.push(line);
      }

      setDisplayed(out.join('\n'));
      if (allLocked) {
        finished = true;
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    const holdTimer = setTimeout(
      () => setRevealed(true),
      SCRAMBLE_PHASE_MS + REVEAL_PHASE_MS + HOLD_MS,
    );

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(holdTimer);
      if (!finished) setDisplayed(ascii);
    };
  }, [ascii, triggerKey]);

  // Photo-only fallback — no ASCII to reveal from.
  if (!ascii && photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={alt ?? ''}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit,
        }}
      />
    );
  }

  if (!ascii && !photoUrl) {
    return null;
  }

  return (
    <>
      {/* Register the typed CSS custom property once per overlay instance.
          Multiple instances on the page is safe — @property declarations
          merge by name. */}
      <style>{`
        @property --ar-stop {
          syntax: '<percentage>';
          initial-value: -50%;
          inherits: true;
        }
      `}</style>

      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          ['--ar-stop' as string]: revealed ? '150%' : '-50%',
          transition: `--ar-stop ${SWEEP_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        {/* ASCII layer — fixed natural font size, scaled to fit the slot via
            transform. Wide diagonal mask fades it out as the sweep advances. */}
        <pre
          ref={preRef}
          aria-hidden
          style={{
            margin: 0,
            padding: 0,
            color,
            background: 'transparent',
            fontFamily:
              'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '10px',
            lineHeight: 1,
            letterSpacing: 0,
            whiteSpace: 'pre',
            display: 'block',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            textShadow: glow ? `0 0 12px ${glow}` : undefined,
            maskImage:
              'linear-gradient(135deg, transparent 0%, transparent calc(var(--ar-stop) - 30%), black calc(var(--ar-stop) + 30%), black 100%)',
            WebkitMaskImage:
              'linear-gradient(135deg, transparent 0%, transparent calc(var(--ar-stop) - 30%), black calc(var(--ar-stop) + 30%), black 100%)',
          }}
        >
          {displayed || ascii}
        </pre>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={alt ?? ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit,
              pointerEvents: 'none',
              maskImage:
                'linear-gradient(135deg, black 0%, black calc(var(--ar-stop) - 30%), transparent calc(var(--ar-stop) + 30%), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(135deg, black 0%, black calc(var(--ar-stop) - 30%), transparent calc(var(--ar-stop) + 30%), transparent 100%)',
            }}
          />
        )}
      </div>
    </>
  );
}
