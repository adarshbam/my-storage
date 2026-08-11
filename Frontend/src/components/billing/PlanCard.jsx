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
  const isUltimate =
    plan.isUltimate || name.toLowerCase().includes("ultimate");

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

  // Accent styling based on plan tier
  let accentColor = "from-emerald-500 to-teal-500";
  let textClass = "text-emerald-400";
  let bgClass = "bg-emerald-500/10";
  let borderClass = "border-emerald-500/20";
  let shadowClass = "shadow-emerald-500/10";

  if (name.toLowerCase().includes("pro")) {
    accentColor = "from-rose-500 to-orange-500";
    textClass = "text-rose-400";
    bgClass = "bg-rose-500/10";
    borderClass = "border-rose-500/30";
    shadowClass = "shadow-[0_20px_80px_rgba(244,63,94,0.15)]";
  } else if (isUltimate || name.toLowerCase().includes("ult")) {
    accentColor = "from-blue-500 to-sky-400";
    textClass = "text-blue-400";
    bgClass = "bg-blue-500/15";
    borderClass = "border-blue-500/30";
    shadowClass = "shadow-[0_15px_50px_rgba(59,130,246,0.15)]";
  }

  // Feature rules
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

  const featuresList =
    plan.features?.length > 0 ? plan.features : defaultFeatures;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col rounded-3xl p-6 sm:p-8 bg-vault-surface/80 dark:bg-slate-900/80 backdrop-blur-xl border ${
        isCurrent
          ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          : borderClass
      } ${shadowClass} overflow-hidden`}
    >
      {/* Top Badges */}
      <div className="flex items-center justify-between mb-4 min-h-[24px]">
        {isPopular ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-xs shadow-lg uppercase tracking-wider">
            <Sparkles size={12} /> Most Popular
          </span>
        ) : (
          <span />
        )}
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck size={12} /> Active Plan
          </span>
        )}
      </div>

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
          {name}
        </h3>
        <p className="text-white/50 text-xs font-medium min-h-[32px]">
          {plan.description ||
            `${formatSize(planStorage)} of high-speed encrypted cloud vault storage.`}
        </p>
      </div>

      {/* Pricing Display */}
      <div className="flex items-baseline gap-2 mb-6 border-b border-white/10 pb-6">
        <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
          {formattedPrice}
        </span>
        <span className="text-white/40 text-sm font-semibold">
          /{isYearly ? "year" : "month"}
        </span>
      </div>

      {/* Storage Quota Warning Banner for Downgrade */}
      {isDowngrade && isStorageExceeded && (
        <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs">
          <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-bold">Downgrade unavailable</p>
            <p className="opacity-80">
              You currently use {formatSize(currentUsedStorage)}, which exceeds this
              plan's limit ({formatSize(planStorage)}).
            </p>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="space-y-3.5 mb-8 flex-1">
        <div className="text-xs uppercase font-bold text-white/40 tracking-wider mb-2">
          Included Features
        </div>
        {featuresList.map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bgClass} border border-white/10 ${textClass}`}
            >
              <Check size={11} strokeWidth={3} />
            </div>
            <span className="text-sm text-white/80 font-medium leading-relaxed">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {/* Call To Action Button */}
      <button
        onClick={() =>
          !isCurrent && !isStorageExceeded && onSelect && onSelect(plan)
        }
        disabled={isCurrent || isStorageExceeded || loading}
        className={`w-full py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden border ${
          isCurrent
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default"
            : isStorageExceeded
            ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
            : `bg-gradient-to-r ${accentColor} text-white shadow-lg hover:opacity-95 active:scale-[0.99]`
        }`}
      >
        <span>{loading ? "Processing..." : ctaText}</span>
        {!isCurrent && !isStorageExceeded && !loading && (
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        )}
      </button>
    </motion.div>
  );
}
