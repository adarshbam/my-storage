import { Cpu, HardDrive, Clock, ShieldCheck, Check } from "lucide-react";
import { useState } from "react";

export default function GlobalSystemLimitsSection({
  limits,
  onChange,
  handleGlobalLimits,
}) {
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (handleGlobalLimits) handleGlobalLimits();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-purple-500/30">
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/5 blur-[90px] rounded-full pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/5">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Global System Limits
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Configure global system thresholds, maximum device connections and
              upload ceilings.
            </p>
          </div>
        </div>

        {savedMessage && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
            <Check size={14} /> System Limits Updated
          </span>
        )}
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6"
      >
        {/* Max Connected Devices */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 font-mono">
            Max Devices / Session
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="20"
              value={limits.maxDevicesLimit ?? ""}
              onChange={(e) =>
                onChange("maxDevicesLimit", Number(e.target.value))
              }
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-sm"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Max active logged-in sessions per user.
          </p>
        </div>

        {/* Max Upload File Size */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 font-mono">
            Max Upload File Size
          </label>
          <div className="flex gap-2 min-w-0">
            <input
              type="number"
              min="1"
              value={limits.maxFileSizeValue ?? ""}
              onChange={(e) =>
                onChange("maxFileSizeValue", Number(e.target.value))
              }
              className="w-2/5 min-w-0 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-sm"
            />
            <select
              value={limits.maxFileSizeUnit ?? "MB"}
              onChange={(e) => onChange("maxFileSizeUnit", e.target.value)}
              className="w-3/5 min-w-0 truncate bg-slate-50 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-xs shadow-sm"
            >
              <option value="B">Bytes (B)</option>
              <option value="KB">KB (Kilobytes)</option>
              <option value="MB">MB (Megabytes)</option>
              <option value="GB">GB (Gigabytes)</option>
              <option value="TB">TB (Terabytes)</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Single file payload ceiling.
          </p>
        </div>

        {/* Session Timeout */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 font-mono">
            Session Idle Timeout
          </label>
          <div className="flex gap-2 min-w-0">
            <input
              type="number"
              min="1"
              value={limits.sessionTimeoutValue ?? ""}
              onChange={(e) =>
                onChange("sessionTimeoutValue", Number(e.target.value))
              }
              className="w-2/5 min-w-0 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-sm"
            />
            <select
              value={limits.sessionTimeoutUnit ?? "Hours"}
              onChange={(e) => onChange("sessionTimeoutUnit", e.target.value)}
              className="w-3/5 min-w-0 truncate bg-slate-50 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-xs shadow-sm"
            >
              <option value="Mins">Minutes</option>
              <option value="Hours">Hours</option>
              <option value="Days">Days</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Auto logout after inactivity.
          </p>
        </div>

        {/* Default Storage Display Unit */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 font-mono">
            Default Storage Unit
          </label>
          <select
            value={limits.defaultStorageUnit ?? "GB"}
            onChange={(e) => onChange("defaultStorageUnit", e.target.value)}
            className="w-full min-w-0 bg-slate-50 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-purple-500 transition-colors text-xs shadow-sm"
          >
            <option value="MB">MB (Megabytes)</option>
            <option value="GB">GB (Gigabytes)</option>
            <option value="TB">TB (Terabytes)</option>
          </select>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Default unit for dashboard widgets.
          </p>
        </div>

        <div className="sm:col-span-2 xl:col-span-4 flex justify-end pt-4 border-t border-slate-200/60 dark:border-white/5">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-purple-500/25 active:scale-95"
          >
            Save System Limits
          </button>
        </div>
      </form>
    </section>
  );
}
