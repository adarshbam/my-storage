import React from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { formatSize } from "../../lib/utils";
import { currencySymbols, fallbackRates, getRoundedPrice } from "../../lib/currency";

export default function PlanCard({
  plan,
  isCurrent = false,
  currentUsedStorage = 0,
  currentPlanAmount = 0,
  currency = "INR",
  rates = fallbackRates,
  onSelect,
  loading = false,
}) {
  const isYearly = plan.period?.toLowerCase() === "yearly";
  const planStorage = plan.storage || 0;
  const isStorageExceeded = currentUsedStorage > planStorage && !isCurrent;

  // Format price display
  const basePrice = plan.amount ?? plan.price ?? 0;
  const rate = rates[currency] || fallbackRates[currency] || 1;
  const converted = basePrice * rate;
  const roundedPrice = getRoundedPrice(converted, currency);
  const symbol = currencySymbols[currency] || currency + " ";

  const formattedPrice =
    currency === "INR" || currency === "JPY" || currency === "KRW"
      ? `${symbol}${Math.round(roundedPrice).toLocaleString()}`
      : `${symbol}${roundedPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  const name = plan.type || plan.name || plan.slug || "Vault Storage Plan";
  const isPopular = plan.popular || name.toLowerCase().includes("pro");
  const isUltimate = plan.isUltimate || name.toLowerCase().includes("ultimate");

  // Determine CTA text & state
  let ctaText = "Get Started";
  let isUpgrade = false;
  let isDowngrade = false;

  if (isCurrent) {
    ctaText = "Current Active Plan";
  } else if (currentPlanAmount > 0) {
    if (basePrice > currentPlanAmount) {
      ctaText = `Upgrade to ${name}`;
      isUpgrade = true;
    } else if (basePrice < currentPlanAmount) {
      ctaText = isStorageExceeded
        ? "Downgrade Unavailable"
        : `Downgrade to ${name}`;
      isDowngrade = true;
    }
  }

  // Features list
  const maxDevices =
    plan.rules?.maxDevicesLimit ||
    plan.maxDevices ||
    (isUltimate ? "Unlimited Devices" : isPopular ? "5 Devices" : "2 Devices");
  const uploadSpeed =
    plan.rules?.uploadSpeed ||
    plan.uploadSpeed ||
    (isPopular || isUltimate ? "10x Priority Speed" : "Standard Speed");
  const versionHistory =
    plan.rules?.versionHistory ||
    plan.versionHistory ||
    (isUltimate ? "Unlimited History" : isPopular ? "30 Days History" : "7 Days History");

  const defaultFeatures = [
    `${formatSize(planStorage)} Secure Vault Storage`,
    `Device Access: ${maxDevices}`,
    `Upload Speed: ${uploadSpeed}`,
    `Version History: ${versionHistory}`,
    "AES-256 Cloud Encryption",
  ];

  const featuresList = plan.features?.length > 0 ? plan.features : defaultFeatures;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col rounded-3xl p-6 sm:p-8 transition-all duration-300 backdrop-blur-xl border ${
        isPopular
          ? "bg-white dark:bg-vault-surface border-accent-primary shadow-xl shadow-accent-glow/20 ring-1 ring-accent-border"
          : isCurrent
            ? "bg-white dark:bg-vault-surface border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
            : "bg-white/80 dark:bg-vault-surface/80 border-slate-200 dark:border-white/10 shadow-sm"
      }`}
    >
      {/* Top Badges */}
      <div className="flex items-center justify-between mb-4 min-h-[26px]">
        {isPopular ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-primary text-accent-foreground font-bold text-[11px] shadow-sm uppercase tracking-wider">
            <Sparkles size={12} /> Most Popular
          </span>
        ) : (
          <span />
        )}
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
            <ShieldCheck size={12} /> Active Plan
          </span>
        )}
      </div>

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          {name}
        </h3>
        <p className="text-slate-500 dark:text-white/50 text-xs font-medium min-h-[32px] leading-relaxed">
          {plan.description ||
            `${formatSize(planStorage)} of high-speed encrypted cloud vault storage.`}
        </p>
      </div>

      {/* Pricing Display */}
      <div className="flex items-baseline gap-2 mb-6 border-b border-slate-100 dark:border-white/10 pb-6">
        <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {formattedPrice}
        </span>
        <span className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-wider">
          /{isYearly ? "year" : "month"}
        </span>
      </div>

      {/* Storage Quota Warning */}
      {isDowngrade && isStorageExceeded && (
        <div className="mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs">
          <AlertTriangle size={16} className="shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-bold">Downgrade unavailable</p>
            <p className="opacity-80 mt-0.5">
              You currently use {formatSize(currentUsedStorage)}, which exceeds this plan's limit ({formatSize(planStorage)}).
            </p>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="space-y-3 mb-8 flex-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-wider mb-2">
          Included Features
        </div>
        {featuresList.map((feature, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-accent-soft text-accent-primary">
              <Check size={11} strokeWidth={3} />
            </div>
            <span className="text-xs text-slate-700 dark:text-white/80 font-medium leading-relaxed">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrent && !isStorageExceeded && onSelect && onSelect(plan)}
        disabled={isCurrent || isStorageExceeded || loading}
        className={`w-full py-3.5 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          isCurrent
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-default"
            : isStorageExceeded
              ? "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed"
              : isPopular
                ? "bg-accent-primary hover:opacity-90 text-accent-foreground shadow-lg shadow-accent-glow/25"
                : "bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 shadow-md"
        }`}
      >
        <span>{loading ? "Processing..." : ctaText}</span>
        {!isCurrent && !isStorageExceeded && !loading && (
          <ArrowRight size={15} />
        )}
      </button>
    </motion.div>
  );
}
