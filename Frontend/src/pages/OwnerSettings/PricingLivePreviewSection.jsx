import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Eye, Shield, Zap, HardDrive, ChevronDown } from "lucide-react";
import { currencySymbols } from "../../lib/currency";

export default function PricingLivePreviewSection({
  billingPlans,
  planTiers,
  tierFeatureConfigs,
  tierRuleConfigs,
  features,
  limits,
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
    if (!bytes) return "0 MB";
    const tb = 1024 * 1024 * 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    const mb = 1024 * 1024;
    if (bytes >= tb && bytes % tb === 0) {
      return `${(bytes / tb).toFixed(0)} TB`;
    }
    if (bytes >= gb && bytes % gb === 0) {
      return `${(bytes / gb).toFixed(0)} GB`;
    }
    if (bytes >= gb) {
      const inGb = bytes / gb;
      return inGb === Math.round(inGb)
        ? `${inGb} GB`
        : `${(bytes / mb).toFixed(0)} MB`;
    }
    return `${(bytes / mb).toFixed(0)} MB`;
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
                const inheritedSlug = limits?.freeTrialInheritedTier || "ultimate";
                const inheritedPlan =
                  billingPlans.find(
                    (p) => p.slug === inheritedSlug && p.period === period
                  ) ||
                  billingPlans.find((p) => p.slug === inheritedSlug);
                const inheritedTier = planTiers.find((t) => t.slug === inheritedSlug);

                const planObj =
                  billingPlans.find(
                    (p) => p.slug === freeTrialTier.slug && p.period === "Monthly",
                  ) ||
                  billingPlans.find((p) => p.slug === freeTrialTier.slug) || {
                    amount: 0,
                    currency: "USD",
                    storage: 5368709120,
                  };

                const effectiveStorage = planObj.storage || 5368709120;
                const tierFeatures = getFeaturesForTier(inheritedSlug).length > 0
                  ? getFeaturesForTier(inheritedSlug)
                  : getFeaturesForTier(freeTrialTier.slug);
                const tierRules =
                  tierRuleConfigs[inheritedSlug] ||
                  tierRuleConfigs[freeTrialTier.slug] ||
                  {};

                const symbol = currencySymbols[planObj.currency] || planObj.currency + " ";
                const storageText = formatStorageText(effectiveStorage);
                const isFreeTrial = true;

                return (
                  <div
                    key={freeTrialTier.slug}
                    className="relative rounded-3xl p-6 border border-accent-border/40 bg-accent-soft/20 dark:bg-accent-soft/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 shadow-lg shadow-accent-glow/10"
                  >
                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6 w-full">
                      <div className="min-w-[240px]">
                        {freeTrialTier.badge && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent-soft text-accent-primary border border-accent-border shadow-accent-glow-sm">
                              <Sparkles size={10} /> {freeTrialTier.badge}
                            </span>
                          </div>
                        )}
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{freeTrialTier.title}</h3>
                        <p className="text-xs text-slate-600 dark:text-white/50 font-medium mt-1">
                          {storageText} • Inheriting features from {inheritedTier?.title || inheritedSlug}
                        </p>
                      </div>

                      {/* Price Display */}
                      <div className="md:border-l md:border-slate-200 dark:md:border-white/10 md:pl-6 flex items-baseline gap-1 shrink-0">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{symbol}0</span>
                        <span className="text-xs text-slate-500 dark:text-white/40 font-semibold">/30-day trial</span>
                      </div>

                      {/* Highlights */}
                      <div className="hidden lg:flex flex-wrap items-center gap-3 text-[11px] font-semibold rounded-2xl p-3 border border-accent-border/30 bg-accent-soft/30 text-accent-primary">
                        <div>Max Devices: <span className="font-bold">{getRuleVal(tierRules, "maxConnectedDevices", 3)} Sessions</span></div>
                        <div className="w-px h-3 bg-accent-border/40" />
                        <div>Speed: <span className="font-bold">{getRuleVal(tierRules, "uploadSpeedMultiplier", 1)}x</span></div>
                        <div className="w-px h-3 bg-accent-border/40" />
                        <div>History: <span className="font-bold">{getRuleVal(tierRules, "versionHistoryDays", 30)} Days</span></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-between md:justify-end">
                      <div className="hidden sm:flex items-center gap-2">
                        {tierFeatures.slice(0, 2).map((feat) => (
                          <div key={feat._id} className="flex items-center gap-1.5 bg-white/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-white/80 font-medium">
                            <Check size={12} className="text-accent-primary shrink-0" />
                            <span>{feat.title}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs shadow-accent-glow bg-accent-primary hover:opacity-90 active:scale-95 text-accent-foreground transition-all duration-300"
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
                  const isPopular = tier.badge === "Most Popular" || tier.slug?.includes("pro");

                  return (
                    <div
                      key={tier.slug}
                      className={`relative rounded-3xl p-6 md:p-7 border flex flex-col justify-between transition-all duration-300 ${
                        isPopular
                          ? "border-accent-primary shadow-2xl shadow-accent-glow/20 ring-2 ring-accent-border/50 bg-white/90 dark:bg-vault-surface/90"
                          : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-vault-surface/60 hover:border-accent-border/80 hover:shadow-xl hover:shadow-accent-glow/10"
                      }`}
                    >
                      {/* Badge */}
                      {tier.badge && (
                        <div className="mb-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                          >
                            <Sparkles size={10} /> {tier.badge}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col">
                        {/* Title & Subtitle */}
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                          {tier.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-white/50 font-medium mb-4 min-h-[32px]">
                          {storageText} • {tier.description}
                        </p>

                        {/* Price Display */}
                        <div className="flex items-baseline gap-1 mb-5 pb-5 border-b border-slate-200 dark:border-white/10">
                          <span className="text-4xl font-black text-slate-900 dark:text-white">
                            {symbol}
                            {planObj.amount}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-white/40 font-semibold">
                            /{isYearly ? "yr" : "mo"}
                          </span>
                        </div>

                        {/* Rule summary highlights */}
                        <div className="mb-5 text-[11px] font-semibold rounded-2xl p-3 space-y-1.5 border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03]">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">Max Devices:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{getRuleVal(tierRules, "maxConnectedDevices", 3)} Sessions</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">Upload Speed:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{getRuleVal(tierRules, "uploadSpeedMultiplier", 1)}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">Version History:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{getRuleVal(tierRules, "versionHistoryDays", 30)} Days</span>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <div className="space-y-2.5 mb-6 flex-grow">
                          {tierFeatures.slice(0, 5).map((feat) => (
                            <div
                              key={feat._id}
                              className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-white/80"
                            >
                              <Check size={14} className="text-accent-primary shrink-0" />
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
                                    className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-white/80"
                                  >
                                    <Check size={14} className="text-accent-primary shrink-0" />
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
                              className="text-[11px] font-bold text-accent-primary hover:underline pt-1 flex items-center gap-1 cursor-pointer transition-colors"
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
                        className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all duration-300 active:scale-95 ${
                          isPopular
                            ? "bg-accent-primary hover:opacity-90 text-accent-foreground shadow-accent-glow"
                            : "bg-slate-200 dark:bg-white/10 hover:bg-accent-primary hover:text-accent-foreground text-slate-800 dark:text-white"
                        }`}
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
