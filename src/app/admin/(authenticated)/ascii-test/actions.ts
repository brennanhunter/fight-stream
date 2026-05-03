'use server';

import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { imageToAscii, type AsciiOptions } from '@/lib/image-to-ascii';

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

export type AsciiPreviewResult =
  | {
      ok: true;
      ascii: string;
      cols: number;
      rows: number;
      dataUrl: string;
      mime: string;
    }
  | { ok: false; error: string };

/**
 * Preview-only conversion. Accepts an uploaded image, returns the ASCII
 * string + a data URL of the original (for the crossfade in the UI). No
 * persistence — just an in-memory round trip.
 */
export async function convertToAscii(
  formData: FormData,
): Promise<AsciiPreviewResult> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'No file uploaded' };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: 'File too large (max 8 MB)' };
  }

  const cols = parseInt(String(formData.get('cols') ?? '100'), 10);
  const ramp = String(formData.get('ramp') ?? ' .:-=+*#%@');
  const cellAspect = parseFloat(String(formData.get('cellAspect') ?? '2'));
  const invert = formData.get('invert') === 'true';
  const alphaThreshold = parseInt(
    String(formData.get('alphaThreshold') ?? '32'),
    10,
  );

  const opts: AsciiOptions = { cols, ramp, cellAspect, invert, alphaThreshold };

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await imageToAscii(buf, opts);
    const mime = file.type || 'image/png';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    return {
      ok: true,
      ascii: result.ascii,
      cols: result.cols,
      rows: result.rows,
      dataUrl,
      mime,
    };
  } catch (err) {
    console.error('convertToAscii:', err);
    return { ok: false, error: 'Failed to process image' };
  }
}
