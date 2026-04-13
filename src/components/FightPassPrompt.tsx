'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const STORAGE_KEY = 'fight_pass_prompt_seen';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FightPassPromptProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/** Returns true if the user has dismissed this prompt within the last 24 hours. */
export function hasSeenFightPassPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  const ts = localStorage.getItem(STORAGE_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < EXPIRY_MS;
}

/** Mark the prompt as seen — expires after 24 hours. */
export function markFightPassPromptSeen(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleContinue = () => {
    markFightPassPromptSeen();
    onContinue();
  };

  return (
    <AnimatePresence>
    {open && (
    <motion.div
      ref={backdropRef}
      role="presentation"
      onClick={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fightpass-prompt-title"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-black border border-white/20 max-w-[calc(100vw-24px)] sm:max-w-md w-full p-8 space-y-6"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          autoFocus
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
          <h2 id="fightpass-prompt-title" className="text-2xl font-bold text-white">Have You Seen Fight Pass?</h2>
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
            className="block w-full text-center bg-white text-black font-bold py-3 text-xs sm:text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
          >
            View Fight Pass Plans
          </Link>
          <button
            onClick={handleContinue}
            className="w-full text-center border border-white/30 text-white font-bold py-3 text-xs sm:text-sm tracking-[0.15em] uppercase transition-colors hover:border-white hover:bg-white/5"
          >
            Continue to Checkout
          </button>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
