'use client';

import { useState, useEffect } from 'react';

export default function Hero() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set fight date - you can change this to your actual fight date
    const fightDate = new Date('2025-12-31T20:00:00').getTime();

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
          {/* Left Column - Past Events */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-accent/20">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Past Events</h2>
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-lg p-4 border border-accent/10 hover:border-accent/30 transition-colors cursor-pointer">
                  <h3 className="text-white font-bold mb-1">Thunder at The Ritz</h3>
                  <p className="text-sm text-gray-400">October 5, 2025</p>
                  <p className="text-xs text-accent mt-2">Watch Replay →</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 border border-accent/10 hover:border-accent/30 transition-colors cursor-pointer">
                  <h3 className="text-white font-bold mb-1">Clash of Champions</h3>
                  <p className="text-sm text-gray-400">September 15, 2025</p>
                  <p className="text-xs text-accent mt-2">Watch Replay →</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 border border-accent/10 hover:border-accent/30 transition-colors cursor-pointer">
                  <h3 className="text-white font-bold mb-1">Battle Royale</h3>
                  <p className="text-sm text-gray-400">August 20, 2025</p>
                  <p className="text-xs text-accent mt-2">Watch Replay →</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Event Poster */}
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-accent/20">
              <img 
                src="/event-posters/havoc-hilton-poster.JPG" 
                alt="Havoc at Hilton Event Poster" 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative z-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-8">
        {/* CTA Buttons */}
          <button className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
            Buy PPV Access - $19.99
          </button>
      </div>
    </div>
  );
}