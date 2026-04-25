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

  // use-scramble: auto-plays scramble-in whenever `text` changes
  const { ref: nameRef, replay } = useScramble({
    text: state.fighter_name || 'FIGHTER NAME',
    speed: 0.65,
    tick: 2,
    step: 1,
    scramble: 8,
    seed: 3,
    chance: 0.9,
    range: [33, 126],
    overdrive: false,
  });

  useEffect(() => {
    if (!ready) return;
    setDisplayVisible(state.visible);
  }, [state.visible, ready]);

  // Re-scramble when a new fighter name comes in while visible
  useEffect(() => {
    if (displayVisible) replay();
  }, [state.fighter_name]); // eslint-disable-line react-hooks/exhaustive-deps

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
            initial={{ x: '-110%' }}
            animate={{ x: 0 }}
            exit={{ x: '-110%', transition: { duration: 0.25, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'absolute', bottom: '8%', left: 0, display: 'flex', flexDirection: 'column', filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.85))' }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.38, duration: 0.55, ease: 'easeOut' }}
              style={{ height: 2, background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.25))', transformOrigin: 'left', boxShadow: '0 0 12px rgba(255,255,255,0.7)' }}
            />
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ width: 6, flexShrink: 0, background: '#ffffff', boxShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 50px rgba(255,255,255,0.4)' }} />
              <div style={{ background: 'rgba(5, 5, 5, 0.95)', display: 'flex', alignItems: 'center', minWidth: '65vw' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.22, type: 'spring', stiffness: 350, damping: 22 }}
                  style={{ padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Image
                    src="/logos/BoxStreamThumbnail.png"
                    alt="BoxStreamTV"
                    width={80}
                    height={80}
                    priority
                    style={{ display: 'block', filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.45))' }}
                  />
                </motion.div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.15)', margin: '18px 0', flexShrink: 0 }} />
                <div style={{ padding: '22px 64px 22px 32px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', flex: 1 }}>
                  <motion.div
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.28, duration: 0.32, ease: 'easeOut' }}
                    style={{
                      fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
                      fontSize: 84,
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      animation: state.visible ? 'glowPulse 2.4s ease-in-out 0.72s 2' : undefined,
                    }}
                  >
                    <span ref={nameRef} />
                  </motion.div>
                  {state.visible && (
                    <motion.div
                      initial={{ x: '-150%' }}
                      animate={{ x: '400%' }}
                      transition={{ delay: 0.55, duration: 0.65, ease: 'easeInOut' }}
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)', transform: 'skewX(-12deg)', pointerEvents: 'none' }}
                    />
                  )}
                  {subline && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.28, ease: 'easeOut' }}
                      style={{ fontFamily: 'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif', fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}
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
