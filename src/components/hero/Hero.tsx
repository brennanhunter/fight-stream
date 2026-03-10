'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Hero() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
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
    {
      title: 'Havoc at the Hilton 3',
      date: '',
      videoUrl: '',
    },
  ];

  return (
    <>
      {/* ════════════════════ HERO ════════════════════ */}
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
            <div className="space-y-8">
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
            </div>

            {/* ── Right: Poster Carousel ── */}
            <div className="relative h-[400px] md:h-[520px] lg:h-[600px]">
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
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ MARQUEE ════════════════════ */}
      <div className="bg-white text-black py-4 overflow-hidden select-none">
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
      </div>

      {/* ════════════════════ PAST EVENTS ════════════════════ */}
      <section className="bg-white text-black py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-14">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-3">
              Archive
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Past Events
            </h2>
            <div className="w-16 h-[2px] bg-black mt-6" />
          </div>

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pastEvents.filter((e) => e.videoUrl).map((event, index) => (
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
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ STATS ════════════════════ */}
      <section className="bg-black text-white py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: 'Wireless', label: 'Multi-Camera Coverage' },
              { number: 'Simple', label: 'Watch Directly on Platform' },
              { number: 'HD', label: 'Stream Quality' },
              { number: '24/7', label: 'VOD Access' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold tracking-tight">
                  {stat.number}
                </div>
                <div className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}