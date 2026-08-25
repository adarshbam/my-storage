import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuide } from "../../context/GuideContext";
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
} from "lucide-react";

export default function WallLauncher() {
  const {
    tours,
    startTour,
    isTourOpen,
    completedTours,
    resetAllTours,
    soundEnabled,
    toggleSound,
  } = useGuide();

  const [isOpen, setIsOpen] = useState(false);

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

  // If tour is active, hide launcher to prevent UI clutter
  if (isTourOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. FLOATING WALL MINI-ORB BUTTON
         ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-accent-border shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,207,255,0.25)] text-white transition-all cursor-pointer"
          title="Open Wall's Guidebook"
        >
          {/* Subtle glowing animated beacon */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-[#00CFFF] rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity" />

          {/* Wall mini icon */}
          <div className="relative w-8 h-8 -my-1 -ml-1">
            <WallMascot gesture="waving" size={36} />
          </div>

          <div className="relative flex flex-col text-left">
            <span className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              Wall Guide
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            </span>
            <span className="text-[10px] text-white/50 font-semibold tracking-tight">
              Tutorials & Help
            </span>
          </div>
        </motion.button>
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
              className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-[92vw] max-w-md rounded-3xl bg-[#071613]/95 dark:bg-[#030A08]/95 backdrop-blur-3xl border border-white/20 dark:border-white/15 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(0,207,255,0.15)] overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Top Neon Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00CFFF] via-[#10B981] to-[#8B5CF6]" />

              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 -my-2 -ml-2">
                    <WallMascot gesture="waving" size={48} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                      Wall's Guidebook
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
                      className="group/item flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-accent-border/60 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent-primary border border-accent-border/40 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                          <Icon size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate">
                              {tour.title}
                            </h4>
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
                        className="px-3.5 py-1.5 rounded-xl bg-accent-primary text-accent-foreground font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-accent-glow hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer"
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

              {/* Footer: Reset Tutorial Progress */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs shrink-0">
                <span className="text-[11px] text-white/40 font-mono">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
