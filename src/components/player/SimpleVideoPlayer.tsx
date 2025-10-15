'use client';

import { useState, useRef } from 'react';

export default function SimpleVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        ref={playerRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-lg group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Element */}
        <div className="relative aspect-video bg-black">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            poster="/api/placeholder/1920/1080"
          >
            {/* Placeholder for actual video sources */}
          </video>

          {/* Stream Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/90 to-primary/30 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Stream Inactive</h3>
            </div>
          </div>



          {/* Play Button Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={togglePlay}
                className="w-16 h-16 bg-accent hover:bg-accent/90 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
              >
                <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l6-5-6-5z"/>
                </svg>
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button 
                  onClick={togglePlay}
                  className="text-white hover:text-accent transition-colors p-1"
                  title={isPlaying ? "Pause" : "Play"}
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
                  <button 
                    onClick={toggleMute} 
                    className="text-white hover:text-accent transition-colors p-1"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.795L4.894 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.894l3.489-2.795a1 1 0 011.617.795z"/>
                        <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.795L4.894 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.894l3.489-2.795a1 1 0 011.617.795z"/>
                        <path d="M11.293 7.293a1 1 0 011.414 0 5.5 5.5 0 010 7.778 1 1 0 01-1.414-1.415 3.5 3.5 0 000-4.95 1 1 0 010-1.414z"/>
                        <path d="M13.657 5.657a1 1 0 011.414 0 9.5 9.5 0 010 13.436 1 1 0 01-1.414-1.415 7.5 7.5 0 000-10.607 1 1 0 010-1.414z"/>
                      </svg>
                    )}
                  </button>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-2 bg-gray-600 rounded-lg accent-accent cursor-pointer"
                    title="Volume"
                  />
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                {/* Quality Indicator */}
                <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                  HD
                </span>

                {/* Fullscreen */}
                <button 
                  onClick={toggleFullscreen}
                  className="text-white hover:text-accent transition-colors p-1"
                  title="Fullscreen"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L6 7.414V9a1 1 0 002 0V4a1 1 0 00-1-1H3zm14 0a1 1 0 00-1 1v4a1 1 0 002 0V7.414l2.293 2.293a1 1 0 001.414-1.414L19.414 6H21a1 1 0 000-2h-4zM3 16a1 1 0 001-1v-1.586l2.293 2.293a1 1 0 001.414-1.414L5.414 12H7a1 1 0 000-2H3a1 1 0 00-1 1v4a1 1 0 001 1zm14-4a1 1 0 00-2 0v1.586l-2.293-2.293a1 1 0 00-1.414 1.414L13.586 15H12a1 1 0 000 2h4a1 1 0 001-1v-4z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Info Bar */}
      <div className="mt-4 text-center">

      </div>
    </div>
  );
}