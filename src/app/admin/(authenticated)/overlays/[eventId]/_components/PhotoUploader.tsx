'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadBoxerPhoto } from '../actions';

export default function PhotoUploader({
  value,
  onChange,
  displayName,
}: {
  value: string;
  onChange: (url: string) => void;
  displayName: string;
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
      if (res.ok) {
        onChange(res.url);
      } else {
        setError(res.error);
      }
    });
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    // reset so picking the same file twice still triggers onChange
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
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={displayName || ''} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/photo.jpg"
              className="text-xs font-mono"
            />
            <div className="flex gap-2">
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
                <span className="font-medium">Drop a photo here</span>{' '}
                <span className="text-muted-foreground">or click to upload</span>
              </p>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  <span className="text-foreground/80">Recommended:</span> 1500×2000 portrait (3:4),
                  head &amp; shoulders centered, plain background
                </p>
                <p>JPEG · PNG · WebP · AVIF · max 8 MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {value && !pending && (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground/80">Tip:</span> 1500×2000 portrait (3:4), head &amp;
          shoulders centered, plain background renders cleanly on every overlay.
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
