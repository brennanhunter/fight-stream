'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useOverlay } from '@/lib/use-overlay';

type PromoterLogoPayload = {
  event_id?: string;
  url?: string;
};

export default function PromoterLogoDisplay() {
  const { visible, payload, loading } = useOverlay<PromoterLogoPayload>('promoter_logo');
  const show = !loading && visible && !!payload.url;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key="promoter-logo"
            initial={{ y: '-110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-110%', opacity: 0, transition: { duration: 0.24, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 1, delay: 0.05 }}
            style={{
              position: 'absolute',
              top: '4vh',
              left: '14vw',
              padding: '12px 18px',
              background: 'rgba(4, 4, 4, 0.92)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(255,255,255,0.05), inset 0 0 1px rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {/* Promoter URLs come from arbitrary external sources — using <img>
                instead of next/image so we don't need to whitelist every host. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payload.url}
              alt="Promoter"
              style={{
                display: 'block',
                height: '56px',
                width: 'auto',
                maxWidth: '180px',
                objectFit: 'contain',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
