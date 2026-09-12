import {
  CreditCard,
  Zap,
  Layers,
  HardDrive,
  Key,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { supportedCountries } from "../../lib/currency";
import Checkbox from "../../components/ui/Checkbox";

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
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 min-[360px]:p-5 sm:p-8 shadow-xl transition-all duration-300 hover:border-accent-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shadow-lg shadow-accent-glow-sm shrink-0">
            <CreditCard size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <h2 className="text-base min-[360px]:text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Billing Plans
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Manage billing plans, Razorpay plan IDs, currency rates, storage
              quotas, and active plan statuses.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-accent-foreground text-xs font-bold shadow-lg shadow-accent-glow/25 hover:opacity-95 active:scale-95 transition-all w-full xs:w-auto cursor-pointer"
          >
            <Check size={14} /> Save Plans
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
                  ? "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-accent-border shadow-sm hover:shadow-md"
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
                  <span className="text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded-md bg-accent-soft text-accent-primary border border-accent-border uppercase tracking-wide shrink-0">
                    {plan.period}
                  </span>
                </div>

                {plan.isPopular && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-accent-soft text-accent-primary border border-accent-border uppercase tracking-wider shrink-0">
                    <Sparkles size={10} className="fill-current" /> Popular
                  </span>
                )}
              </div>

              {/* Form Controls inside Card */}
              <div className="space-y-4 text-xs">
                {/* Most Popular Plan Checkbox */}
                {(() => {
                  const isFreePlan = Boolean(
                    plan.slug?.toLowerCase().includes("free") ||
                    Number(plan.amount) === 0
                  );
                  return (
                    <div
                      className={`p-2.5 rounded-xl border transition-all duration-200 ${
                        plan.isPopular
                          ? "bg-accent-soft border-accent-border shadow-sm ring-1 ring-accent-primary/30"
                          : isFreePlan
                          ? "bg-slate-100/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-60 cursor-not-allowed"
                          : "bg-white/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-accent-border"
                      }`}
                    >
                      <label
                        className={`flex items-center justify-between gap-2.5 ${
                          isFreePlan ? "cursor-not-allowed" : "cursor-pointer select-none"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles
                            size={14}
                            className={
                              plan.isPopular
                                ? "text-accent-primary fill-accent-primary shrink-0"
                                : "text-slate-400 dark:text-white/40 shrink-0"
                            }
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                Most Popular Plan
                              </span>
                              {plan.isPopular && (
                                <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider bg-accent-primary text-accent-foreground shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-500 dark:text-white/50 block truncate">
                              {isFreePlan
                                ? "Free plan cannot be popular"
                                : plan.isPopular
                                ? "Highlighted in pricing views"
                                : "Mark tier as most popular"}
                            </span>
                          </div>
                        </div>
                        <Checkbox
                          disabled={isFreePlan}
                          checked={Boolean(plan.isPopular)}
                          onChange={(e) =>
                            onUpdatePlan(plan._id, "isPopular", e.target.checked)
                          }
                          variant="accent"
                          size="md"
                        />
                      </label>
                    </div>
                  );
                })()}

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
                    className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                      className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                      className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                      className="w-2/3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                      className="w-1/3 bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                    className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
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
                    <span className="flex items-center gap-1 text-[9px] font-bold text-accent-primary font-mono">
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
