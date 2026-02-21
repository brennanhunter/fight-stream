'use client';

import { useState, useEffect } from 'react';
import PaymentModal from '@/components/payment/PaymentModal';

export default function Hero() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const carouselImages = [
    '/event-posters/fight-announcement.jpg',
    '/event-posters/rumble-3.jpg',
    '/event-posters/evo.jpg',
    '/new-event-posters-Dec/Black and Gold Bold Boxing Match Poster (1).png',
    '/new-event-posters-Dec/Black and Gold Bold Boxing Match Poster.png',
    '/new-event-posters-Dec/MAINE (1).png',
    '/new-event-posters-Dec/MAINE (3).png',
    '/new-event-posters-Dec/RITZ THEATER SANFORD, FLA.png',
    '/new-event-posters-Dec/SKIPPY ANDRADE (4).png',
    '/new-event-posters-Dec/SKIPPY ANDRADE (8).png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [carouselImages.length]);
  
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

  return (
    <>
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
      
      <div className="relative bg-gradient-to-r from-secondary via-secondary/90 to-primary/20 py-8 md:py-12 overflow-hidden min-h-0 lg:min-h-[80vh] flex flex-col justify-center">
        {/* Carousel Background - Full Section (visible on desktop) */}
        <div className="absolute inset-0 z-0 hidden lg:block">
          {carouselImages.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="w-full h-full flex justify-end items-center pr-0 lg:pr-8">
                <img
                  src={image}
                  alt={`Event poster ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          ))}
          {/* Dark overlay for better content readability */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 z-0 hidden lg:block">
        <div className="w-full h-full bg-repeat bg-[length:60px_60px]" 
             style={{backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%23ffffff\" fill-opacity=\"0.05\"><circle cx=\"7\" cy=\"7\" r=\"1\"/></g></g></svg>')"}}></div>
      </div>

      {/* Logo - Top Left */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-8">
        <img 
          src="/logos/BoxStreamVerticalLogo.png" 
          alt="BoxStream TV" 
          className="h-[120px] md:h-[150px] w-auto" 
        />
      </div>

      {/* Two Column Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Past Events (order-3 on mobile, order-1 on desktop) */}
          <div className="lg:col-span-1 space-y-6 order-3 lg:order-1">
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
                      {selectedVideo === event.videoUrl ? '▶ Playing Now' : 'Watch Highlights →'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carousel Section - Only visible on mobile (order-2 on mobile, hidden on desktop) */}
          <div className="lg:hidden order-2 w-full">
            <div className="relative h-[400px] rounded-xl overflow-hidden border-2 border-accent/30">
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
                    className="w-full h-full object-contain bg-black/80"
                  />
                </div>
              ))}
            </div>
            {/* Mobile Carousel indicators */}
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-accent w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Video Player or Empty Space (order-1 on mobile, order-2 on desktop) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {/* Purchase Button - Shows when no video selected */}
            {/* {!selectedVideo && (
              <div className="flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
                <div className="text-center space-y-6 px-6 bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-accent/20">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Watch <span className="text-accent">Live Boxing</span>
                  </h2>
                  <p className="text-white text-lg mb-6 max-w-md mx-auto">
                    Stay tuned for our next event. Get PPV access for the biggest fights live in HD.
                  </p>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl"
                  >
                    Buy PPV Access - $4.99
                  </button>
                </div>
              </div>
            )} */}
            
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
            ) : null}
            
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

        {/* Carousel indicators - Desktop only */}
        <div className="relative z-10 hidden lg:flex justify-center mt-6">
          <div className="flex space-x-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'bg-accent w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}