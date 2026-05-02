'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useOverlay } from '@/lib/use-overlay';

export default function LogoDisplay() {
  const { visible, loading } = useOverlay('logo');
  const show = !loading && visible;

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
            key="logo"
            initial={{ y: '-110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-110%', opacity: 0, transition: { duration: 0.24, ease: [0.6, 0, 1, 0.4] } }}
            transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 1 }}
            style={{
              position: 'absolute',
              top: '4vh',
              left: '4vw',
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
            <Image
              src="/logos/BoxStreamThumbnail.png"
              alt="BoxStreamTV"
              width={56}
              height={56}
              priority
              style={{ display: 'block' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
