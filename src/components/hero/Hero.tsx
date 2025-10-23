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
      title: "Night of Prospects",
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
            {/* Flashy Buy PPV Button */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-red-600 to-primary rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <button className="relative w-full bg-gradient-to-r from-primary to-black hover:from-black hover:to-primary text-white font-bold py-6 px-6 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-primary/50">
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-normal opacity-90">Havoc at Hilton</div>
                    <div className="text-xl font-black tracking-wide">BUY PPV NOW</div>
                    <div className="text-lg font-bold text-red-400">$21.99</div>
                  </div>
                  <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                  </svg>
                </span>
              </button>
            </div>
            
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

          {/* Right Column - Event Poster (order-1 on mobile, order-2 on desktop) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-accent/20 bg-black">
              {selectedVideo ? (
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
              ) : (
                <img 
                  src="/event-posters/havoc-hilton-poster.JPG" 
                  alt="Havoc at Hilton Event Poster" 
                  className="w-full h-auto object-cover"
                />
              )}
            </div>
            
            {/* Countdown Timer - Touching bottom of poster */}
            <div className="bg-gradient-to-r from-primary/90 via-red-600/90 to-primary/90 backdrop-blur-md border-2 border-red-500/50 shadow-2xl rounded-xl mt-1">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}