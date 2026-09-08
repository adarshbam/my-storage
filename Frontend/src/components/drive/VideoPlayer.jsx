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

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function VideoPlayer({
  src,
  fallbackSrc,
  crossOrigin,
  title,
  onError,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  // Source state with automatic fallback support
  const [activeSrc, setActiveSrc] = useState(src);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);

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
  }, [src]);

  // Handle video error with seamless fallback
  const handleVideoError = () => {
    if (!hasFallenBack && fallbackSrc && fallbackSrc !== activeSrc) {
      console.warn("Primary video source failed, falling back to direct stream:", fallbackSrc);
      setHasFallenBack(true);
      setActiveSrc(fallbackSrc);
      return;
    }
    if (onError) {
      onError();
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
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      triggerBadge("pause", "Pause");
    }
  }, [triggerBadge]);

  // Quick Seek (+/- delta seconds)
  const seekRelative = useCallback((delta) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const target = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    v.currentTime = target;
    setCurrentTime(target);
    triggerBadge(delta > 0 ? "forward" : "rewind", `${delta > 0 ? "+" : ""}${delta}s`);
  }, [triggerBadge]);

  // Jump to percentage (0 - 9 keys)
  const seekPercentage = useCallback((percent) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const target = (percent / 100) * v.duration;
    v.currentTime = target;
    setCurrentTime(target);
    triggerBadge("seek", `${percent}%`);
  }, [triggerBadge]);

  // Adjust volume
  const adjustVolume = useCallback((delta) => {
    setVolume((prev) => {
      const next = Math.max(0, Math.min(1, Math.round((prev + delta) * 10) / 10));
      if (next > 0 && isMuted) setIsMuted(false);
      triggerBadge("volume", `Volume: ${Math.round(next * 100)}%`);
      return next;
    });
  }, [isMuted, triggerBadge]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      triggerBadge(next ? "mute" : "unmute", next ? "Muted" : `Volume: ${Math.round(volume * 100)}%`);
      return next;
    });
  }, [volume, triggerBadge]);

  // Change Playback Rate
  const handleRateChange = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    triggerBadge("speed", `${rate}x Speed`);
  };

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;

    if (!document.fullscreenElement) {
      c.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Picture in Picture toggle
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !document.pictureInPictureEnabled) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  }, []);

  // Update buffer ranges
  const updateBuffer = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;

    const time = v.currentTime;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= time && time <= v.buffered.end(i)) {
        setBufferedEnd(v.buffered.end(i));
        return;
      }
    }
    if (v.buffered.length > 0) {
      setBufferedEnd(v.buffered.end(v.buffered.length - 1));
    }
  };

  // Auto-hide controls after inactivity
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying && !showSpeedMenu && !isScrubbing) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  }, [isPlaying, showSpeedMenu, isScrubbing]);

  // Video click handler: distinguish single-click (play/pause) from double-click (fullscreen)
  const handleVideoClick = (e) => {
    if (e.target.closest("button") || e.target.closest(".timeline-container")) return;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      toggleFullscreen();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, 220);
    }
  };

  // Timeline scrub calculation
  const calculateTimeFromEvent = (e) => {
    if (!timelineRef.current || !duration) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return position * duration;
  };

  const handleTimelineMouseDown = (e) => {
    e.preventDefault();
    setIsScrubbing(true);
    const target = calculateTimeFromEvent(e);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }

    const onMouseMove = (moveEvent) => {
      const newTarget = calculateTimeFromEvent(moveEvent);
      if (videoRef.current) {
        videoRef.current.currentTime = newTarget;
        setCurrentTime(newTarget);
      }
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onMouseMove);
    window.addEventListener("touchend", onMouseUp);
  };

  const handleTimelineMouseMove = (e) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(position * 100);
    setHoverTime(position * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  // YouTube Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture when typing in text fields
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(5);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekRelative(10);
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
        case ">":
          e.preventDefault();
          if (videoRef.current) {
            const nextIdx = Math.min(
              PLAYBACK_RATES.length - 1,
              PLAYBACK_RATES.indexOf(playbackRate) + 1
            );
            handleRateChange(PLAYBACK_RATES[nextIdx]);
          }
          break;
        case "<":
          e.preventDefault();
          if (videoRef.current) {
            const prevIdx = Math.max(0, PLAYBACK_RATES.indexOf(playbackRate) - 1);
            handleRateChange(PLAYBACK_RATES[prevIdx]);
          }
          break;
        default:
          // Numeric keys 0-9 seek percentage
          if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            seekPercentage(parseInt(e.key, 10) * 10);
          }
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
        contain: "paint",
        transform: "translateZ(0)",
      }}
    >
      {/* Video Element with hardware-accelerated overlay */}
      <video
        ref={videoRef}
        src={activeSrc}
        preload="metadata"
        playsInline
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
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onError={handleVideoError}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-2xl">
            <Loader2 className="w-9 h-9 text-red-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Center Action Feedback Badge (YouTube Ripple Effect) */}
      {badge && (
        <div
          key={badge.id}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in-75 duration-200"
        >
          <div className="px-5 py-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white flex items-center gap-3 shadow-2xl">
            {badge.type === "play" && <Play size={28} className="fill-white" />}
            {badge.type === "pause" && <Pause size={28} className="fill-white" />}
            {badge.type === "forward" && <RotateCw size={28} />}
            {badge.type === "rewind" && <RotateCcw size={28} />}
            {badge.type === "volume" && <Volume2 size={28} />}
            {badge.type === "mute" && <VolumeX size={28} className="text-red-400" />}
            {badge.type === "unmute" && <Volume2 size={28} />}
            <span className="text-sm font-bold tracking-wide">{badge.text}</span>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (YouTube Style) */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 pb-3 px-4 flex flex-col gap-2 transition-opacity duration-200 z-40 ${
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
          <div className="relative w-full h-1 group-hover/timeline:h-1.5 bg-white/25 rounded-full transition-all overflow-visible">
            {/* Buffered Progress (YouTube Gray Bar) */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/45 rounded-full transition-all duration-150"
              style={{ width: `${bufferedPercentage}%` }}
            />

            {/* Played Progress (YouTube Red Bar) */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full"
              style={{ width: `${playedPercentage}%` }}
            />

            {/* Scrubber Knob / Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-600 rounded-full scale-0 group-hover/timeline:scale-100 transition-transform shadow-[0_0_8px_rgba(220,38,38,0.8)]"
              style={{ left: `${playedPercentage}%` }}
            />
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white select-none">
          {/* Left Controls: Play, Skips, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-red-400"
              title={isPlaying ? "Pause (k or Space)" : "Play (k or Space)"}
            >
              {isPlaying ? (
                <Pause size={22} className="fill-current" />
              ) : (
                <Play size={22} className="fill-current" />
              )}
            </button>

            {/* Quick 10s Rewind */}
            <button
              type="button"
              onClick={() => seekRelative(-10)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Rewind 10 seconds (j or Left Arrow)"
            >
              <RotateCcw size={18} />
            </button>

            {/* Quick 10s Forward */}
            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Forward 10 seconds (l or Right Arrow)"
            >
              <RotateCw size={18} />
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
                  <VolumeX size={20} className="text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>

              <div className="w-0 group-hover/volume:w-20 transition-all duration-200 overflow-hidden flex items-center pl-1">
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
                  className="w-18 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
              </div>
            </div>

            {/* Time Stamp */}
            <div className="text-xs font-mono text-white/80 font-medium pl-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span className="text-white/60">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu((prev) => !prev)}
                className="px-2 py-1 hover:bg-white/10 rounded-lg text-xs font-bold text-white/80 hover:text-white transition-colors flex items-center gap-1"
                title="Playback Speed (< and >)"
              >
                <Settings size={16} />
                <span>{playbackRate === 1.0 ? "1x" : `${playbackRate}x`}</span>
              </button>

              {/* Speed Menu Popover */}
              {showSpeedMenu && (
                <div
                  className="absolute bottom-10 right-0 w-36 bg-[#18181c] border border-white/15 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
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
                          ? "text-red-400 font-bold bg-white/5"
                          : "text-white/80 font-medium"
                      }`}
                    >
                      <span>{rate === 1.0 ? "Normal" : `${rate}x`}</span>
                      {playbackRate === rate && <Check size={14} className="text-red-400" />}
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
                <PictureInPicture size={18} />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
