import React from "react";
import { Gauge, Zap, Lock, Check, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useSpeedGovernor, SPEED_LEVELS } from "../../hooks/useSpeedGovernor";

export default function NetworkSpeedSection() {
  const {
    selectedLevel,
    speedObj: currentLevelObj,
    maxAllowedLevel,
    setSpeedLevel,
    isUltimate,
    isProfessional,
    isNovice,
  } = useSpeedGovernor();

  return (
    <div className="rounded-3xl p-5 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-6">
      {/* ── Section Title & Subtitle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary">
            <Gauge size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Transfer Speed Governor
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/40 font-medium mt-0.5">
              Regulate real-time upload and download bandwidth limits across all vault transfers.
            </p>
          </div>
        </div>

        {/* Current Active Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border uppercase tracking-wider",
              isUltimate
                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                : isProfessional
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
            )}
          >
            <Activity size={12} />
            {isUltimate ? "Ultimate Clearance" : isProfessional ? "Pro Clearance" : "Novice Clearance"}
          </span>
        </div>
      </div>

      {/* ── Real-time Status Banner ── */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Active Speed Limit:{" "}
              <span className="text-accent-primary font-mono">{currentLevelObj.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/50 font-normal">
              Changes apply instantaneously in real time to all active and queued multipart transfers.
            </p>
          </div>
        </div>

        {maxAllowedLevel < 5 && (
          <Link
            to="/dashboard/billing"
            className="inline-flex items-center gap-1 text-xs font-bold text-accent-primary hover:underline shrink-0"
          >
            Upgrade Plan for Unlimited <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* ── SPEED LEVEL CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {SPEED_LEVELS.map((level) => {
          const isUnlocked = level.level <= maxAllowedLevel;
          const isSelected = selectedLevel === level.level;

          return (
            <button
              key={level.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && setSpeedLevel(level.level)}
              className={cn(
                "group relative p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between",
                !isUnlocked
                  ? "opacity-55 cursor-not-allowed bg-slate-50/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                  : isSelected
                    ? "bg-slate-50 dark:bg-white/[0.06] border-accent-primary ring-2 ring-accent-primary/20 shadow-md shadow-accent-glow/20"
                    : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/60 dark:hover:bg-white/[0.04] cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between w-full gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-accent-primary transition-colors">
                    {level.label}
                  </span>
                </div>

                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-accent-primary text-accent-foreground flex items-center justify-center shrink-0 shadow-sm shadow-accent-glow">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : !isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                    <Lock size={9} /> {level.tierBadge}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">
                  {level.description}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-slate-400 dark:text-white/30">
                  <span>{level.bytesPerSec === 0 ? "Infinite Throughput" : `Cap: ${level.shortLabel}`}</span>
                  <span>•</span>
                  <span>{level.bytesPerSec === 0 ? "4x Parallel Workers" : "Paced Stream"}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer Tips ── */}
      <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-2 pt-1">
        <ShieldCheck size={14} className="text-accent-primary shrink-0" />
        <span>
          Speed adjustments apply universally across both the floating <strong>Transfer Manager</strong> and this dashboard.
        </span>
      </div>
    </div>
  );
}
