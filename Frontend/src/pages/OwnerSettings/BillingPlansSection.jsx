import { CreditCard, Zap, Power, Layers, HardDrive, Key } from "lucide-react";
import { supportedCountries } from "../../lib/currency";

export default function BillingPlansSection({
  billingPlans,
  planTiers,
  onUpdatePlan,
}) {
  // Helper to convert bytes to readable input (GB/TB)
  const formatBytesForInput = (bytes) => {
    if (!bytes) return { value: 0, unit: "GB" };
    const tb = 1024 * 1024 * 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    if (bytes >= tb) {
      return { value: Math.round(bytes / tb), unit: "TB" };
    }
    return { value: Math.round(bytes / gb), unit: "GB" };
  };

  const handleStorageChange = (planId, rawVal, unit) => {
    const num = Number(rawVal) || 0;
    const multiplier =
      unit === "TB" ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
    onUpdatePlan(planId, "storage", num * multiplier);
  };

  return (
    <section className="bg-slate-900/60 dark:bg-[#071310]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-amber-500/30">
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
              Manage billing plans, Razorpay plan IDs, currency rates, storage quotas, and active plan statuses.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70">
          {billingPlans.length} Configured Plans
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {billingPlans.map((plan) => {
          const { value: storageVal, unit: storageUnit } = formatBytesForInput(
            plan.storage
          );

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                plan.active
                  ? "bg-slate-800/40 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 shadow-lg"
                  : "bg-slate-800/20 dark:bg-white/[0.01] border-slate-300/40 dark:border-white/5 opacity-60 hover:opacity-100"
              }`}
            >
              {/* Top Banner Header */}
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      plan.active
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : "bg-slate-500"
                    }`}
                  />
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {plan.planTier}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                    {plan.period}
                  </span>
                </div>

                {/* Active Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onUpdatePlan(plan.id, "active", !plan.active)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${
                    plan.active ? "bg-amber-500" : "bg-slate-700"
                  }`}
                  title={plan.active ? "Deactivate Plan" : "Activate Plan"}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      plan.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Form Controls inside Card */}
              <div className="space-y-4 text-xs">
                {/* Plan Tier selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                    Plan Tier
                  </label>
                  <select
                    value={plan.planTier}
                    onChange={(e) => onUpdatePlan(plan.id, "planTier", e.target.value)}
                    className="w-full bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                  >
                    {planTiers.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.title} ({t.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price and Currency */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                      Price Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={plan.amount}
                      onChange={(e) =>
                        onUpdatePlan(plan.id, "amount", Number(e.target.value))
                      }
                      className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                      Currency
                    </label>
                    <select
                      value={plan.currency}
                      onChange={(e) => onUpdatePlan(plan.id, "currency", e.target.value)}
                      className="w-full bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
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

                {/* Razorpay Plan ID */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                    Razorpay Plan ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={plan.razorpayPlanId || ""}
                      onChange={(e) => onUpdatePlan(plan.id, "razorpayPlanId", e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-amber-500/50"
                      placeholder="e.g. plan_N123abc"
                    />
                  </div>
                </div>

                {/* Storage Quota */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                    Storage Capacity
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={storageVal}
                      onChange={(e) =>
                        handleStorageChange(plan.id, e.target.value, storageUnit)
                      }
                      className="w-2/3 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                    />
                    <select
                      value={storageUnit}
                      onChange={(e) =>
                        handleStorageChange(plan.id, storageVal, e.target.value)
                      }
                      className="w-1/3 bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </div>

                {/* Version & Period */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                      Version Tag
                    </label>
                    <input
                      type="text"
                      value={plan.version}
                      onChange={(e) => onUpdatePlan(plan.id, "version", e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={plan.period}
                      onChange={(e) => onUpdatePlan(plan.id, "period", e.target.value)}
                      className="w-full bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
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
