'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

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
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="space-y-8"
            >
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[0.9] tracking-[-0.03em]">
                EVERY
                <br />
                FIGHT.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-600">
                  LIVE.
                </span>
              </h1>

              <div className="w-16 h-[2px] bg-white" />

              <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                Professional boxing, streamed ringside to your screen.
                Live PPV events and full-fight replays on demand.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
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
                  href="/about"
                  className="border border-white/30 text-white font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-all hover:border-white hover:bg-white/5"
                >
                  Learn More
                </Link>
              </div>
            </motion.div>

            {/* ── Right: Poster Carousel ── */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
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