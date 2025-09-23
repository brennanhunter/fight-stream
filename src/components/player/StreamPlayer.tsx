'use client';

import { useState, useRef, useEffect } from 'react';

export default function StreamPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState('4K');
  const [showControls, setShowControls] = useState(true);
  const [currentTime] = useState(0);
  const [duration] = useState(0);
  const [isLive] = useState(true);
  const [viewerCount] = useState(47523);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const currentPlayerRef = playerRef.current;

    if (currentPlayerRef) {
      currentPlayerRef.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (currentPlayerRef) {
        currentPlayerRef.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value));
    setIsMuted(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const qualityOptions = ['4K', '1080p', '720p', '480p'];

  return (
    <section className="py-16 bg-background" id="stream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Live <span className="text-accent">Stream</span>
          </h2>
          <div className="flex items-center justify-center space-x-4 mb-6">
            {isLive && (
              <div className="flex items-center">
                <span className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></span>
                <span className="text-primary font-semibold">LIVE</span>
              </div>
            )}
            <span className="text-muted-foreground">
              {viewerCount.toLocaleString()} viewers
            </span>
          </div>
        </div>

        {/* Video Player */}
        <div 
          ref={playerRef}
          className="relative max-w-6xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl group"
          onMouseEnter={() => setShowControls(true)}
        >
          {/* Video Element */}
          <div className="relative aspect-video bg-black">
            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              poster="/api/placeholder/1920/1080"
            >
              {/* In a real implementation, you'd have actual video sources */}
              <source src="/path/to/4k-stream.m3u8" type="application/x-mpegURL" />
              <source src="/path/to/1080p-stream.m3u8" type="application/x-mpegURL" />
            </video>

            {/* Stream Placeholder (for demo) */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/90 to-primary/30 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l6-5-6-5z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Stream Starting Soon</h3>
                <p className="text-gray-300">The main event will begin shortly</p>
                <div className="mt-6 bg-black/50 rounded-lg p-4">
                  <p className="text-accent font-semibold">Next: Main Event Walkouts</p>
                  <p className="text-sm text-gray-300">Estimated time: 8:45 PM EST</p>
                </div>
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              
              {/* Top Controls */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  {isLive && (
                    <span className="bg-primary px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                      LIVE
                    </span>
                  )}
                  <span className="text-white text-sm">
                    {viewerCount.toLocaleString()} watching
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Quality Selector */}
                  <select 
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600"
                  >
                    {qualityOptions.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Center Play Button */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={togglePlay}
                    className="w-20 h-20 bg-accent/90 hover:bg-accent rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl"
                  >
                    <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5v10l6-5-6-5z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress Bar (for non-live content) */}
                {!isLive && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-600 rounded-full h-1">
                      <div 
                        className="bg-accent h-1 rounded-full transition-all"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Play/Pause */}
                    <button 
                      onClick={togglePlay}
                      className="text-white hover:text-accent transition-colors"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5v10l6-5-6-5z"/>
                        </svg>
                      )}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center space-x-2">
                      <button onClick={toggleMute} className="text-white hover:text-accent">
                        {isMuted || volume === 0 ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.795L4.894 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.894l3.489-2.795a1 1 0 011.617.795z"/>
                            <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.795L4.894 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.894l3.489-2.795a1 1 0 011.617.795zM12.707 7.293a1 1 0 010 1.414L11.414 10l1.293 1.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10 7.293 8.707a1 1 0 011.414-1.414L10 8.586l1.293-1.293a1 1 0 011.414 0z"/>
                          </svg>
                        )}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 accent-accent"
                      />
                    </div>

                    {/* Time Display */}
                    {!isLive && (
                      <span className="text-white text-sm">
                        {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Picture-in-Picture */}
                    <button className="text-white hover:text-accent transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2zm13.5 6a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3z"/>
                      </svg>
                    </button>

                    {/* Fullscreen */}
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-accent transition-colors"
                    >
                      {isFullscreen ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L6 7.414V9a1 1 0 002 0V4a1 1 0 00-1-1H3zm14 0a1 1 0 00-1 1v4a1 1 0 002 0V7.414l2.293 2.293a1 1 0 001.414-1.414L19.414 6H21a1 1 0 000-2h-4zM3 16a1 1 0 001-1v-1.586l2.293 2.293a1 1 0 001.414-1.414L5.414 12H7a1 1 0 000-2H3a1 1 0 00-1 1v4a1 1 0 001 1zm14-4a1 1 0 00-2 0v1.586l-2.293-2.293a1 1 0 00-1.414 1.414L13.586 15H12a1 1 0 000 2h4a1 1 0 001-1v-4z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Info */}
        <div className="max-w-6xl mx-auto mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-card-foreground mb-2">Stream Quality</h4>
            <p className="text-sm text-muted-foreground">
              Currently streaming in {quality} • Adaptive bitrate enabled
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-card-foreground mb-2">Connection</h4>
            <p className="text-sm text-muted-foreground">
              Excellent • Low latency mode active
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-card-foreground mb-2">Next Up</h4>
            <p className="text-sm text-muted-foreground">
              Main Event • Est. 8:45 PM EST
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}