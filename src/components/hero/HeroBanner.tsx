'use client';

import { useState, useEffect } from 'react';

export default function HeroBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const pastEvents = [
    {
      title: "Rumble at The Ritz",
      date: "October 5, 2025",
      videoUrl: "/replays/rumble-at-the-ritz.mp4"
    },
    {
      title: "Night of Prospects",
      date: "September 15, 2025",
      videoUrl: "/replays/night-of-prospects.mp4"
    },
    {
      title: "Apocolypto: The New Beginning",
      date: "August 20, 2025",
      videoUrl: "/replays/apocolypto-the-new-beginning.mp4"
    }
  ];

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
      
      {/* Logo Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
        <div className="flex justify-center">
          <img 
            src="/logos/logo-white-text.png" 
            alt="FightStream Logo" 
            className="h-32 md:h-40 w-auto"
          />
        </div>
        {/* Debug info - remove after testing */}
        {selectedVideo && (
          <div className="text-white text-sm mt-2">
            Selected: {selectedVideo}
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Past Events */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-accent/20">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Past Events</h2>
              <div className="space-y-4">
                {pastEvents.map((event, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      console.log('Clicked:', event.title, event.videoUrl);
                      setSelectedVideo(event.videoUrl);
                    }}
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

          {/* Right Column - Event Poster or Video Player */}
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-accent/20 bg-black">
              {selectedVideo ? (
                <div className="relative aspect-video">
                  <video 
                    key={selectedVideo}
                    controls 
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    <source src={selectedVideo} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
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
          </div>
        </div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-8">
        <div className="mb-8">
          
          {/* <div className="w-32 h-1 bg-accent mx-auto mb-6"></div>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Championship Boxing • Live Pay-Per-View Event
          </p> */}
        </div>

        {/* Fighter Matchup */}
        {/* <div className="mb-12 bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/70 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">JD</span>
              </div>
              <h3 className="text-2xl font-bold text-white">John &quot;Thunder&quot; Davis</h3>
              <p className="text-accent font-semibold">Champion • 28-0-0</p>
              <p className="text-gray-300">Heavyweight Division</p>
            </div>

            <div className="text-center">
              <div className="text-6xl font-bold text-accent mb-4">VS</div>
              <p className="text-white text-lg">December 31, 2025</p>
              <p className="text-gray-300">8:00 PM EST</p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-accent to-accent/70 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl font-bold text-black">MR</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Mike &quot;Iron Fist&quot; Rodriguez</h3>
              <p className="text-accent font-semibold">Challenger • 26-2-0</p>
              <p className="text-gray-300">Heavyweight Division</p>
            </div>
          </div>
        </div> */}

        {/* Countdown Timer */}
        {/* <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Fight Starts In:</h2>
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds }
            ].map((time, index) => (
              <div key={index} className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-accent/30">
                <div className="text-4xl md:text-5xl font-bold text-accent mb-2">
                  {time.value.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-300 uppercase tracking-wide">
                  {time.label}
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
            Buy PPV Access - $19.99
          </button>
          <button className="bg-accent hover:bg-accent/90 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
            Watch Trailer
          </button>
        </div>

        {/* Live Badge */}
        {/* <div className="mt-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/20 border border-primary text-primary font-semibold">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
            Live December 31st
          </span>
        </div> */}
      </div>
    </div>
  );
}