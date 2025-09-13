"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useHls } from "@/hooks/useHls";
import { usePlaybackRate } from "@/hooks/usePlaybackRate";

interface FilmPlayerProps {
  src: string | null;
  poster?: string | null;
  autoplay?: boolean;
  initialRate?: number;
}

export default function FilmPlayer({ 
  src, 
  poster = process.env.NEXT_PUBLIC_FILM_POSTER || null,
  autoplay = false,
  initialRate = 1
}: FilmPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCenterButton, setShowCenterButton] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const { rate, setPlaybackRate, cycleRate, allowedRates } = usePlaybackRate(initialRate);
  
  useHls(src, videoRef);

  // Timer to hide center button after 3 seconds of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    const resetTimer = () => {
      setShowCenterButton(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setShowCenterButton(false);
      }, 3000);
    };

    // Reset timer on any user interaction
    const handleUserActivity = () => {
      resetTimer();
    };

    // Start timer when video starts playing
    if (isPlaying) {
      resetTimer();
    } else {
      setShowCenterButton(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    // Add event listeners for user activity
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
    };
  }, [isPlaying]);

  // Format time helper
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    // Reset center button timer when user interacts
    setShowCenterButton(true);
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        setError("Autoplay blocked. Click play to start.");
      });
    }
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  // Seek by offset
  const seekBy = useCallback((offset: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(currentTime + offset, duration));
    seekTo(newTime);
  }, [currentTime, duration, seekTo]);

  // Volume control
  const setVideoVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  }, []);

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Picture-in-Picture toggle
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (!isPictureInPicture) {
        await videoRef.current.requestPictureInPicture?.();
      } else {
        await document.exitPictureInPicture?.();
      }
    } catch (err) {
      console.log("Picture-in-Picture not supported");
    }
  }, [isPictureInPicture]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVideoVolume(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVideoVolume(volume - 0.05);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Comma":
          e.preventDefault();
          cycleRate("down");
          break;
        case "Period":
          e.preventDefault();
          cycleRate("up");
          break;
        case "KeyE":
          e.preventDefault();
          showExportConfirmation();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekBy, volume, setVideoVolume, toggleMute, toggleFullscreen, cycleRate]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => setError(null);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (autoplay) {
        video.play().catch(() => setError("Autoplay blocked. Click play to start."));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setBufferedRanges(video.buffered);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleRateChange = () => setPlaybackRate(video.playbackRate);
    const handleError = () => {
      setError("Failed to load video. Please check the URL and try again.");
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleEnterPictureInPicture = () => setIsPictureInPicture(true);
    const handleLeavePictureInPicture = () => setIsPictureInPicture(false);

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);
    video.addEventListener("error", handleError);
    video.addEventListener("enterpictureinpicture", handleEnterPictureInPicture);
    video.addEventListener("leavepictureinpicture", handleLeavePictureInPicture);

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      video.removeEventListener("error", handleError);
      video.removeEventListener("enterpictureinpicture", handleEnterPictureInPicture);
      video.removeEventListener("leavepictureinpicture", handleLeavePictureInPicture);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [autoplay, setPlaybackRate]);

  // Update video playback rate when rate changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, [rate]);

  // Retry function
  const retry = useCallback(() => {
    setError(null);
    if (videoRef.current && src) {
      videoRef.current.load();
    }
  }, [src]);

  // Refresh URL helper (ready for backend integration)
  const refreshFilmUrl = useCallback(() => {
    // TODO: Implement when backend is ready
    console.log("Refresh URL not implemented yet");
  }, []);

  // Show export confirmation dialog
  const showExportConfirmation = useCallback(() => {
    if (!src) {
      setError("No video source available for export");
      return;
    }
    setShowExportConfirm(true);
  }, [src]);

  // Export video functionality
  const exportVideo = useCallback(async () => {
    if (!src) {
      setError("No video source available for export");
      return;
    }

    setShowExportConfirm(false);
    setIsExporting(true);
    setError(null);

    try {
      // Fetch the video file
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from URL or use default
      const urlPath = new URL(src).pathname;
      const filename = urlPath.split('/').pop() || 'video.mp4';
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      // Show success message
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
      
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [src]);

  // Cancel export
  const cancelExport = useCallback(() => {
    setShowExportConfirm(false);
  }, []);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center text-white max-w-md">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-2">Film not available</h2>
            <p className="text-gray-400">No video source provided</p>
          </div>
          <button
            onClick={refreshFilmUrl}
            className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
          >
            Refresh Link
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center text-white max-w-md">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-2xl font-semibold mb-2">Film not available</h2>
            <p className="text-gray-400 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-6 break-all">URL: {src}</p>
          </div>
          <div className="space-x-3">
            <button
              onClick={retry}
              className="px-6 py-3 bg-blue-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
            >
              Retry
            </button>
            <button
              onClick={refreshFilmUrl}
              className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Refresh Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden group"
      onMouseMove={() => {
        setShowControls(true);
        setShowCenterButton(true);
      }}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster || undefined}
        playsInline
        preload="metadata"
      />

      {/* Center Play/Stop Button */}
      {!isPlaying && showCenterButton && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200 group"
            aria-label="Play"
          >
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Center Stop Button when playing */}
      {isPlaying && showCenterButton && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200"
            aria-label="Pause"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="relative h-2 flex items-center">
            {/* Background track */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-white/20 rounded-full" />
            
            {/* Buffered ranges */}
            {bufferedRanges && (
              <div className="absolute top-0 left-0 right-0 h-2 rounded-full">
                {Array.from({ length: bufferedRanges.length }, (_, i) => (
                  <div
                    key={i}
                    className="absolute h-full bg-white/40 rounded-full"
                    style={{
                      left: `${(bufferedRanges.start(i) / duration) * 100}%`,
                      width: `${((bufferedRanges.end(i) - bufferedRanges.start(i)) / duration) * 100}%`,
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Current progress */}
            <div 
              className="absolute top-0 left-0 h-2 bg-white rounded-full pointer-events-none"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Progress slider */}
            <input
              ref={progressRef}
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute top-0 left-0 right-0 w-full h-2 bg-transparent appearance-none cursor-pointer slider"
              aria-label="Video progress"
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 transition-colors duration-200"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Time display */}
            <span className="text-white text-sm font-mono tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume control */}
            <div className="flex items-center space-x-3 group/volume">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 transition-colors duration-200"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
              
              {/* Volume slider container */}
              <div className="relative w-32 h-2 bg-white/20 rounded-full opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200">
                <input
                  ref={volumeRef}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                  className="absolute top-0 left-0 right-0 w-full h-2 bg-transparent appearance-none cursor-pointer slider"
                  aria-label="Volume"
                />
                {/* Volume level indicator */}
                <div 
                  className="absolute top-0 left-0 h-2 bg-white rounded-full pointer-events-none"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
              
              {/* Volume percentage display */}
              <span className="text-white text-xs font-mono w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Playback speed */}
            <select
              value={rate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
              aria-label="Playback speed"
            >
              {allowedRates.map((r) => (
                <option key={r} value={r} className="bg-gray-900 text-white">
                  {r}×
                </option>
              ))}
            </select>

            {/* Picture-in-Picture */}
            <button
              onClick={togglePictureInPicture}
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 transition-colors duration-200"
              aria-label={isPictureInPicture ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture"}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7h-8v6h8V7zm-2 4h-4V9h4v2zm4-8H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 transition-colors duration-200"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>

            {/* Export Video */}
            <button
              onClick={showExportConfirmation}
              disabled={isExporting || !src}
              className="text-white hover:text-gray-300 focus:outline-none focus:text-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isExporting ? "Exporting video..." : "Export video"}
            >
              {isExporting ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Export Confirmation Dialog */}
      {showExportConfirm && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-sm mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Export Video</h3>
                <p className="text-white/80 text-base">Download this video to your device?</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={cancelExport}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all duration-300 text-base font-medium backdrop-blur-sm border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={exportVideo}
                  className="flex-1 px-6 py-3 bg-white text-gray-900 rounded-2xl hover:bg-gray-100 transition-all duration-300 text-base font-semibold shadow-lg"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success notification */}
      {exportSuccess && (
        <div className="absolute top-6 left-6 right-6 bg-green-600/90 backdrop-blur-sm text-white p-4 rounded-xl border border-green-500/50" role="alert">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Video exported successfully!</span>
            </div>
            <button
              onClick={() => setExportSuccess(false)}
              className="text-green-200 hover:text-white transition-colors duration-200 p-1"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="absolute top-6 left-6 right-6 bg-red-600/90 backdrop-blur-sm text-white p-4 rounded-xl border border-red-500/50" role="alert">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white transition-colors duration-200 p-1"
              aria-label="Close error"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}