'use client';

import { useEffect, useRef, useState } from 'react';

// Declare IVS Player types
declare global {
  interface Window {
    IVSPlayer: {
      isPlayerSupported: boolean;
      create: () => IVSPlayerInstance;
      PlayerState: {
        PLAYING: string;
        IDLE: string;
        READY: string;
      };
      PlayerEventType: {
        ERROR: string;
      };
    };
  }
}

interface IVSPlayerInstance {
  attachHTMLVideoElement: (element: HTMLVideoElement) => void;
  load: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  setVolume: (volume: number) => void;
  addEventListener: (event: string, callback: (error?: { code?: number }) => void) => void;
  delete: () => void;
}

export default function IVSVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<IVSPlayerInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStreamLive, setIsStreamLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showControls, setShowControls] = useState(true);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load IVS Player script
  useEffect(() => {
    // Check if already loaded
    if (window.IVSPlayer) {
      setPlayerLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://player.live-video.net/1.26.0/amazon-ivs-player.min.js';
    script.async = true;
    script.onload = () => {
      console.log('IVS Player script loaded');
      setPlayerLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load IVS Player script');
      setError('Failed to load video player');
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Fetch token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/generate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const data = await response.json();
        setToken(data.token);
        setPlaybackUrl(data.playbackUrl);
      } catch (err) {
        setError('Failed to load stream');
        setIsLoading(false);
        console.error('Token fetch error:', err);
      }
    };

    fetchToken();
  }, []);

  // Initialize IVS player when everything is ready
  useEffect(() => {
    if (!playerLoaded || !token || !playbackUrl || !videoRef.current) return;

    // Declare these at effect scope so cleanup can access them
    let streamHealthCheck: NodeJS.Timeout | null = null;
    let handleTimeUpdate: (() => void) | null = null;

    const initPlayer = () => {
      try {
        const { IVSPlayer } = window;
        
        if (!IVSPlayer) {
          setError('Player not available');
          setIsLoading(false);
          return;
        }

        if (!IVSPlayer.isPlayerSupported) {
          setError('Browser not supported');
          setIsLoading(false);
          return;
        }

        const player = IVSPlayer.create();
        playerRef.current = player;
        
        if (videoRef.current) {
          player.attachHTMLVideoElement(videoRef.current);
          
          // Set initial volume on video element
          videoRef.current.volume = 0.75;
          videoRef.current.muted = false;
          
          videoRef.current.addEventListener('ended', () => {
            setIsStreamLive(false);
            setIsPlaying(false);
          });
        }

        setError(null);
        player.load(playbackUrl);
        
        // Monitor video element's timeupdate event for stream health
        // This is a real signal - if time stops updating, stream is dead
        let lastTimeUpdate = Date.now();
        let shouldBeStreaming = false; // Track if we expect stream to be active
        
        handleTimeUpdate = () => {
          if (videoRef.current) {
            lastTimeUpdate = Date.now();
          }
        };
        
        if (videoRef.current) {
          videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
        }
        
        // Check every 3 seconds if we're still getting time updates
        streamHealthCheck = setInterval(() => {
          const timeSinceLastUpdate = Date.now() - lastTimeUpdate;
          
          // If no time update in 5 seconds and we expect stream to be active, it ended
          if (timeSinceLastUpdate > 5000 && shouldBeStreaming) {
            setIsStreamLive(false);
            setIsPlaying(false);
            shouldBeStreaming = false;
          }
        }, 3000);

        player.addEventListener(IVSPlayer.PlayerState.PLAYING, () => {
          setIsLoading(false);
          setIsPlaying(true);
          setIsStreamLive(true);
          setError(null);
          lastTimeUpdate = Date.now();
          shouldBeStreaming = true;
        });

        player.addEventListener(IVSPlayer.PlayerState.IDLE, () => {
          setIsPlaying(false);
          shouldBeStreaming = false;
        });

        player.addEventListener(IVSPlayer.PlayerState.READY, () => {
          setIsLoading(false);
          setIsStreamLive(true);
          // Auto-play when stream is ready
          if (player.play) {
            const playPromise = player.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {
                // Auto-play prevented, user interaction required
              });
            }
          }
        });

        player.addEventListener(IVSPlayer.PlayerEventType.ERROR, (err?: { code?: number }) => {
          // 404 means no stream available - this is normal when not broadcasting
          if (err?.code === 404 || err?.code === 4 || !err?.code) {
            setError(null);
            setIsLoading(false);
            setIsPlaying(false);
            setIsStreamLive(false);
          } else {
            setError('Playback error');
            setIsLoading(false);
          }
        });

        // Set initial volume (only on player creation)
        player.setVolume(0.75); // Start at 75%

      } catch (err) {
        setError('Failed to load player');
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.delete();
      }
      if (streamHealthCheck) {
        clearInterval(streamHealthCheck);
      }
      if (videoRef.current && handleTimeUpdate) {
        videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [playerLoaded, token, playbackUrl]);

  // Poll for stream availability every 5 seconds
  useEffect(() => {
    if (!playerRef.current) return;

    const pollInterval = setInterval(() => {
      // Only reload if we think stream is not live to check if it came back online
      if (playerRef.current && playbackUrl && !isStreamLive) {
        playerRef.current.load(playbackUrl);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [playbackUrl, isStreamLive]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current || !videoRef.current) return;
    
    if (isMuted) {
      playerRef.current.setVolume(volume / 100);
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      playerRef.current.setVolume(0);
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume / 100);
    }
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
      videoRef.current.muted = false;
    }
    
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      videoRef.current.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="w-full mx-auto">
      <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
        {/* Video Element */}
        <div className="relative aspect-video bg-black">
          <video 
            ref={videoRef}
            playsInline
            className="w-full h-full"
            onClick={togglePlay}
            muted={false}
          />

          {/* Loading State */}
          {isLoading && !error && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-center px-4">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h3 className="text-white text-xl font-bold mb-2">{error}</h3>
                <p className="text-gray-400">Please try refreshing the page</p>
              </div>
            </div>
          )}

          {/* Not Live - Purchase Overlay */}
          {!isLoading && !error && !isStreamLive && (
            <div className="absolute inset-0 bg-gradient-to-br from-black via-secondary to-black flex items-center justify-center">
              <div className="text-center px-6 max-w-2xl">
                {/* Stream Offline Icon */}
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700">
                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">Stream Offline</h2>
                <p className="text-gray-400 text-lg mb-8">
                  The live event hasn&apos;t started yet. Purchase PPV access to watch when we go live!
                </p>

                {/* Purchase CTA */}
                <div className="space-y-4">
                  <button className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg w-full sm:w-auto">
                    🥊 Purchase PPV Access - $21.99
                  </button>
                  <div className="text-sm text-gray-500">
                    Get instant access when the event starts
                  </div>
                </div>

                {/* Event Details */}
                <div className="mt-8 pt-8 border-t border-gray-800">
                  <p className="text-gray-400 text-sm">
                    <span className="font-semibold text-white">Event:</span> Havoc at Hilton<br />
                    <span className="font-semibold text-white">Date:</span> November 8, 2025 at 6:00 PM EST
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Badge - Top Left */}
          {isPlaying && (
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            </div>
          )}

          {/* Controls Bar - Bottom */}
          {isStreamLive && (
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button 
                      onClick={togglePlay}
                      className="text-white hover:text-accent transition-colors p-2 hover:bg-white/10 rounded"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                      )}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleMute} 
                        className="text-white hover:text-accent transition-colors p-2 hover:bg-white/10 rounded"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted || volume === 0 ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
                        style={{
                          background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${isMuted ? 0 : volume}%, #4b5563 ${isMuted ? 0 : volume}%, #4b5563 100%)`
                        }}
                      />
                    </div>

                    {/* Viewer Count (optional - can be populated later) */}
                    <div className="hidden sm:flex items-center gap-1 text-gray-300 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                      <span>--</span>
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2">
                    {/* Quality Badge */}
                    <span className="text-white text-xs font-medium bg-white/10 px-2 py-1 rounded">
                      AUTO
                    </span>

                    {/* Fullscreen */}
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-accent transition-colors p-2 hover:bg-white/10 rounded"
                      title="Fullscreen"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
