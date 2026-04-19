'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const widthGrow = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const carouselImages = [
    '/event-posters/evo.jpg',
    '/new-event-posters-Dec/Black and Gold Bold Boxing Match Poster (1).png',
    '/new-event-posters-Dec/MAINE (1).png',
    '/new-event-posters-Dec/MAINE (3).png',
    '/new-event-posters-Dec/RITZ THEATER SANFORD, FLA.png',
    '/new-event-posters-Dec/SKIPPY ANDRADE (4).png',
    '/new-event-posters-Dec/SKIPPY ANDRADE (8).png',
    '/new-event-posters-Dec/Black and Gold Bold Boxing Match Poster (40).png',
    '/new-event-posters-Dec/Daniel.png',
    '/new-event-posters-Dec/King219.png',
    '/new-event-posters-Dec/Skippy.png',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  return (
      <section className="relative min-h-screen bg-black text-white overflow-hidden flex items-center">
        {/* Noise texture */}
        <div className="noise-overlay" />

        {/* Ring rope lines */}
        <div className="ring-ropes absolute inset-0" />
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: '50%' }}
        >
          <div className="h-px bg-white opacity-[0.07]" />
        </div>

        {/* Soft radial glow behind poster area */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none hidden lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* ── Left: Typography ── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[0.9] tracking-[-0.03em]"
              >
                <span className="block">EVERY</span>
                <span className="block">FIGHT.</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-600">
                  LIVE.
                </span>
              </motion.h1>

              <p className="sr-only">
                BoxStreamTV — live boxing streaming and pay-per-view events. Watch professional, amateur, and youth boxing online in HD.
              </p>

              <motion.div variants={widthGrow} className="w-16 h-[2px] bg-white" />

              <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-md leading-relaxed">
                Professional boxing, streamed ringside to your screen.
                Live PPV events and full-fight replays on demand.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/vod"
                  className="group bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                >

                  Watch Now
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
                <Link
                  href="/work-with-us"
                  className="border border-white/30 text-white font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-all hover:border-white hover:bg-white/5"
                >
                  For Promoters
                </Link>
              </motion.div>

              <motion.a
                variants={fadeUp}
                href="https://www.instagram.com/boxstreamtv/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
                Follow @boxstreamtv for upcoming events
              </motion.a>
            </motion.div>

            {/* ── Right: Poster Carousel ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="relative h-[400px] md:h-[520px] lg:h-[600px]"
            >
              <div className="relative h-full w-full overflow-hidden border border-white/10">
                {carouselImages.map((image, index) => (
                  <div
                    key={image}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Event poster ${index + 1}`}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                ))}
              </div>

              {/* Indicators */}
              <div className="flex justify-center mt-4 gap-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? 'bg-white w-8'
                        : 'bg-white/25 w-4 hover:bg-white/50'
                    }`}
                    aria-label={`Go to poster ${index + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
  );
}