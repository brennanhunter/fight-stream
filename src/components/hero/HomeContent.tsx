'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
} as const;

const pastEvents = [
  {
    title: 'Night of Prospects 5',
    date: 'September 6, 2025',
    videoUrl: '/replays/night-of-prospects.mp4',
  },
  {
    title: 'Rumble at the Ritz II',
    date: 'August 23, 2025',
    videoUrl: '/replays/rumble-at-the-ritz.mp4',
  },
  {
    title: 'Apocalypto: The New Beginning',
    date: 'May 24, 2025',
    videoUrl: '/replays/apocolypto-the-new-beginning.mp4',
  },
];

export default function HomeContent() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <>
      {/* ════════════════════ MARQUEE ════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="bg-white text-black py-4 overflow-hidden select-none"
      >
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex items-center">
              {pastEvents.map((event, j) => (
                <span
                  key={j}
                  className="flex items-center text-sm font-bold tracking-[0.2em] uppercase mx-8"
                >
                  <span className="w-1.5 h-1.5 bg-black rounded-full mr-8 flex-shrink-0" />
                  {event.title}
                </span>
              ))}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ════════════════════ PAST EVENTS ════════════════════ */}
      <section id="past-events" className="bg-white text-black py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mb-14"
          >
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-3">
              Archive
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Past Events
            </h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              style={{ originX: 0 }}
              className="w-16 h-[2px] bg-black mt-6"
            />
          </motion.div>

          {/* Video Player */}
          {selectedVideo && (
            <div className="mb-12 overflow-hidden border border-black/10 bg-black fade-in-up">
              <div className="relative">
                <video
                  key={selectedVideo}
                  controls
                  autoPlay
                  className="w-full h-auto"
                >
                  <source src={selectedVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 text-sm font-bold tracking-wider transition-colors z-10"
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>
          )}

          {/* Event Cards */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {pastEvents.filter((e) => e.videoUrl).map((event, index) => (
              <motion.div key={index} variants={fadeUp}>
              <button
                key={index}
                onClick={() => setSelectedVideo(event.videoUrl)}
                className={`group text-left border transition-all duration-300 p-6 ${
                  selectedVideo === event.videoUrl
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/10 hover:border-black'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-bold tracking-[0.2em] uppercase ${
                      selectedVideo === event.videoUrl
                        ? 'text-gray-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {event.date}
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all ${
                      selectedVideo === event.videoUrl
                        ? 'bg-white text-black border-white'
                        : 'border-black/20 group-hover:bg-black group-hover:text-white group-hover:border-black'
                    }`}
                  >
                    ▶
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {event.title}
                </h3>
                <p
                  className={`text-xs mt-3 font-bold tracking-[0.15em] uppercase ${
                    selectedVideo === event.videoUrl
                      ? 'text-gray-300'
                      : 'text-gray-400'
                  }`}
                >
                  {selectedVideo === event.videoUrl
                    ? 'Now Playing'
                    : 'Watch Highlights'}
                </p>
              </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

    </>
  );
}
