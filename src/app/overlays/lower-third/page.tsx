'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useScramble } from 'use-scramble';
import { createBrowserClient } from '@/lib/supabase';

interface LowerThirdState {
  fighter_name: string;
  record: string;
  weight_class: string;
  visible: boolean;
}

const DEFAULT_STATE: LowerThirdState = {
  fighter_name: '',
  record: '',
  weight_class: '',
  visible: false,
};

export default function LowerThirdDisplay() {
  const [state, setState] = useState<LowerThirdState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [displayVisible, setDisplayVisible] = useState(false);
  // Changing this text is what triggers use-scramble to animate
  const [scrambleText, setScrambleText] = useState('');

  const { ref: nameRef } = useScramble({
    text: scrambleText,
    speed: 0.45,
    tick: 1,
    step: 2,
    scramble: 14,
    seed: 5,
    chance: 1,
    range: [65, 90], // A–Z only — looks clean on broadcast
    overdrive: false,
  });

  useEffect(() => {
    if (!ready) return;
    if (state.visible) {
      setDisplayVisible(true);
      // Delay the name scramble so the bar slides in first
      const t = setTimeout(() => setScrambleText(state.fighter_name), 280);
      return () => clearTimeout(t);
    } else {
      setDisplayVisible(false);
      setScrambleText('');
    }
  }, [state.visible, state.fighter_name, ready]);

  useEffect(() => {
    fetch('/api/overlay/lower-third')
      .then((r) => r.json())
      .then((data: LowerThirdState) => {
        setState(data);
        setReady(true);
      })
      .catch(() => setReady(true));

    const supabase = createBrowserClient();
    const channel = supabase
      .channel('lower_third_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lower_third_state' },
        (payload) => { setState(payload.new as LowerThirdState); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const subline = [state.record, state.weight_class].filter(Boolean).join('   \u00b7   ');

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'transparent', overflow: 'hidden' }}>
      <AnimatePresence>
        {ready && displayVisible && (
          <motion.div
            key="lower-third"
            initial={{ x: '-115%' }}
            animate={{ x: 0 }}
            exit={{ x: '-115%', transition: { duration: 0.16, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            style={{ position: 'absolute', bottom: '8%', left: 0, display: 'flex', flexDirection: 'column', filter: 'drop-shadow(0 12px 60px rgba(0,0,0,0.92))' }}
          >
            {/* Top accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.28, duration: 0.5, ease: 'easeOut' }}
              style={{ height: 3, background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.18))', transformOrigin: 'left', boxShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 50px rgba(255,255,255,0.35)' }}
            />
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Left glow bar */}
              <div style={{ width: 8, flexShrink: 0, background: '#ffffff', boxShadow: '0 0 30px rgba(255,255,255,1), 0 0 80px rgba(255,255,255,0.55)' }} />
              <div style={{ background: 'rgba(4, 4, 4, 0.97)', display: 'flex', alignItems: 'center', minWidth: '65vw' }}>
                {/* Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.45 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.16, type: 'spring', stiffness: 450, damping: 22 }}
                  style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Image
                    src="/logos/BoxStreamThumbnail.png"
                    alt="BoxStreamTV"
                    width={88}
                    height={88}
                    priority
                    style={{ display: 'block', filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.6))' }}
                  />
                </motion.div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.18)', margin: '16px 0', flexShrink: 0 }} />
                {/* Text block */}
                <div style={{ padding: '24px 72px 24px 36px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', flex: 1 }}>
                  {/* Fighter name — written by use-scramble */}
                  <div
                    ref={nameRef}
                    style={{
                      fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
                      fontSize: 96,
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      minHeight: '1em',
                      animation: state.visible ? 'glowPulse 2.4s ease-in-out 0.9s 2' : undefined,
                    }}
                  />
                  {/* Shimmer sweep */}
                  {state.visible && (
                    <motion.div
                      initial={{ x: '-150%' }}
                      animate={{ x: '500%' }}
                      transition={{ delay: 0.62, duration: 0.72, ease: 'easeInOut' }}
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '28%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.22), transparent)', transform: 'skewX(-12deg)', pointerEvents: 'none' }}
                    />
                  )}
                  {/* Record · Weight class */}
                  {subline && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.52, duration: 0.3, ease: 'easeOut' }}
                      style={{ fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif', fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}
                    >
                      {subline}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
