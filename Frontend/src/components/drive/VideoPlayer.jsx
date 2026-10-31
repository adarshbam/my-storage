import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Settings,
  Check,
  Loader2,
  Shield,
} from "lucide-react";

/**
 * Format seconds to M:SS or H:MM:SS
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null || !isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const padSecs = secs < 10 ? `0${secs}` : secs;

  if (hrs > 0) {
    const padMins = mins < 10 ? `0${mins}` : mins;
    return `${hrs}:${padMins}:${padSecs}`;
  }
  return `${mins}:${padSecs}`;
}

function getWatermarkPositionClasses(position) {
  switch (position) {
    case "top-left":
      return "top-4 left-4";
    case "bottom-left":
      return "bottom-16 left-4";
    case "bottom-right":
      return "bottom-16 right-4";
    case "top-right":
    default:
      return "top-4 right-4";
  }
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function VideoPlayer({
  src,
  fallbackSrc,
  crossOrigin,
  title,
  onError,
  // Customization & Branding Props
  accentColor = "#00f0ff",
  hideBranding = false,
  customWatermark = null, // { url, position, clickUrl, opacity }
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  borderRadius = "0px",
  aspectRatio,
  isEmbed = false,
  onEnded = null,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  // Source state with automatic fallback support
  const [activeSrc, setActiveSrc] = useState(src);
  const [hasFallenBack, setHasFallenBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isBuffering, setIsBuffering] = useState(Boolean(autoPlay));

  // Volume states (persisted in localStorage)
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("vault_player_volume");
      return saved !== null ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [isMuted, setIsMuted] = useState(() => {
    if (autoPlay || muted) return true;
    try {
      return localStorage.getItem("vault_player_muted") === "true";
    } catch {
      return false;
    }
  });

  // UI interaction states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Hover timestamp preview state
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  // On-screen feedback badge animation (Space / Seek / Volume)
  const [badge, setBadge] = useState(null);
  const badgeTimeoutRef = useRef(null);

  const triggerBadge = useCallback((type, text) => {
    if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
    setBadge({ type, text, id: Date.now() });
    badgeTimeoutRef.current = setTimeout(() => {
      setBadge(null);
    }, 650);
  }, []);

  // Sync activeSrc if prop changes
  useEffect(() => {
    setActiveSrc(src);
    setHasFallenBack(false);
    setHasError(false);
    setIsBuffering(Boolean(autoPlay));
  }, [src, autoPlay]);

  // Handle video error with seamless fallback
  const handleVideoError = (e) => {
    console.warn("Video playback error for src:", activeSrc, e);
    setIsBuffering(false);
    if (!hasFallenBack && fallbackSrc && fallbackSrc !== activeSrc) {
      console.warn("Primary video source failed, falling back to direct stream:", fallbackSrc);
      setHasFallenBack(true);
      setActiveSrc(fallbackSrc);
      return;
    }
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  // Sync volume with video element
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
    try {
      localStorage.setItem("vault_player_volume", volume.toString());
      localStorage.setItem("vault_player_muted", isMuted.toString());
    } catch {}
  }, [volume, isMuted]);

  // W3C MediaSession metadata integration
  useEffect(() => {
    if ("mediaSession" in navigator && title) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || "Video",
          artist: "Vault Media Stream",
        });
      } catch {}
    }
  }, [title]);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused || v.ended) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          triggerBadge("play", "Play");
        })
        .catch((err) => console.warn("Video playback was interrupted:", err.message));
    } else {
      v.pause();
      setIsPlaying(false);
      triggerBadge("pause", "Pause");
    }
  }, [triggerBadge]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      triggerBadge(next ? "mute" : "unmute", next ? "Mute" : "Unmute");
      return next;
    });
  }, [triggerBadge]);

  // Adjust volume relative
  const adjustVolume = useCallback(
    (delta) => {
      setVolume((prev) => {
        const next = Math.max(0, Math.min(1, prev + delta));
        triggerBadge("volume", `${Math.round(next * 100)}%`);
        if (next > 0 && isMuted) setIsMuted(false);
        return next;
      });
    },
    [isMuted, triggerBadge]
  );

  // Seek relative (e.g., +5s, -5s)
  const seekRelative = useCallback(
    (seconds) => {
      const v = videoRef.current;
      if (!v) return;
      const newTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
      v.currentTime = newTime;
      setCurrentTime(newTime);
      triggerBadge(seconds > 0 ? "forward" : "rewind", `${seconds > 0 ? "+" : ""}${seconds}s`);
    },
    [triggerBadge]
  );

  // Seek to percentage
  const seekPercentage = useCallback((percentage) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const target = (percentage / 100) * v.duration;
    v.currentTime = target;
    setCurrentTime(target);
  }, []);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch((e) => console.warn("Fullscreen request failed:", e));
    } else {
      document.exitFullscreen?.().catch((e) => console.warn("Exit fullscreen failed:", e));
    }
  }, []);

  // Toggle Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP failed:", e);
    }
  }, []);

  // Handle Playback Rate
  const handleRateChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      triggerBadge("speed", `${rate}x Speed`);
    }
  };

  // Scrubbing logic via mouse interaction on timeline
  const handleTimelineMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScrubbing(true);
    updateSeekFromEvent(e);

    const onMouseMove = (moveEvent) => updateSeekFromEvent(moveEvent);
    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const updateSeekFromEvent = (e) => {
    if (!timelineRef.current || !videoRef.current || !videoRef.current.duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * videoRef.current.duration;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleTimelineMouseMove = (e) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  // Buffer calculation
  const updateBuffer = () => {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    try {
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferedEnd(end);
    } catch {}
  };

  // Mouse activity & controls auto-hide timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 2500);
    }
  };

  // Click on video to toggle play / double click to fullscreen
  const handleVideoClick = (e) => {
    if (e.target.closest("button") || e.target.closest(".timeline-container")) return;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      toggleFullscreen();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        togglePlay();
      }, 220);
    }
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          seekRelative(-5);
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          seekRelative(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "p":
        case "P":
          e.preventDefault();
          togglePiP();
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          seekPercentage(parseInt(e.key, 10) * 10);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    seekPercentage,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    playbackRate,
  ]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const playedPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleVideoClick}
      className={`relative w-full h-full bg-black flex items-center justify-center select-none overflow-hidden group ${
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      }`}
      style={{
        borderRadius: borderRadius || "0px",
        aspectRatio: aspectRatio || undefined,
        contain: "paint",
        transform: "translateZ(0)",
      }}
    >
      {/* Custom Watermark Overlay */}
      {customWatermark && customWatermark.url && (
        <div
          className={`absolute z-30 pointer-events-auto transition-opacity duration-300 ${getWatermarkPositionClasses(
            customWatermark.position,
          )}`}
          style={{ opacity: customWatermark.opacity ?? 0.85 }}
        >
          {customWatermark.clickUrl ? (
            <a
              href={customWatermark.clickUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={customWatermark.url}
                alt="Watermark"
                className="h-6 sm:h-8 max-w-[140px] object-contain drop-shadow"
              />
            </a>
          ) : (
            <img
              src={customWatermark.url}
              alt="Watermark"
              className="h-6 sm:h-8 max-w-[140px] object-contain drop-shadow"
            />
          )}
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={activeSrc}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        crossOrigin={crossOrigin}
        className="w-full h-full object-contain pointer-events-none"
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
        onTimeUpdate={() => {
          if (!isScrubbing && videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
          updateBuffer();
        }}
        onProgress={updateBuffer}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsBuffering(false);
            setHasError(false);
          }
        }}
        onLoadedData={() => {
          setIsBuffering(false);
          setHasError(false);
        }}
        onCanPlay={() => {
          setIsBuffering(false);
          setHasError(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setHasError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => {
          if (isPlaying) setIsBuffering(true);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setHasError(false);
        }}
        onEnded={() => {
          if (!loop) {
            setIsPlaying(false);
            setShowControls(true);
          }
          if (onEnded) onEnded();
        }}
        onError={handleVideoError}
      />

      {/* Buffering Spinner */}
      {isBuffering && isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-2xl">
            <Loader2 className="w-9 h-9 animate-spin" style={{ color: accentColor }} />
          </div>
        </div>
      )}

      {/* Center Play Button Overlay (shown when paused and idle) */}
      {!isPlaying && !isBuffering && !hasError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl transition-all duration-200 transform hover:scale-110 active:scale-95 group/playbtn z-20 cursor-pointer"
          style={{
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 25px ${accentColor}30`,
          }}
          title="Click to Play"
        >
          <Play
            size={32}
            className="fill-white ml-1 transition-transform group-hover/playbtn:scale-110"
            style={{ color: accentColor }}
          />
        </button>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm z-30 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <VolumeX size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Playback Error</p>
            <p className="text-xs text-white/50 mt-1 max-w-xs">
              Unable to stream video from CDN. Check your network or open directly.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHasError(false);
                setIsBuffering(true);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Retry
            </button>
            <a
              href={activeSrc}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-lg bg-accent-primary text-black text-xs font-bold transition-all"
            >
              Open Direct Stream
            </a>
          </div>
        </div>
      )}

      {/* Center Action Feedback Badge */}
      {badge && (
        <div
          key={badge.id}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in-75 duration-200"
        >
          <div className="px-5 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center gap-3 shadow-2xl">
            {badge.type === "play" && <Play size={28} className="fill-white" />}
            {badge.type === "pause" && <Pause size={28} className="fill-white" />}
            {badge.type === "forward" && <RotateCw size={28} />}
            {badge.type === "rewind" && <RotateCcw size={28} />}
            {badge.type === "volume" && <Volume2 size={28} />}
            {badge.type === "mute" && <VolumeX size={28} style={{ color: accentColor }} />}
            {badge.type === "unmute" && <Volume2 size={28} />}
            <span className="text-sm font-bold tracking-wide">{badge.text}</span>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      {controls && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent pt-12 pb-3 px-3 sm:px-4 flex flex-col gap-2 transition-opacity duration-200 z-40 ${
            showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Timeline Scrubber Container */}
          <div
            ref={timelineRef}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={handleTimelineMouseLeave}
            className="timeline-container relative w-full h-4 flex items-center cursor-pointer group/timeline py-2"
          >
            {/* Hover Time Tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white text-[11px] font-mono font-semibold pointer-events-none -translate-x-1/2 border border-white/20 shadow-lg"
                style={{ left: `${hoverPosition}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Background Bar */}
            <div className="relative w-full h-1 group-hover/timeline:h-1.5 bg-white/20 rounded-full transition-all overflow-visible">
              {/* Buffered Progress */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/40 rounded-full transition-all duration-150"
                style={{ width: `${bufferedPercentage}%` }}
              />

              {/* Played Progress */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  width: `${playedPercentage}%`,
                  backgroundColor: accentColor,
                }}
              />

              {/* Scrubber Knob / Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full scale-0 group-hover/timeline:scale-100 transition-transform"
                style={{
                  left: `${playedPercentage}%`,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 10px ${accentColor}`,
                }}
              />
            </div>
          </div>

          {/* Action Controls Row */}
          <div className="flex items-center justify-between text-white select-none">
            {/* Left Controls: Play, Skips, Volume, Time */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                title={isPlaying ? "Pause (k or Space)" : "Play (k or Space)"}
              >
                {isPlaying ? (
                  <Pause size={20} className="fill-current" />
                ) : (
                  <Play size={20} className="fill-current" />
                )}
              </button>

              {/* Quick 10s Rewind */}
              <button
                type="button"
                onClick={() => seekRelative(-10)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Rewind 10 seconds (j or Left Arrow)"
              >
                <RotateCcw size={17} />
              </button>

              {/* Quick 10s Forward */}
              <button
                type="button"
                onClick={() => seekRelative(10)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Forward 10 seconds (l or Right Arrow)"
              >
                <RotateCw size={17} />
              </button>

              {/* Volume Control Group */}
              <div className="flex items-center group/volume">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  title={isMuted ? "Unmute (m)" : "Mute (m)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={19} style={{ color: accentColor }} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={19} />
                  ) : (
                    <Volume2 size={19} />
                  )}
                </button>

                <div className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 overflow-hidden flex items-center pl-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (val > 0 && isMuted) setIsMuted(false);
                    }}
                    style={{ accentColor: accentColor }}
                    className="w-16 sm:w-18 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Stamp */}
              <div className="text-[11px] sm:text-xs font-mono text-white/80 font-medium pl-1">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-white/40">/</span>
                <span className="text-white/60">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed, PiP, Fullscreen, and Quiet Vault Badge */}
            <div className="flex items-center gap-1 sm:gap-2 relative">
              {/* Quiet Vault Micro-Branding (discreet & high-signal) */}
              {!hideBranding && (
                <a
                  href="https://yourvaultstorage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hidden min-[400px]:flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 hover:bg-black/70 border border-white/10 text-[10px] font-medium tracking-wider text-white/40 hover:text-white transition-all select-none group/badge mr-1"
                  title="Powered by Vault Storage"
                >
                  <Shield
                    size={10}
                    style={{ color: accentColor }}
                    className="opacity-70 group-hover/badge:opacity-100 transition-opacity"
                  />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45 group-hover/badge:text-white/90">
                    Vault
                  </span>
                </a>
              )}

              {/* Speed Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu((prev) => !prev)}
                  className="px-2 py-1 hover:bg-white/10 rounded-lg text-xs font-bold text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  title="Playback Speed"
                >
                  <Settings size={15} />
                  <span>{playbackRate === 1.0 ? "1x" : `${playbackRate}x`}</span>
                </button>

                {/* Speed Menu Popover */}
                {showSpeedMenu && (
                  <div
                    className="absolute bottom-10 right-0 w-36 bg-[#16161a] border border-white/15 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/10">
                      Playback Speed
                    </div>
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
                          playbackRate === rate
                            ? "font-bold bg-white/5"
                            : "text-white/80 font-medium"
                        }`}
                        style={{
                          color: playbackRate === rate ? accentColor : undefined,
                        }}
                      >
                        <span>{rate === 1.0 ? "Normal" : `${rate}x`}</span>
                        {playbackRate === rate && (
                          <Check size={14} style={{ color: accentColor }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              {document.pictureInPictureEnabled && (
                <button
                  type="button"
                  onClick={togglePiP}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white hidden sm:inline-flex"
                  title="Picture in Picture"
                >
                  <PictureInPicture size={17} />
                </button>
              )}

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
