import {
  CreditCard,
  Zap,
  Layers,
  HardDrive,
  Key,
  Lock,
  Check,
} from "lucide-react";
import { useState } from "react";
import { supportedCountries } from "../../lib/currency";

export default function BillingPlansSection({
  billingPlans,
  planTiers,
  onUpdatePlan,
  onSavePlans,
}) {
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = async () => {
    if (onSavePlans) await onSavePlans();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  // Helper to convert bytes to readable input (MB/GB/TB)
  const formatBytesForInput = (bytes) => {
    if (!bytes) return { value: 0, unit: "MB" };
    const tb = 1024 * 1024 * 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    const mb = 1024 * 1024;
    if (bytes >= tb && bytes % tb === 0) {
      return { value: Math.round(bytes / tb), unit: "TB" };
    }
    if (bytes >= gb && bytes % gb === 0) {
      return { value: Math.round(bytes / gb), unit: "GB" };
    }
    if (bytes >= gb) {
      const inGb = bytes / gb;
      if (inGb === Math.round(inGb)) return { value: inGb, unit: "GB" };
      return { value: Math.round(bytes / mb), unit: "MB" };
    }
    return { value: Math.round(bytes / mb), unit: "MB" };
  };

  const handleStorageChange = (planId, rawVal, unit) => {
    const num = Number(rawVal) || 0;
    const multiplier =
      unit === "TB"
        ? 1024 * 1024 * 1024 * 1024
        : unit === "GB"
        ? 1024 * 1024 * 1024
        : 1024 * 1024; // MB
    onUpdatePlan(planId, "storage", num * multiplier);
  };

  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-amber-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
            <CreditCard size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Billing Plans
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Manage billing plans, Razorpay plan IDs, currency rates, storage
              quotas, and active plan statuses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Plans Saved
            </span>
          )}

          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70">
            {
              billingPlans.filter(
                (p) =>
                  !(
                    ["free-trial", "free-trail"].includes(p.slug) &&
                    p.period === "Yearly"
                  ),
              ).length
            }{" "}
            Configured Plans
          </span>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <Check size={14} /> Save Plans
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {billingPlans
          .filter(
            (p) =>
              !(
                ["free-trial", "free-trail"].includes(p.slug) &&
                p.period === "Yearly"
              ),
          )
          .map((plan) => {
          const { value: storageVal, unit: storageUnit } = formatBytesForInput(
            plan.storage,
          );

          return (
            <div
              key={plan._id}
              className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                plan.active
                  ? "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-amber-500/40 shadow-sm hover:shadow-md"
                  : "bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 opacity-60 hover:opacity-100"
              }`}
            >
              {/* Top Banner Header */}
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      plan.active
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                        : "bg-slate-400"
                    }`}
                  />
                  <span
                    className="text-xs font-black text-slate-900 dark:text-white truncate font-mono"
                    title={plan.slug}
                  >
                    {plan.slug}
                  </span>
                  <span className="text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide shrink-0">
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Form Controls inside Card */}
              <div className="space-y-4 text-xs">
                {/* Plan Tier selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                    Plan Tier
                  </label>
                  <select
                    value={plan.slug}
                    onChange={(e) =>
                      onUpdatePlan(plan._id, "slug", e.target.value)
                    }
                    className="w-full bg-white dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                  >
                    {planTiers.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.title} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price and Currency */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                      Price Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={plan.amount}
                      onChange={(e) =>
                        onUpdatePlan(plan._id, "amount", Number(e.target.value))
                      }
                      className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                      Currency
                    </label>
                    <select
                      value={plan.currency}
                      onChange={(e) =>
                        onUpdatePlan(plan._id, "currency", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                    >
                      {supportedCountries
                        .filter((c) => c.currency !== "AUTO")
                        .map((c) => (
                          <option key={c.currency} value={c.currency}>
                            {c.currency}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Storage Quota */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                    Storage Capacity
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={storageVal}
                      onChange={(e) =>
                        handleStorageChange(
                          plan._id,
                          e.target.value,
                          storageUnit,
                        )
                      }
                      className="w-2/3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                    <select
                      value={storageUnit}
                      onChange={(e) =>
                        handleStorageChange(
                          plan._id,
                          storageVal,
                          e.target.value,
                        )
                      }
                      className="w-1/3 bg-white dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                    >
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </div>

                {/* Billing Cycle */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                    Billing Cycle
                  </label>
                  <select
                    value={plan.period}
                    onChange={(e) =>
                      onUpdatePlan(plan._id, "period", e.target.value)
                    }
                    className="w-full bg-white dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                {/* Razorpay Plan ID (Read-only / System Managed) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 font-mono">
                      Razorpay Plan ID
                    </label>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                      <Lock size={10} /> System Managed
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={plan.razorpayPlanId || "N/A"}
                      readOnly
                      tabIndex="-1"
                      className="w-full bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-slate-500 dark:text-white/40 font-mono text-[11px] cursor-not-allowed select-all focus:outline-none"
                      title="Razorpay Plan ID is system-managed and read-only"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
