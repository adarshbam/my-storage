import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Eye, Shield, Zap, HardDrive, ChevronDown } from "lucide-react";
import { currencySymbols } from "../../lib/currency";

const accentThemes = {
  emerald: {
    border: "border-emerald-500/40 hover:border-emerald-500/70",
    shadow: "shadow-[0_10px_40px_rgba(16,185,129,0.15)]",
    bgTint: "bg-emerald-500/[0.03]",
    badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    text: "text-emerald-400",
    check: "text-emerald-400",
    ruleBox: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    btnGradient: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_35px_rgba(16,185,129,0.5)]",
  },
  purple: {
    border: "border-fuchsia-500/40 hover:border-fuchsia-500/70",
    shadow: "shadow-[0_10px_40px_rgba(217,70,239,0.15)]",
    bgTint: "bg-fuchsia-500/[0.03]",
    badgeBg: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
    text: "text-fuchsia-400",
    check: "text-fuchsia-400",
    ruleBox: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300",
    btnGradient: "bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-[0_8px_25px_rgba(217,70,239,0.3)] hover:shadow-[0_12px_35px_rgba(217,70,239,0.5)]",
  },
  rose: {
    border: "border-rose-500/50 hover:border-rose-500/80",
    shadow: "shadow-[0_10px_40px_rgba(244,63,94,0.2)]",
    bgTint: "bg-rose-500/[0.04]",
    badgeBg: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    text: "text-rose-400",
    check: "text-rose-400",
    ruleBox: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    btnGradient: "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_8px_25px_rgba(244,63,94,0.35)] hover:shadow-[0_12px_35px_rgba(244,63,94,0.55)]",
  },
  sky: {
    border: "border-blue-500/40 hover:border-blue-500/70",
    shadow: "shadow-[0_10px_40px_rgba(59,130,246,0.15)]",
    bgTint: "bg-blue-500/[0.03]",
    badgeBg: "bg-blue-500/15 text-sky-400 border-blue-500/25",
    text: "text-sky-400",
    check: "text-sky-400",
    ruleBox: "bg-blue-500/10 border-blue-500/20 text-sky-300",
    btnGradient: "bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-[0_8px_25px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_35px_rgba(59,130,246,0.5)]",
  },
  amber: {
    border: "border-amber-500/40 hover:border-amber-500/70",
    shadow: "shadow-[0_10px_40px_rgba(245,158,11,0.15)]",
    bgTint: "bg-amber-500/[0.03]",
    badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    text: "text-amber-400",
    check: "text-amber-400",
    ruleBox: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    btnGradient: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-[0_8px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_12px_35px_rgba(245,158,11,0.5)]",
  },
  indigo: {
    border: "border-indigo-500/40 hover:border-indigo-500/70",
    shadow: "shadow-[0_10px_40px_rgba(99,102,241,0.15)]",
    bgTint: "bg-indigo-500/[0.03]",
    badgeBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
    text: "text-indigo-400",
    check: "text-indigo-400",
    ruleBox: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
    btnGradient: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_8px_25px_rgba(99,102,241,0.3)] hover:shadow-[0_12px_35px_rgba(99,102,241,0.5)]",
  },
  cyan: {
    border: "border-cyan-500/40 hover:border-cyan-500/70",
    shadow: "shadow-[0_10px_40px_rgba(6,182,212,0.15)]",
    bgTint: "bg-cyan-500/[0.03]",
    badgeBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    text: "text-cyan-400",
    check: "text-cyan-400",
    ruleBox: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",
    btnGradient: "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-[0_8px_25px_rgba(6,182,212,0.3)] hover:shadow-[0_12px_35px_rgba(6,182,212,0.5)]",
  },
  pink: {
    border: "border-pink-500/40 hover:border-pink-500/70",
    shadow: "shadow-[0_10px_40px_rgba(236,72,153,0.15)]",
    bgTint: "bg-pink-500/[0.03]",
    badgeBg: "bg-pink-500/15 text-pink-400 border-pink-500/25",
    text: "text-pink-400",
    check: "text-pink-400",
    ruleBox: "bg-pink-500/10 border-pink-500/20 text-pink-300",
    btnGradient: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.3)] hover:shadow-[0_12px_35px_rgba(236,72,153,0.5)]",
  },
  violet: {
    border: "border-violet-500/40 hover:border-violet-500/70",
    shadow: "shadow-[0_10px_40px_rgba(139,92,246,0.15)]",
    bgTint: "bg-violet-500/[0.03]",
    badgeBg: "bg-violet-500/15 text-violet-400 border-violet-500/25",
    text: "text-violet-400",
    check: "text-violet-400",
    ruleBox: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    btnGradient: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_25px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_35px_rgba(139,92,246,0.5)]",
  },
};

export default function PricingLivePreviewSection({
  billingPlans,
  planTiers,
  tierFeatureConfigs,
  tierRuleConfigs,
  features,
}) {
  const [isYearly, setIsYearly] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState({});

  // Filter features enabled for a given tier
  const getFeaturesForTier = (tierSlug) => {
    const activeKeys = tierFeatureConfigs?.[tierSlug] || [];
    return features.filter((f) => activeKeys.includes(f.key) && f.enabled);
  };

  const getRuleVal = (config, key, fallback) => {
    if (!config) return fallback;
    if (config[key] !== undefined) return config[key];
    if (config.limits && config.limits[key] !== undefined) return config.limits[key];
    if (config.settings && config.settings[key] !== undefined) return config.settings[key];
    if (config.permissions && config.permissions[key] !== undefined) return config.permissions[key];
    return fallback;
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
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-sky-500/30">
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
      <div className="w-full bg-slate-950/80 dark:bg-[#020705] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 dark:border-white/10 relative overflow-hidden shadow-2xl space-y-6">
        {(() => {
          const period = isYearly ? "Yearly" : "Monthly";
          const freeTrialTier = planTiers.find(
            (t) => t.slug?.includes("free")
          );
          const mainTiers = planTiers.filter((t) => t !== freeTrialTier);

          return (
            <>
              {/* Separate Free Trial Top Banner Card */}
              {freeTrialTier && (() => {
                const planObj = billingPlans.find(
                  (p) => p.slug === freeTrialTier.slug && p.period === period
                ) || { amount: 0, currency: "USD", storage: 5368709120 };
                const tierFeatures = getFeaturesForTier(freeTrialTier.slug);
                const tierRules = tierRuleConfigs[freeTrialTier.slug] || {};
                const symbol = currencySymbols[planObj.currency] || planObj.currency + " ";
                const storageText = formatStorageText(planObj.storage);
                const theme = accentThemes[freeTrialTier.accentColor] || accentThemes.emerald;

                return (
                  <div
                    key={freeTrialTier.slug}
                    className={`relative rounded-3xl p-6 border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 ${theme.border} ${theme.shadow} ${theme.bgTint}`}
                  >
                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6 w-full">
                      <div className="min-w-[240px]">
                        {freeTrialTier.badge && (
                          <div className="mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${theme.badgeBg}`}>
                              <Sparkles size={10} /> {freeTrialTier.badge}
                            </span>
                          </div>
                        )}
                        <h3 className="text-2xl font-black text-white">{freeTrialTier.title}</h3>
                        <p className="text-xs text-white/50 font-medium mt-1">
                          {storageText} • {freeTrialTier.description}
                        </p>
                      </div>

                      {/* Price Display */}
                      <div className="md:border-l md:border-white/10 md:pl-6 flex items-baseline gap-1 shrink-0">
                        <span className="text-4xl font-black text-white">{symbol}{planObj.amount}</span>
                        <span className="text-xs text-white/40 font-semibold">/{isYearly ? "yr" : "mo"}</span>
                      </div>

                      {/* Highlights */}
                      <div className={`hidden lg:flex flex-wrap items-center gap-3 text-[11px] font-semibold rounded-2xl p-3 border ${theme.ruleBox}`}>
                        <div>Max Devices: <span className="text-white font-bold">{getRuleVal(tierRules, "maxConnectedDevices", 3)} Sessions</span></div>
                        <div className="w-px h-3 bg-white/20" />
                        <div>Speed: <span className="text-white font-bold">{getRuleVal(tierRules, "uploadSpeedMultiplier", 1)}x</span></div>
                        <div className="w-px h-3 bg-white/20" />
                        <div>History: <span className="text-white font-bold">{getRuleVal(tierRules, "versionHistoryDays", 30)} Days</span></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-between md:justify-end">
                      <div className="hidden sm:flex items-center gap-2">
                        {tierFeatures.slice(0, 2).map((feat) => (
                          <div key={feat._id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white/80 font-medium">
                            <Check size={12} className={`${theme.check} shrink-0`} />
                            <span>{feat.title}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs shadow-lg hover:opacity-95 transition-all duration-300 ${theme.btnGradient}`}
                      >
                        Get Started Free
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Spacious 3-Column Grid for Main Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 items-stretch relative z-10">
                {mainTiers.map((tier) => {
                  const planObj = billingPlans.find(
                    (p) => p.slug === tier.slug && p.period === period
                  ) || {
                    amount: 0,
                    currency: "USD",
                    storage: 5368709120,
                    active: true,
                  };

                  const tierFeatures = getFeaturesForTier(tier.slug);
                  const tierRules = tierRuleConfigs[tier.slug] || {};
                  const symbol = currencySymbols[planObj.currency] || planObj.currency + " ";
                  const storageText = formatStorageText(planObj.storage);
                  const theme = accentThemes[tier.accentColor] || accentThemes.emerald;

                  return (
                    <div
                      key={tier.slug}
                      className={`relative rounded-3xl p-6 md:p-7 border flex flex-col justify-between transition-all duration-300 ${
                        tier.badge === "Most Popular" ? "scale-[1.02]" : ""
                      } ${theme.border} ${theme.shadow} ${theme.bgTint}`}
                    >
                      {/* Badge */}
                      {tier.badge && (
                        <div className="mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${theme.badgeBg}`}
                          >
                            <Sparkles size={10} /> {tier.badge}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col">
                        {/* Title & Subtitle */}
                        <h3 className="text-2xl font-black text-white mb-1">
                          {tier.title}
                        </h3>
                        <p className="text-xs text-white/50 font-medium mb-4 min-h-[32px]">
                          {storageText} • {tier.description}
                        </p>

                        {/* Price Display */}
                        <div className="flex items-baseline gap-1 mb-5 pb-5 border-b border-white/10">
                          <span className="text-4xl font-black text-white">
                            {symbol}
                            {planObj.amount}
                          </span>
                          <span className="text-xs text-white/40 font-semibold">
                            /{isYearly ? "yr" : "mo"}
                          </span>
                        </div>

                        {/* Rule summary highlights */}
                        <div className={`mb-5 text-[11px] font-semibold rounded-2xl p-3 space-y-1.5 border ${theme.ruleBox}`}>
                          <div className="flex justify-between">
                            <span className="text-white/60">Max Devices:</span>
                            <span className="text-white font-bold">{getRuleVal(tierRules, "maxConnectedDevices", 3)} Sessions</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Upload Speed:</span>
                            <span className="text-white font-bold">{getRuleVal(tierRules, "uploadSpeedMultiplier", 1)}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Version History:</span>
                            <span className="text-white font-bold">{getRuleVal(tierRules, "versionHistoryDays", 30)} Days</span>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <div className="space-y-2.5 mb-6 flex-grow">
                          {tierFeatures.slice(0, 5).map((feat) => (
                            <div
                              key={feat._id}
                              className="flex items-center gap-2 text-xs font-medium text-white/80"
                            >
                              <Check size={14} className={`${theme.check} shrink-0`} />
                              <span className="truncate">{feat.title}</span>
                            </div>
                          ))}

                          <AnimatePresence initial={false}>
                            {expandedTiers[tier.slug] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2.5 overflow-hidden"
                              >
                                {tierFeatures.slice(5).map((feat) => (
                                  <div
                                    key={feat._id}
                                    className="flex items-center gap-2 text-xs font-medium text-white/80"
                                  >
                                    <Check size={14} className={`${theme.check} shrink-0`} />
                                    <span className="truncate">{feat.title}</span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {tierFeatures.length > 5 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTiers((prev) => ({
                                  ...prev,
                                  [tier.slug]: !prev[tier.slug],
                                }))
                              }
                              className="text-[11px] font-bold text-white/60 hover:text-white pt-1 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>
                                {expandedTiers[tier.slug]
                                  ? "Show fewer features"
                                  : `+ ${tierFeatures.length - 5} more features`}
                              </span>
                              <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${
                                  expandedTiers[tier.slug] ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg hover:opacity-95 transition-all duration-300 ${theme.btnGradient}`}
                      >
                        Get Started
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>
    </section>
  );
}
