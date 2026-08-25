import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGuide } from "../../context/GuideContext";
import WallMascot from "./WallMascot";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function WallGuideOverlay() {
  const {
    isTourOpen,
    isMinimized,
    setIsMinimized,
    currentTour,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    soundEnabled,
    toggleSound,
  } = useGuide();

  const [targetRect, setTargetRect] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  // Calculate target element dimensions
  const updateTargetPosition = useCallback(() => {
    if (!currentStep || !currentStep.target) {
      setTargetRect(null);
      return;
    }

    let el = document.querySelector(currentStep.target);
    if (!el && currentStep.fallbackTarget) {
      el = document.querySelector(currentStep.fallbackTarget);
    }

    if (el) {
      // Scroll into view if out of viewport
      const rect = el.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }

      const padding = 10;
      setTargetRect({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        right: rect.right + padding,
        bottom: rect.bottom + padding,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Window resize & scroll listeners
  useEffect(() => {
    if (!isTourOpen) return;

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateTargetPosition();
    };

    const handleScroll = () => {
      updateTargetPosition();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    const interval = setInterval(updateTargetPosition, 400);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      clearInterval(interval);
    };
  }, [isTourOpen, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      } else if (e.key === "Escape") {
        e.preventDefault();
        skipTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourOpen, nextStep, prevStep, skipTour]);

  // Determine smart placement for the Dialog Card & Wall Mascot
  const layout = useMemo(() => {
    if (!targetRect || !currentStep?.target) {
      // Centered Welcome/Finish modal
      return {
        type: "center",
        cardStyle: {
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "520px",
          width: "92vw",
        },
        wallSide: "top",
        stickAngle: 0,
      };
    }

    const cardWidth = Math.min(480, windowSize.width - 40);
    const cardEstimatedHeight = 360;
    const margin = 24;

    const spaceAbove = targetRect.top;
    const spaceBelow = windowSize.height - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = windowSize.width - targetRect.right;

    let position = currentStep.position || "bottom";

    // Auto-detect best position if element is near viewport edges
    if (targetRect.bottom > windowSize.height * 0.65 && spaceAbove > 280) {
      // Near bottom edge -> place above
      position = "top";
    } else if (targetRect.top < windowSize.height * 0.35 && spaceBelow > 280) {
      // Near top edge -> place below
      position = "bottom";
    } else if (position === "bottom" && spaceBelow < cardEstimatedHeight + margin && spaceAbove > spaceBelow) {
      position = "top";
    } else if (position === "top" && spaceAbove < cardEstimatedHeight + margin && spaceBelow > spaceAbove) {
      position = "bottom";
    } else if (position === "right" && spaceRight < cardWidth + margin && spaceLeft > spaceRight) {
      position = "left";
    }

    let top = 0;
    let left = 0;
    let stickAngle = -20;
    let wallSide = "right";

    if (position === "bottom") {
      top = targetRect.bottom + margin;
      left = Math.max(margin, Math.min(windowSize.width - cardWidth - margin, targetRect.centerX - cardWidth / 2));
      stickAngle = -75;
      wallSide = "right";
    } else if (position === "top") {
      top = targetRect.top - cardEstimatedHeight - margin;
      left = Math.max(margin, Math.min(windowSize.width - cardWidth - margin, targetRect.centerX - cardWidth / 2));
      // If target is in the left corner (like nav rail), shift left a bit to the right
      if (left < 90 && targetRect.right < 260) {
        left = Math.max(margin, targetRect.right + margin);
      }
      stickAngle = 75;
      wallSide = "left";
    } else if (position === "right") {
      left = targetRect.right + margin;
      if (targetRect.bottom > windowSize.height * 0.6) {
        top = targetRect.bottom - cardEstimatedHeight;
        stickAngle = 45;
      } else {
        top = targetRect.centerY - cardEstimatedHeight / 2;
        stickAngle = -160;
      }
      wallSide = "left";
    } else {
      // left
      left = targetRect.left - cardWidth - margin;
      if (targetRect.bottom > windowSize.height * 0.6) {
        top = targetRect.bottom - cardEstimatedHeight;
        stickAngle = 45;
      } else {
        top = targetRect.centerY - cardEstimatedHeight / 2;
        stickAngle = 20;
      }
      wallSide = "right";
    }

    // Strict boundary clamps to ensure card NEVER clips outside viewport
    top = Math.max(margin, Math.min(windowSize.height - cardEstimatedHeight - margin, top));
    left = Math.max(margin, Math.min(windowSize.width - cardWidth - margin, left));

    return {
      type: "anchored",
      cardStyle: {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        maxWidth: "92vw",
        maxHeight: "calc(100vh - 48px)",
      },
      wallSide,
      stickAngle,
      position,
    };
  }, [targetRect, windowSize, currentStep]);

  if (!isTourOpen || !currentTour || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[99999] pointer-events-auto overflow-hidden font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. SPOTLIGHT SVG CUTOUT BACKDROP
         ───────────────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="vault-spotlight-mask">
            {/* White covers entire screen (shows backdrop) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black hole cuts out target (makes it transparent) */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Shaded backdrop with mask */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(3, 10, 8, 0.76)"
          mask="url(#vault-spotlight-mask)"
        />
      </svg>

      {/* Target Element Pulsing Glow Ring */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute rounded-2xl pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow:
              "0 0 0 2px rgba(0, 207, 255, 0.9), 0 0 25px rgba(0, 207, 255, 0.4), inset 0 0 15px rgba(0, 207, 255, 0.2)",
            zIndex: 1,
          }}
        >
          {/* Animated corner accents */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm" />
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TRANSPARENT GLASSMORPHIC DIALOG CARD & WALL MASCOT
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentTour.id}-${currentStep.id}`}
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          style={layout.cardStyle}
          className="z-50"
        >
          <div className="relative group">
            {/* Background Ambient Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00CFFF]/25 via-[#10B981]/20 to-[#8B5CF6]/25 rounded-[2rem] blur-xl opacity-80" />

            {/* ── WALL MASCOT (Positioned beside card or on top) ── */}
            <div
              className={`absolute z-30 pointer-events-none transition-all duration-300 ${
                layout.type === "center"
                  ? "-top-24 left-1/2 -translate-x-1/2"
                  : layout.wallSide === "right"
                  ? "-top-16 -right-12 sm:-right-16"
                  : "-top-16 -left-12 sm:-left-16"
              }`}
            >
              <WallMascot
                gesture={currentStep.gesture || "pointing"}
                targetAngle={layout.stickAngle}
                size={layout.type === "center" ? 130 : 110}
              />
            </div>

            {/* ── MAIN TRANSPARENT GLASS DIALOG CARD ── */}
            <div className="relative rounded-[2rem] bg-[#071512]/85 dark:bg-[#030A08]/90 backdrop-blur-2xl border border-white/20 dark:border-white/15 p-5 sm:p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden">
              
              {/* Subtle Animated Top Scanline Bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00CFFF] via-[#10B981] to-[#8B5CF6]" />

              {/* Header: Wall Badge, Step Pill, Controls */}
              <div className="flex items-center justify-between gap-3 mb-4">
                {/* Wall Identity Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary shadow-accent-glow-sm">
                    <Sparkles size={14} className="text-accent-primary" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black tracking-widest text-accent-primary uppercase flex items-center gap-1.5">
                      Wall Guide
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </span>
                  </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2">
                  {/* Step Progress Pill */}
                  <div className="px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-white/80 tracking-wider">
                    {currentStepIndex + 1} / {totalSteps}
                  </div>

                  {/* Sound Toggle */}
                  <button
                    onClick={toggleSound}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={soundEnabled ? "Mute Guide Sounds" : "Enable Guide Sounds"}
                  >
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>

                  {/* Close / Skip Button */}
                  <button
                    onClick={skipTour}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title="Skip Tutorial"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent-primary to-[#00CFFF] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>

              {/* Step Content */}
              <div className="space-y-2 mb-5">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
                  {currentStep.description}
                </p>

                {/* Action Tip Pill */}
                {currentStep.actionTip && (
                  <div className="flex items-start gap-2 p-2.5 mt-3 rounded-xl bg-accent-soft/60 border border-accent-border/40 text-accent-primary text-xs font-semibold">
                    <Info size={14} className="shrink-0 mt-0.5 text-accent-primary" />
                    <span className="leading-snug text-white/90">{currentStep.actionTip}</span>
                  </div>
                )}
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                {/* Left: Skip Tour Link */}
                <button
                  type="button"
                  onClick={skipTour}
                  className="text-xs font-bold text-white/40 hover:text-white/80 transition-colors tracking-wide"
                >
                  Skip Tour
                </button>

                {/* Right Navigation: Prev / Next */}
                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all border border-white/10"
                    >
                      <ChevronLeft size={14} />
                      <span>Back</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={isLastStep ? completeTour : nextStep}
                    className="px-5 py-2 rounded-xl bg-accent-primary text-accent-foreground font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-accent-glow hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{isLastStep ? "Finish" : "Next"}</span>
                    {isLastStep ? <Check size={14} /> : <ArrowRight size={14} />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
