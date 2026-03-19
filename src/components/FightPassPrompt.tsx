'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'fight_pass_prompt_seen';

interface FightPassPromptProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/** Returns true if the user has already dismissed this prompt. */
export function hasSeenFightPassPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

/** Mark the prompt as seen so it won't show again. */
export function markFightPassPromptSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1');
}

export default function FightPassPrompt({ open, onClose, onContinue }: FightPassPromptProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleContinue = () => {
    markFightPassPromptSeen();
    onContinue();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative bg-black border border-white/20 max-w-md w-full p-8 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-amber-400">Save on Every Event</p>
          <h2 className="text-2xl font-bold text-white">Have You Seen Fight Pass?</h2>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed">
          Create a free account and subscribe to <span className="text-white font-semibold">Fight Pass</span> to
          unlock the full VOD library and save up to <span className="text-white font-semibold">100%</span> on
          every PPV event.
        </p>

        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">✦</span>
            <span><span className="text-white font-medium">Basic</span> — Full VOD library + 25% off PPV</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">✦</span>
            <span><span className="text-white font-medium">Premium</span> — Everything in Basic + free PPV</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Link
            href="/pricing"
            className="block w-full text-center bg-white text-black font-bold py-3 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
          >
            View Fight Pass Plans
          </Link>
          <button
            onClick={handleContinue}
            className="w-full text-center border border-white/30 text-white font-bold py-3 text-sm tracking-[0.15em] uppercase transition-colors hover:border-white hover:bg-white/5"
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
