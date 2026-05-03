import sharp from 'sharp';

export type AsciiOptions = {
  /** Number of character columns. Vertical rows are derived from aspect ratio. */
  cols?: number;
  /**
   * Monospace cell aspect ratio compensation. Cells are roughly twice as tall
   * as they are wide, so we sample horizontally at 2× the vertical rate to
   * keep the portrait from looking squashed.
   */
  cellAspect?: number;
  /** Ramp from sparse → dense. Index 0 = darkest cell, last = brightest. */
  ramp?: string;
  /**
   * Pixels with alpha below this threshold (0–255) render as a space. Lets
   * transparent backgrounds drop out cleanly so the fighter's silhouette
   * reads as a clean shape.
   */
  alphaThreshold?: number;
  /**
   * If true, the ramp is treated as bright→dark instead of dark→bright. Some
   * source photos have darker subjects against lighter backgrounds and look
   * better inverted.
   */
  invert?: boolean;
};

const DEFAULT_RAMP = ' .:-=+*#%@';

export type AsciiResult = {
  ascii: string;
  cols: number;
  rows: number;
};

/**
 * Convert an image buffer to an ASCII string. Per-cell average brightness is
 * mapped to a ramp character; cells whose source pixels are mostly
 * transparent are emitted as spaces so transparent PNG backgrounds don't
 * pollute the silhouette.
 */
export async function imageToAscii(
  input: Buffer | ArrayBuffer | Uint8Array,
  opts: AsciiOptions = {},
): Promise<AsciiResult> {
  const cols = Math.max(20, Math.min(240, opts.cols ?? 100));
  const cellAspect = opts.cellAspect ?? 2;
  const ramp = opts.ramp ?? DEFAULT_RAMP;
  const alphaThreshold = opts.alphaThreshold ?? 32;
  const invert = opts.invert ?? false;

  const buf: Buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(new Uint8Array(input));

  const meta = await sharp(buf).metadata();
  const srcW = meta.width ?? cols;
  const srcH = meta.height ?? cols;
  // Rows scale with the source aspect ratio, divided by cellAspect because
  // each character cell is taller than it is wide.
  const rows = Math.max(10, Math.round((cols * (srcH / srcW)) / cellAspect));

  const { data } = await sharp(buf)
    .resize(cols, rows, { fit: 'fill', kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lines: string[] = [];
  const rampLen = ramp.length;
  const lastIdx = rampLen - 1;

  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < alphaThreshold) {
        line += ' ';
        continue;
      }

      // Rec. 601 luma weighting.
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let t = lum / 255;
      if (invert) t = 1 - t;
      const idx = Math.min(lastIdx, Math.max(0, Math.round(t * lastIdx)));
      line += ramp[idx];
    }
    lines.push(line);
  }

  return { ascii: lines.join('\n'), cols, rows };
}
