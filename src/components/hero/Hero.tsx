'use client';

import { useState, useEffect } from 'react';

export default function Hero() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const pastEvents = [
    {
      title: "Night of Prospects 5",
      date: "September 6, 2025",
      videoUrl: "/replays/night-of-prospects.mp4"
    },
    {
      title: "Rumble at the Ritz II",
      date: "August 23, 2025",
      videoUrl: "/replays/rumble-at-the-ritz.mp4"
    },
    {
      title: "Apocalypto: The New Beginning",
      date: "May 24, 2025",
      videoUrl: "/replays/apocolypto-the-new-beginning.mp4"
    }
  ];

  useEffect(() => {
    // Set fight date - November 8th, 2025 at 6:00 PM EST
    const fightDate = new Date('2025-11-08T18:00:00-05:00').getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = fightDate - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative bg-gradient-to-r from-secondary via-secondary/90 to-primary/20 py-8 md:py-12 overflow-hidden min-h-[80vh] flex flex-col justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-repeat bg-[length:60px_60px]" 
             style={{backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%23ffffff\" fill-opacity=\"0.05\"><circle cx=\"7\" cy=\"7\" r=\"1\"/></g></g></svg>')"}}></div>
      </div>

      {/* Two Column Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Past Events (order-2 on mobile, order-1 on desktop) */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-accent/20">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Past Events</h2>
              <div className="space-y-4">
                {pastEvents.map((event, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedVideo(event.videoUrl)}
                    className={`bg-secondary/50 rounded-lg p-4 border transition-colors cursor-pointer ${
                      selectedVideo === event.videoUrl 
                        ? 'border-accent bg-accent/10' 
                        : 'border-accent/10 hover:border-accent/30'
                    }`}
                  >
                    <h3 className="text-white font-bold mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-400">{event.date}</p>
                    <p className="text-xs text-accent mt-2">
                      {selectedVideo === event.videoUrl ? '▶ Playing Now' : 'Watch Replay →'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Video Player or Social Icons (order-1 on mobile, order-2 on desktop) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {selectedVideo ? (
              /* Video Player */
              <div className="rounded-xl overflow-hidden shadow-2xl border border-accent/20 bg-black">
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
                    className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors z-10"
                  >
                    ✕ Close Video
                  </button>
                </div>
              </div>
            ) : (
              /* Social Media Icons - Centered */
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex gap-8">
                  {/* Instagram Link */}
                  <a
                    href="https://www.instagram.com/boxstreamtv/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 hover:rotate-6"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                    <svg className="relative w-10 h-10 md:w-12 md:h-12 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  
                  {/* YouTube Link */}
                  <a
                    href="https://www.youtube.com/@BoxStreamTV"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-red-600 via-red-500 to-red-600 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 hover:-rotate-6"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-600 rounded-3xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                    <svg className="relative w-10 h-10 md:w-12 md:h-12 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
            )}
            
            {/* Countdown Timer - Touching bottom of poster */}
            {/* <div className="bg-gradient-to-r from-primary/90 via-red-600/90 to-primary/90 backdrop-blur-md border-2 border-red-500/50 shadow-2xl rounded-xl mt-1">
              <div className="px-4 py-4 md:px-6 md:py-5">
                <div className="text-center mb-2">
                  <p className="text-white font-bold text-sm md:text-base tracking-wider uppercase">
                    Event Starts In
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-xl mx-auto">
                  <div className="text-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-red-500/30 shadow-lg">
                      <div className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                        {timeLeft.days}
                      </div>
                      <div className="text-xs md:text-sm text-red-200 font-medium mt-1">
                        Days
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-red-500/30 shadow-lg">
                      <div className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                        {timeLeft.hours}
                      </div>
                      <div className="text-xs md:text-sm text-red-200 font-medium mt-1">
                        Hours
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-red-500/30 shadow-lg">
                      <div className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                        {timeLeft.minutes}
                      </div>
                      <div className="text-xs md:text-sm text-red-200 font-medium mt-1">
                        Minutes
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-red-500/30 shadow-lg">
                      <div className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                        {timeLeft.seconds}
                      </div>
                      <div className="text-xs md:text-sm text-red-200 font-medium mt-1">
                        Seconds
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}