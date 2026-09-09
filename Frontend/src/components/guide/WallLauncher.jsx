import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useGuide } from "../../context/GuideContext";
import { useAuth } from "../../context/AuthContext";
import WallMascot from "./WallMascot";
import {
  Sparkles,
  Rocket,
  Upload,
  FolderPlus,
  Share2,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Volume2,
  VolumeX,
  Lightbulb,
  Crown,
  Shield,
  Sliders,
  CreditCard,
  Keyboard,
  GripVertical,
  Move,
} from "lucide-react";

const STORAGE_POS_KEY = "vault_wally_launcher_position_v1";
const SAFE_MARGIN = 16;

// Module-scoped active singleton tracking to strictly ensure only ONE Wally launcher can ever mount/render
let activeLauncherInstanceId = null;

// Calculate default corner position (bottom-right)
const getDefaultPosition = () => {
  if (typeof window === "undefined") return { x: 20, y: 20 };
  const isMobile = window.innerWidth < 480;
  const width = isMobile ? 56 : 180;
  const height = 52;
  const margin = window.innerWidth < 480 ? 10 : SAFE_MARGIN;
  return {
    x: Math.max(margin, window.innerWidth - width - margin),
    y: Math.max(margin, window.innerHeight - height - margin),
  };
};

// Retrieve previously saved position or fallback to default
const getInitialPosition = () => {
  try {
    const saved = localStorage.getItem(STORAGE_POS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    }
  } catch {}
  return getDefaultPosition();
};

export default function WallLauncher() {
  const { user } = useAuth();
  const location = useLocation();

  const {
    tours,
    startTour,
    isTourOpen,
    completedTours,
    resetAllTours,
    soundEnabled,
    toggleSound,
  } = useGuide();

  // Strict Singleton Guard: guarantee only one instance of Wally Launcher ever renders
  const instanceIdRef = useRef(null);
  if (!instanceIdRef.current) {
    instanceIdRef.current = Math.random().toString(36).slice(2, 9);
  }

  const [isPrimaryInstance, setIsPrimaryInstance] = useState(() => {
    if (!activeLauncherInstanceId) {
      activeLauncherInstanceId = instanceIdRef.current;
      return true;
    }
    return activeLauncherInstanceId === instanceIdRef.current;
  });

  useEffect(() => {
    if (!activeLauncherInstanceId || activeLauncherInstanceId === instanceIdRef.current) {
      activeLauncherInstanceId = instanceIdRef.current;
      setIsPrimaryInstance(true);
    } else {
      setIsPrimaryInstance(false);
    }

    return () => {
      if (activeLauncherInstanceId === instanceIdRef.current) {
        activeLauncherInstanceId = null;
      }
    };
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const buttonRef = useRef(null);
  const currentPosRef = useRef(position);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const justDraggedRef = useRef(false);

  // Keep ref synchronized with position state
  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  // Window resize listener: automatically clamp position so Wally is never cropped or pushed offscreen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const rect = buttonRef.current?.getBoundingClientRect() || { width: 180, height: 52 };
        const margin = window.innerWidth < 480 ? 10 : SAFE_MARGIN;
        const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxY = Math.max(margin, window.innerHeight - rect.height - margin);

        const clampedX = Math.max(margin, Math.min(maxX, prev.x));
        const clampedY = Math.max(margin, Math.min(maxY, prev.y));

        if (clampedX !== prev.x || clampedY !== prev.y) {
          const next = { x: clampedX, y: clampedY };
          currentPosRef.current = next;
          try {
            localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(next));
          } catch {}
          return next;
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pointer drag handlers
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: currentPosRef.current.x, y: currentPosRef.current.y };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    if (!hasMovedRef.current) {
      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const rect = buttonRef.current?.getBoundingClientRect() || { width: 180, height: 52 };
    const margin = window.innerWidth < 480 ? 10 : SAFE_MARGIN;
    const minX = margin;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const minY = margin;
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);

    const rawX = startPosRef.current.x + dx;
    const rawY = startPosRef.current.y + dy;

    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    const nextPos = { x: clampedX, y: clampedY };
    currentPosRef.current = nextPos;
    setPosition(nextPos);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    isDraggingRef.current = false;

    if (hasMovedRef.current) {
      setIsDragging(false);
      hasMovedRef.current = false;
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 120);

      try {
        localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(currentPosRef.current));
      } catch {}
    } else {
      setIsDragging(false);
      setIsOpen(true);
    }
  };

  const handlePointerCancel = (e) => {
    if (!isDraggingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    hasMovedRef.current = false;
    setIsDragging(false);
  };

  const handleClick = (e) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
  };

  const handleResetPosition = (e) => {
    e?.stopPropagation?.();
    const def = getDefaultPosition();
    setPosition(def);
    currentPosRef.current = def;
    try {
      localStorage.removeItem(STORAGE_POS_KEY);
    } catch {}
  };

  // Icon mapper
  const getIcon = (iconName) => {
    switch (iconName) {
      case "Rocket":
        return Rocket;
      case "Upload":
        return Upload;
      case "FolderPlus":
        return FolderPlus;
      case "Share2":
        return Share2;
      case "Crown":
        return Crown;
      case "Shield":
        return Shield;
      case "Sliders":
        return Sliders;
      case "CreditCard":
        return CreditCard;
      case "Keyboard":
        return Keyboard;
      default:
        return Sparkles;
    }
  };

  // Quick tips from Wall
  const tips = [
    "Press ⌘+K (or Ctrl+K) anywhere in Vault OS to instantly focus Neural Search.",
    "You can drag & drop entire folders from your desktop directly into your Vault.",
    "Click and drag across the screen to box-select multiple files simultaneously.",
    "Files are encrypted client-side with AES-256 before upload—zero knowledge guaranteed.",
    "Right-click any asset to copy cryptographic hashes or inspect metadata.",
  ];
  const randomTip = tips[0];

  // Only show Wally on authenticated workspace pages (e.g. /dashboard, /profile, /users, /billing, /tutorials, etc.)
  // Hide on public landing page, authentication screens, or when logged out
  const isPublicRoute =
    !user ||
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/reset-password" ||
    location.pathname.startsWith("/share") ||
    location.pathname.startsWith("/shared-access") ||
    location.pathname.startsWith("/s/") ||
    location.pathname === "/privacy" ||
    location.pathname === "/terms" ||
    location.pathname === "/security";

  // If tour is active, secondary duplicate instance, or on a public page, do not render
  if (isTourOpen || !isPrimaryInstance || isPublicRoute) return null;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DRAGGABLE FLOATING WALLY MINI-ORB BUTTON
         ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 40,
          }}
          className="font-sans select-none touch-none"
        >
          <motion.button
            ref={buttonRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isDragging ? 1.05 : 1, opacity: 1 }}
            whileHover={isDragging ? undefined : { scale: 1.04 }}
            whileTap={isDragging ? undefined : { scale: 0.96 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onClick={handleClick}
            onDoubleClick={handleResetPosition}
            className={`relative group flex items-center gap-2 p-2 min-[480px]:px-4 min-[480px]:py-2.5 rounded-full bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-slate-700/60 dark:border-accent-border/60 text-white select-none touch-none transition-all duration-150 ${
              isDragging
                ? "cursor-grabbing shadow-2xl ring-2 ring-accent-primary/60 scale-105"
                : "cursor-grab shadow-xl shadow-black/50 hover:border-accent-primary/80 hover:shadow-2xl"
            }`}
            title="Drag to place Wally anywhere • Click to open Guidebook • Double-click to reset position"
          >
            {/* Subtle drag grip dots */}
            <div className="relative text-white/30 group-hover:text-white/60 transition-colors shrink-0 -ml-1">
              <GripVertical size={13} />
            </div>

            {/* Wall mini icon */}
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0 pointer-events-none">
              <WallMascot gesture={isDragging ? "celebrating" : "waving"} size={32} />
            </div>

            <div className="relative hidden min-[480px]:flex flex-col text-left pr-1 pointer-events-none">
              <span className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                Wally Guide
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              </span>
              <span className="text-[10px] text-white/50 font-semibold tracking-tight">
                Tutorials & Help
              </span>
            </div>
          </motion.button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. EXPANDED GUIDEBOOK MODAL
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Guidebook Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="fixed bottom-3 inset-x-2.5 min-[480px]:inset-x-4 sm:inset-auto sm:bottom-8 sm:right-8 z-50 w-auto sm:w-[92vw] sm:max-w-md rounded-2xl sm:rounded-3xl bg-slate-900/95 dark:bg-vault-surface/95 backdrop-blur-3xl border border-slate-200/50 dark:border-white/[0.1] p-4 sm:p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.85),0_0_40px_var(--accent-glow-sm)] overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Top Neon Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-primary via-accent-primary/80 to-accent-primary/60" />

              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 -my-2 -ml-2">
                    <WallMascot gesture="waving" size={48} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                      Wally's Guidebook
                    </h2>
                    <p className="text-xs text-white/50 font-medium">
                      Step-by-step interactive tutorials
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleSound}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={soundEnabled ? "Mute Sound" : "Enable Sound"}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title="Close Guidebook"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tour Catalog List */}
              <div className="space-y-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1 mb-4">
                {Object.values(tours).map((tour) => {
                  const Icon = getIcon(tour.icon);
                  const isCompleted = completedTours.includes(tour.id);

                  return (
                    <div
                      key={tour.id}
                      className="group/item flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-slate-200/50 dark:border-white/[0.06] hover:border-accent-border/40 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent-primary border border-accent-border/30 flex items-center justify-center shrink-0 transition-all duration-200 group-hover/item:bg-accent-soft/80 shadow-sm">
                          <Icon size={18} className="transition-transform duration-200 group-hover/item:scale-110" />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-white truncate">
                              {tour.title}
                            </h4>
                            {tour.badge && (
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${
                                  tour.role === "owner"
                                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                    : "bg-accent-primary/20 text-white border border-accent-primary/35 backdrop-blur-sm"
                                }`}
                              >
                                <span
                                  className={`w-1 h-1 rounded-full ${
                                    tour.role === "owner" ? "bg-amber-400" : "bg-accent-primary"
                                  }`}
                                />
                                <span>{tour.badge}</span>
                              </span>
                            )}
                            {isCompleted && (
                              <CheckCircle2
                                size={13}
                                className="text-emerald-400 shrink-0"
                                title="Completed"
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-white/50 truncate max-w-[220px]">
                            {tour.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsOpen(false);
                          startTour(tour.id);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
                      >
                        <Play size={11} className="fill-current" />
                        <span>{isCompleted ? "Replay" : "Start"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tip from Wall */}
              <div className="p-3 rounded-2xl bg-accent-soft/40 border border-accent-border/30 mb-4 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-accent-primary mb-1">
                  <Lightbulb size={12} />
                  <span>Wall's Pro-Tip</span>
                </div>
                <p className="text-xs text-white/80 font-medium leading-relaxed">
                  {randomTip}
                </p>
              </div>

              {/* Footer: Reset Tutorial Progress & Reset Position */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs shrink-0">
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="text-[11px] font-bold text-white/40 hover:text-accent-primary flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset Wally's floating button to default corner position"
                >
                  <Move size={12} />
                  <span>Reset Position</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
                    {completedTours.length} / {Object.keys(tours).length} Completed
                  </span>

                  <button
                    type="button"
                    onClick={resetAllTours}
                    className="text-[11px] font-bold text-white/40 hover:text-white/80 flex items-center gap-1 transition-colors"
                    title="Reset tutorial progress to replay all"
                  >
                    <RotateCcw size={12} />
                    <span>Reset All</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
