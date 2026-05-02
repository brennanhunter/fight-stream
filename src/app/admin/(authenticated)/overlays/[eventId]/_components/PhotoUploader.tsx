'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadBoxerPhoto } from '../actions';

type Kind = 'fighter' | 'logo';

type AutoSaveResult = { ok: true } | { ok: false; error: string };

/**
 * Generic image uploader (drag/drop or click). Uploads to Supabase Storage via
 * `uploadBoxerPhoto` and returns the public URL. Caller decides what to do
 * with the URL via `onChange`.
 *
 * If `onAutoSave` is provided, the uploader also persists the URL through that
 * callback the moment the upload finishes — useful for edit-mode flows where
 * the operator might close the form without clicking Save.
 */
export default function PhotoUploader({
  value,
  onChange,
  displayName,
  kind = 'fighter',
  onAutoSave,
}: {
  value: string;
  onChange: (url: string) => void;
  displayName?: string;
  kind?: Kind;
  onAutoSave?: (url: string | null) => Promise<AutoSaveResult>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function pickFile(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadBoxerPhoto(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange(res.url);
      if (onAutoSave) {
        const persistRes = await onAutoSave(res.url);
        if (persistRes.ok) {
          toast.success(kind === 'logo' ? 'Logo saved' : 'Photo saved');
        } else {
          toast.error('Uploaded but not saved', { description: persistRes.error });
        }
      }
    });
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave() {
    setDragActive(false);
  }

  function clearPhoto() {
    onChange('');
    if (onAutoSave) {
      startTransition(async () => {
        const res = await onAutoSave(null);
        if (res.ok) {
          toast.success(kind === 'logo' ? 'Logo removed' : 'Photo removed');
        } else {
          toast.error('Failed to remove', { description: res.error });
        }
      });
    }
  }

  const recommendation =
    kind === 'logo'
      ? 'PNG with transparent background reads cleanest on broadcast. ~400×400 or larger.'
      : '1500×2000 portrait (3:4), head & shoulders centered, plain background renders cleanly on every overlay.';

  const dropHint =
    kind === 'logo'
      ? 'Drop a logo image here or click to upload'
      : 'Drop a photo here or click to upload';

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-start gap-3">
          <div
            className={`relative shrink-0 overflow-hidden rounded-md border bg-muted ${
              kind === 'logo' ? 'h-24 w-24 p-2' : 'h-24 w-24'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={displayName ?? ''}
              className="h-full w-full"
              style={{ objectFit: kind === 'logo' ? 'contain' : 'cover' }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/image.jpg"
              className="text-xs font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
              >
                <Upload />
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearPhoto}
                disabled={pending}
              >
                <X />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragActive
              ? 'border-foreground/60 bg-foreground/5'
              : 'border-border hover:border-foreground/40 hover:bg-muted/30'
          } ${pending ? 'pointer-events-none opacity-60' : ''}`}
        >
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Uploading…</p>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-medium">{dropHint.split(' or ')[0]}</span>{' '}
                <span className="text-muted-foreground">or click to upload</span>
              </p>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  <span className="text-foreground/80">Recommended:</span> {recommendation}
                </p>
                <p>JPEG · PNG · WebP · AVIF · max 8 MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {value && !pending && (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground/80">Tip:</span> {recommendation}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={onFileChosen}
        className="hidden"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
