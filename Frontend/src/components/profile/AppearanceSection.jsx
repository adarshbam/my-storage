import React from "react";
import { Sun, Moon, Smartphone, Check, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../ui/ThemeProvider";

export default function AppearanceSection() {
  const { theme, setTheme, accent, setAccent, palettes } = useTheme();

  const displayModes = [
    {
      id: "light",
      name: "Light",
      desc: "Use a light color scheme",
      icon: Sun,
    },
    {
      id: "dark",
      name: "Dark",
      desc: "Use a dark color scheme",
      icon: Moon,
    },
    {
      id: "system",
      name: "Use device setting",
      desc: "Match your system preference",
      icon: Smartphone,
    },
  ];

  return (
    <div className="rounded-3xl p-5 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-8">
      {/* ── Section Title & Subtitle ── */}
      <div className="border-b border-slate-100 dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Appearance & Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/40 font-medium mt-0.5">
              Customize your display mode and personal color palette across the vault.
            </p>
          </div>
        </div>
      </div>

      {/* ── 1. DISPLAY MODE ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
          Display mode
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {displayModes.map((mode) => {
            const isSelected = theme === mode.id;
            const ModeIcon = mode.icon;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTheme(mode.id)}
                className={`group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-50 dark:bg-white/[0.06] border-accent-primary ring-2 ring-accent-primary/20 shadow-md shadow-accent-glow/20"
                    : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                }`}
              >
                {/* Visual Preview Illustration */}
                <div className="w-full h-24 mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative transition-transform duration-200 group-hover:scale-[1.02]">
                  {mode.id === "light" && (
                    <div className="w-full h-full bg-[#f8fafc] p-2.5 flex flex-col justify-between select-none">
                      {/* Top Header bar */}
                      <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                      {/* Content Body */}
                      <div className="flex gap-2 items-center flex-1 pt-2">
                        {/* Sidebar lines */}
                        <div className="w-6 flex flex-col gap-1 shrink-0">
                          <div className="h-1 w-full bg-slate-400 rounded-full" />
                          <div className="h-1 w-4/5 bg-slate-400 rounded-full" />
                          <div className="h-1 w-full bg-slate-400 rounded-full" />
                          <div className="h-1 w-3/5 bg-slate-400 rounded-full" />
                        </div>
                        {/* Content Cards */}
                        <div className="flex-1 grid grid-cols-2 gap-1.5 h-full">
                          <div className="bg-slate-300 rounded-md h-full" />
                          <div className="bg-slate-300 rounded-md h-full" />
                        </div>
                      </div>
                    </div>
                  )}

                  {mode.id === "dark" && (
                    <div className="w-full h-full bg-[#0c1015] p-2.5 flex flex-col justify-between select-none">
                      {/* Top Header bar */}
                      <div className="h-1.5 w-full bg-slate-700/80 rounded-full" />
                      {/* Content Body */}
                      <div className="flex gap-2 items-center flex-1 pt-2">
                        {/* Sidebar lines */}
                        <div className="w-6 flex flex-col gap-1 shrink-0">
                          <div className="h-1 w-full bg-slate-300 rounded-full" />
                          <div className="h-1 w-4/5 bg-slate-300 rounded-full" />
                          <div className="h-1 w-full bg-slate-300 rounded-full" />
                          <div className="h-1 w-3/5 bg-slate-300 rounded-full" />
                        </div>
                        {/* Content Cards */}
                        <div className="flex-1 grid grid-cols-2 gap-1.5 h-full">
                          <div className="bg-slate-600 rounded-md h-full" />
                          <div className="bg-slate-600 rounded-md h-full" />
                        </div>
                      </div>
                    </div>
                  )}

                  {mode.id === "system" && (
                    <div className="w-full h-full flex select-none">
                      {/* Left Half: Light */}
                      <div className="w-1/2 h-full bg-[#f8fafc] p-2 flex flex-col justify-between border-r border-slate-200 dark:border-white/10">
                        <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                        <div className="flex gap-1.5 items-center flex-1 pt-1.5">
                          <div className="w-4 flex flex-col gap-1 shrink-0">
                            <div className="h-1 w-full bg-slate-400 rounded-full" />
                            <div className="h-1 w-3/4 bg-slate-400 rounded-full" />
                            <div className="h-1 w-full bg-slate-400 rounded-full" />
                          </div>
                          <div className="flex-1 bg-slate-300 rounded-md h-full" />
                        </div>
                      </div>
                      {/* Right Half: Dark */}
                      <div className="w-1/2 h-full bg-[#0c1015] p-2 flex flex-col justify-between">
                        <div className="h-1.5 w-full bg-slate-700/80 rounded-full" />
                        <div className="flex gap-1.5 items-center flex-1 pt-1.5">
                          <div className="w-4 flex flex-col gap-1 shrink-0">
                            <div className="h-1 w-full bg-slate-300 rounded-full" />
                            <div className="h-1 w-3/4 bg-slate-300 rounded-full" />
                            <div className="h-1 w-full bg-slate-300 rounded-full" />
                          </div>
                          <div className="flex-1 bg-slate-600 rounded-md h-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option Metadata & Selection State */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* Radio Indicator */}
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-accent-primary text-accent-foreground"
                          : "border-2 border-slate-300 dark:border-white/30"
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3.5} />}
                    </div>

                    <ModeIcon
                      size={14}
                      className={
                        isSelected
                          ? "text-accent-primary"
                          : "text-slate-600 dark:text-white/60"
                      }
                    />

                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {mode.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-white/40 pl-6 leading-tight">
                    {mode.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. COLOR THEME ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Color theme
          </h3>
          <span className="text-[11px] font-mono text-slate-400 dark:text-white/40">
            {palettes.length} Presets Available
          </span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {palettes.map((p) => {
            const isSelected = accent === p.id;
            const accentColor = p.colorHex || p.swatch;

            return (
              <motion.button
                key={p.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAccent(p.id)}
                className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-50 dark:bg-white/[0.06] border-accent-primary ring-2 ring-accent-primary/25 shadow-md shadow-accent-glow/20"
                    : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                }`}
              >
                {/* Visual Workspace Mockup */}
                <div className="w-full h-20 mb-3 rounded-xl overflow-hidden bg-[#0a0e14] border border-slate-800/80 p-2 flex flex-col justify-between relative shadow-inner select-none transition-transform duration-200 group-hover:scale-[1.02]">
                  {/* Top Header Line */}
                  <div className="h-1.5 w-full bg-slate-700/60 rounded-full" />

                  {/* Body with Accent Sidebar & Shaded Content Cards */}
                  <div className="flex gap-2 items-center flex-1 pt-1.5">
                    {/* Themed Sidebar Bars */}
                    <div className="w-5 flex flex-col gap-1 shrink-0">
                      <div
                        className="h-1 w-full rounded-full transition-colors"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div
                        className="h-1 w-4/5 rounded-full transition-colors"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div
                        className="h-1 w-full rounded-full transition-colors"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div
                        className="h-1 w-3/5 rounded-full transition-colors"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>

                    {/* Themed Content Cards */}
                    <div className="flex-1 grid grid-cols-2 gap-1.5 h-full">
                      <div
                        className="rounded-md h-full transition-all border border-white/5"
                        style={{
                          backgroundColor:
                            p.id === "veo-onyx"
                              ? "rgba(148, 163, 184, 0.28)"
                              : `${accentColor}33`,
                        }}
                      />
                      <div
                        className="rounded-md h-full transition-all border border-white/5"
                        style={{
                          backgroundColor:
                            p.id === "veo-onyx"
                              ? "rgba(148, 163, 184, 0.28)"
                              : `${accentColor}33`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Title & Radio */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* Radio Indicator */}
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-accent-primary text-accent-foreground"
                          : "border-2 border-slate-300 dark:border-white/30"
                      }`}
                    >
                      {isSelected && <Check size={10} strokeWidth={3.5} />}
                    </div>

                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-white/40 pl-6 line-clamp-1 leading-tight">
                    {p.desc}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
