'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
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

  useEffect(() => {
    // Fetch initial state on mount
    fetch('/api/overlay/lower-third')
      .then((r) => r.json())
      .then((data: LowerThirdState) => {
        setState(data);
        setReady(true);
      })
      .catch(() => setReady(true));

    // Subscribe to Supabase Realtime for instant updates
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('lower_third_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lower_third_state' },
        (payload) => {
          setState(payload.new as LowerThirdState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subline = [state.record, state.weight_class].filter(Boolean).join('   ·   ');

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {ready && state.visible && (
          <motion.div
            key="lower-third"
            initial={{ x: '-110%' }}
            animate={{ x: 0 }}
            exit={{ x: '-110%', transition: { duration: 0.28, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 270, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: '9%',
              left: 0,
              display: 'flex',
              alignItems: 'stretch',
              filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.7))',
            }}
          >
            {/* Left accent bar */}
            <div
              style={{
                width: 5,
                flexShrink: 0,
                background: '#ffffff',
                boxShadow: '0 0 16px rgba(255,255,255,0.9), 0 0 32px rgba(255,255,255,0.4)',
              }}
            />

            {/* Main bar */}
            <div
              style={{
                background: 'rgba(7, 7, 7, 0.94)',
                display: 'flex',
                alignItems: 'center',
                backdropFilter: 'blur(3px)',
              }}
            >
              {/* Logo block */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 24 }}
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Image
                  src="/logos/BoxStreamThumbnail.png"
                  alt="BoxStreamTV"
                  width={62}
                  height={62}
                  priority
                  style={{
                    display: 'block',
                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.35))',
                  }}
                />
              </motion.div>

              {/* Vertical divider */}
              <div
                style={{
                  width: 1,
                  alignSelf: 'stretch',
                  background: 'rgba(255,255,255,0.16)',
                  margin: '14px 0',
                  flexShrink: 0,
                }}
              />

              {/* Text block */}
              <div
                style={{
                  padding: '18px 40px 18px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                {/* Fighter name */}
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.26, duration: 0.32, ease: 'easeOut' }}
                  style={{
                    fontFamily:
                      'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
                    fontSize: 52,
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    animation: 'glowPulse 2.2s ease-in-out 0.62s 2',
                  }}
                >
                  {state.fighter_name || 'FIGHTER NAME'}
                </motion.div>

                {/* Record · Weight class */}
                {subline && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.38, duration: 0.28, ease: 'easeOut' }}
                    style={{
                      fontFamily:
                        'var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
                      fontSize: 19,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.62)',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subline}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
