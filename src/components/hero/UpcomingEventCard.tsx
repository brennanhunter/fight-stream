'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
} as const;

const widthGrow = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

function getTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

interface UpcomingEventCardProps {
  eventName: string;
  eventDate: string;
  posterImage: string | null;
}

export default function UpcomingEventCard({ eventName, eventDate, posterImage }: UpcomingEventCardProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(eventDate));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeRemaining(eventDate)), 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  if (!timeLeft) return null;

  return (
    <section className="relative bg-black text-white py-20 overflow-hidden">
      {/* Subtle background poster */}
      {posterImage && (
        <div className="absolute inset-0">
          <Image src={posterImage} alt={eventName} fill className="object-cover opacity-10 blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Event Info + Countdown */}
          <motion.div
            className="space-y-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div variants={fadeUp}>
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400">Coming Soon</p>
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[0.95] tracking-[-0.03em]">
              {eventName}
            </motion.h2>

            <motion.div variants={widthGrow} className="w-16 h-[2px] bg-white" />

            <motion.p variants={fadeUp} className="text-gray-400 text-lg">
              {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </motion.p>

            {/* Countdown */}
            <motion.div variants={fadeUp}>
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Event Starts In</p>
              <div className="flex gap-4">
                {[
                  { value: timeLeft.days, label: 'Days' },
                  { value: timeLeft.hours, label: 'Hours' },
                  { value: timeLeft.minutes, label: 'Min' },
                  { value: timeLeft.seconds, label: 'Sec' },
                ].map((unit) => (
                  <div key={unit.label} className="text-center">
                    <div className="bg-white/[0.05] border border-white/10 backdrop-blur-sm px-4 py-3 min-w-[72px]">
                      <span className="text-3xl sm:text-4xl font-bold tabular-nums">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mt-2 block">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pre-buy message */}
            <motion.div variants={fadeUp}>
              <button
                className="group bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
              >
                Get PPV Access
              </button>
            </motion.div>
          </motion.div>

          {/* Right: Poster */}
          {posterImage && (
            <motion.div
              className="relative h-[350px] md:h-[450px] lg:h-[500px]"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            >
              <div className="relative h-full w-full overflow-hidden border border-white/10">
                <Image src={posterImage} alt={eventName} fill className="object-contain bg-black" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
