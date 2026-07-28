import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Eye, Shield, Zap, HardDrive } from "lucide-react";
import { currencySymbols } from "../../lib/currency";

export default function PricingLivePreviewSection({
  billingPlans,
  planTiers,
  tierFeatureConfigs,
  tierRuleConfigs,
  features,
}) {
  const [isYearly, setIsYearly] = useState(false);

  // Filter features enabled for a given tier
  const getFeaturesForTier = (tierType) => {
    const activeKeys = tierFeatureConfigs[tierType] || [];
    return features.filter((f) => activeKeys.includes(f.key) && f.enabled);
  };

  const formatStorageText = (bytes) => {
    if (!bytes) return "0 GB";
    const tb = 1024 * 1024 * 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    if (bytes >= tb) {
      return `${(bytes / tb).toFixed(0)} TB`;
    }
    return `${(bytes / gb).toFixed(0)} GB`;
  };

  return (
    <section className="bg-slate-900/60 dark:bg-[#071310]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-sky-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shadow-lg shadow-sky-500/5">
            <Eye size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Live Pricing Component Preview
              </h2>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                Real-Time State Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Renders exact public pricing cards using PlanTier, BillingPlan, Feature, and PlanTierConfiguration state.
            </p>
          </div>
        </div>

        {/* Toggle Monthly/Yearly */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-4 py-2 rounded-2xl backdrop-blur-md">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              !isYearly
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-white/30"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-12 h-6 bg-slate-300 dark:bg-white/10 rounded-full p-1 flex items-center shadow-inner"
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9]"
              animate={{ x: isYearly ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isYearly
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-white/30"
            }`}
          >
            Yearly
          </span>
        </div>
      </div>

      {/* Embedded Live Preview Canvas */}
      <div className="w-full bg-slate-950/80 dark:bg-[#020705] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 dark:border-white/10 relative overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch relative z-10">
          {planTiers.map((tier) => {
            const period = isYearly ? "Yearly" : "Monthly";
            const planObj = billingPlans.find(
              (p) => p.planTier === tier.type && p.period === period
            ) || {
              amount: 0,
              currency: "USD",
              storage: 5368709120,
              active: true,
            };

            const tierFeatures = getFeaturesForTier(tier.type);
            const tierRules = tierRuleConfigs[tier.type] || {};
            const symbol =
              currencySymbols[planObj.currency] || planObj.currency + " ";
            const storageText = formatStorageText(planObj.storage);

            return (
              <div
                key={tier.type}
                className={`relative rounded-3xl p-6 bg-white/5 dark:bg-white/[0.02] border flex flex-col justify-between transition-all duration-300 ${
                  tier.badge === "Most Popular"
                    ? "border-rose-500/50 bg-rose-500/5 shadow-[0_10px_40px_rgba(244,63,94,0.15)] scale-[1.02]"
                    : "border-slate-700/60 dark:border-white/10"
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/25">
                      <Sparkles size={10} /> {tier.badge}
                    </span>
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  {/* Title & Subtitle */}
                  <h3 className="text-xl font-black text-white mb-1">
                    {tier.title}
                  </h3>
                  <p className="text-xs text-white/50 font-medium mb-4 min-h-[32px]">
                    {storageText} • {tier.description}
                  </p>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-1 mb-4 pb-4 border-b border-white/10">
                    <span className="text-3xl font-black text-white">
                      {symbol}
                      {planObj.amount}
                    </span>
                    <span className="text-xs text-white/40 font-semibold">
                      /{isYearly ? "yr" : "mo"}
                    </span>
                  </div>

                  {/* Rule summary highlights */}
                  <div className="mb-4 text-[11px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-xl p-2.5 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/60">Max Devices:</span>
                      <span>{tierRules.maxConnectedDevices ?? 3} Sessions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Upload Speed:</span>
                      <span>{tierRules.uploadSpeedMultiplier ?? "1x"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Version History:</span>
                      <span>{tierRules.versionHistoryDays ?? "30"} Days</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 mb-6 flex-grow">
                    {tierFeatures.slice(0, 5).map((feat) => (
                      <div
                        key={feat.id}
                        className="flex items-center gap-2 text-xs font-medium text-white/80"
                      >
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{feat.title}</span>
                      </div>
                    ))}
                    {tierFeatures.length > 5 && (
                      <p className="text-[10px] font-bold text-white/40 pt-1">
                        + {tierFeatures.length - 5} additional features
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 hover:opacity-95 transition-opacity"
                >
                  Get Started
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
