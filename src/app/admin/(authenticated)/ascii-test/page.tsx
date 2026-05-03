'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { convertToAscii, type AsciiPreviewResult } from './actions';

// Reveal animation constants (ms).
const SCRAMBLE_PHASE_MS = 350; // every cell shows random glyphs
const REVEAL_PHASE_MS = 800;   // cells progressively lock in to truth
const HOLD_MS = 800;           // hold the resolved ASCII before the sweep
const SWEEP_MS = 3500;         // duration of the diagonal ASCII → photo sweep

const RAMPS: { name: string; value: string }[] = [
  { name: 'Classic ASCII', value: ' .:-=+*#%@' },
  { name: 'ASCII (dense)', value: ' .,:;ox%@#' },
  { name: 'Unicode blocks', value: ' ░▒▓█' },
  { name: 'Unicode (mixed)', value: ' .░▒▓█' },
  { name: 'Sparse dots', value: ' ·•●' },
];

export default function AsciiTestPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AsciiPreviewResult | null>(null);

  const [cols, setCols] = useState(100);
  const [ramp, setRamp] = useState(RAMPS[0].value);
  const [cellAspect, setCellAspect] = useState(2);
  const [alphaThreshold, setAlphaThreshold] = useState(32);
  const [invert, setInvert] = useState(false);

  const [revealed, setRevealed] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  // What the <pre> currently shows. During the entrance this is a partially-
  // scrambled version of result.ascii; once the animation finishes it equals
  // the truth.
  const [displayed, setDisplayed] = useState('');

  function run(file: File) {
    setLastFile(file);
    setRevealed(false);
    setDisplayed('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('cols', String(cols));
    fd.append('ramp', ramp);
    fd.append('cellAspect', String(cellAspect));
    fd.append('alphaThreshold', String(alphaThreshold));
    fd.append('invert', String(invert));
    startTransition(async () => {
      const res = await convertToAscii(fd);
      setResult(res);
      // Reveal animation is driven by the useEffect below, not a setTimeout.
    });
  }

  // Drive the scramble → resolve → crossfade animation whenever a fresh
  // result lands. Cancels cleanly on re-run / unmount.
  useEffect(() => {
    if (!result?.ok) return;
    const truth = result.ascii;
    const rows = truth.split('\n');
    const rampPool = ramp.replace(/ /g, '') || '#'; // glyphs to scramble with
    const rampLen = rampPool.length;

    // Per-cell time at which the truth locks in (ms from animation start).
    // Spaces lock in immediately so the silhouette stays clean throughout.
    const revealAt: number[][] = rows.map((row) =>
      Array.from({ length: row.length }, (_, c) =>
        row[c] === ' '
          ? 0
          : SCRAMBLE_PHASE_MS + Math.random() * REVEAL_PHASE_MS,
      ),
    );

    let rafId = 0;
    const startTime = performance.now();
    let finished = false;

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
            line += rampPool[Math.floor(Math.random() * rampLen)];
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

    // After the resolve completes, hold for HOLD_MS then crossfade.
    const holdTimer = setTimeout(
      () => setRevealed(true),
      SCRAMBLE_PHASE_MS + REVEAL_PHASE_MS + HOLD_MS,
    );

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(holdTimer);
      if (!finished) setDisplayed(truth);
    };
  }, [result, ramp]);

  function rerun() {
    if (lastFile) run(lastFile);
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Prototype
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">ASCII portrait test</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Upload a fighter photo and see how it renders as ASCII before resolving to the real
          image. Transparent pixels render as spaces so transparent-background portraits keep a
          clean silhouette. Tweak the controls and re-run to compare ramp / density tradeoffs.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Controls */}
        <aside className="space-y-4 rounded-md border bg-card p-4">
          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium">Image</label>
            <Input
              ref={fileRef}
              id="file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(f);
                e.target.value = '';
              }}
              disabled={pending}
            />
            {lastFile && (
              <p className="truncate text-xs text-muted-foreground" title={lastFile.name}>
                {lastFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cols" className="text-sm font-medium">
              Columns: <span className="font-mono">{cols}</span>
            </label>
            <Input
              id="cols"
              type="range"
              min={40}
              max={200}
              step={4}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cellAspect" className="text-sm font-medium">
              Cell aspect (vertical fix):{' '}
              <span className="font-mono">{cellAspect.toFixed(2)}</span>
            </label>
            <Input
              id="cellAspect"
              type="range"
              min={1.4}
              max={2.6}
              step={0.05}
              value={cellAspect}
              onChange={(e) => setCellAspect(parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="alpha" className="text-sm font-medium">
              Alpha cutoff: <span className="font-mono">{alphaThreshold}</span>
            </label>
            <Input
              id="alpha"
              type="range"
              min={0}
              max={200}
              step={4}
              value={alphaThreshold}
              onChange={(e) => setAlphaThreshold(parseInt(e.target.value, 10))}
            />
            <p className="text-[11px] text-muted-foreground">
              Pixels below this alpha render as spaces. Bump it up if a faint background is
              leaking glyphs.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ramp</label>
            <div className="flex flex-wrap gap-1">
              {RAMPS.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setRamp(r.value)}
                  className={`rounded border px-2 py-1 text-[11px] transition ${
                    ramp === r.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-foreground/40'
                  }`}
                  title={r.value}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <Input
              value={ramp}
              onChange={(e) => setRamp(e.target.value)}
              className="font-mono text-xs"
              placeholder=" .:-=+*#%@"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
            />
            Invert brightness
          </label>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={rerun} disabled={!lastFile || pending}>
              {pending ? 'Processing…' : 'Re-run with current settings'}
            </Button>
            {result?.ok && (
              <Button
                variant="outline"
                onClick={() => setRevealed((v) => !v)}
                disabled={pending}
              >
                {revealed ? 'Show ASCII' : 'Show photo'}
              </Button>
            )}
          </div>
        </aside>

        {/* ── Preview stage */}
        <div className="rounded-md border bg-black p-6">
          {!result && (
            <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
              Upload an image to start.
            </div>
          )}

          {result && !result.ok && (
            <div className="flex h-[600px] items-center justify-center text-sm text-red-400">
              {result.error}
            </div>
          )}

          {result?.ok && (
            <>
              {/* Register --reveal-stop as a typed property so the value can
                  actually transition (CSS variables don't interpolate by
                  default). The mask gradients on both layers reference it,
                  driving a diagonal TL → BR sweep. */}
              <style>{`
                @property --reveal-stop {
                  syntax: '<percentage>';
                  initial-value: -20%;
                  inherits: true;
                }
              `}</style>

              <div className="flex justify-center">
                <div
                  className="relative inline-block"
                  style={{
                    maxWidth: '100%',
                    // Wider start/end so the sweep enters and exits cleanly
                    // even with the very wide feather band.
                    ['--reveal-stop' as string]: revealed ? '150%' : '-50%',
                    transition: `--reveal-stop ${SWEEP_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                >
                  {/* ASCII layer — fades out across a wide diagonal band as
                      the sweep advances. The 60% feather (centered on the
                      reveal-stop) is what lets the photo and ASCII share
                      pixels for a long time → "transforming" feel. */}
                  <pre
                    aria-hidden={revealed}
                    style={{
                      margin: 0,
                      padding: 0,
                      color: '#ffffff',
                      background: 'transparent',
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: '10px',
                      lineHeight: 1,
                      letterSpacing: 0,
                      whiteSpace: 'pre',
                      display: 'block',
                      maskImage:
                        'linear-gradient(135deg, transparent 0%, transparent calc(var(--reveal-stop) - 30%), black calc(var(--reveal-stop) + 30%), black 100%)',
                      WebkitMaskImage:
                        'linear-gradient(135deg, transparent 0%, transparent calc(var(--reveal-stop) - 30%), black calc(var(--reveal-stop) + 30%), black 100%)',
                    }}
                  >
                    {displayed || result.ascii}
                  </pre>

                  {/* Real photo — fades in across the same wide band so both
                      layers blend together while the sweep crosses. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.dataUrl}
                    alt="Source"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      maskImage:
                        'linear-gradient(135deg, black 0%, black calc(var(--reveal-stop) - 30%), transparent calc(var(--reveal-stop) + 30%), transparent 100%)',
                      WebkitMaskImage:
                        'linear-gradient(135deg, black 0%, black calc(var(--reveal-stop) - 30%), transparent calc(var(--reveal-stop) + 30%), transparent 100%)',
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>
                  Grid: <span className="font-mono text-foreground">{result.cols} × {result.rows}</span>
                </span>
                <span>
                  Ramp: <span className="font-mono text-foreground">{ramp}</span>
                </span>
                <span>
                  Cell aspect: <span className="font-mono text-foreground">{cellAspect}</span>
                </span>
                <span>
                  Alpha cutoff:{' '}
                  <span className="font-mono text-foreground">{alphaThreshold}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
