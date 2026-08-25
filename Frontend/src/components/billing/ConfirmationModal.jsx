import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2, PauseCircle, PlayCircle, X } from "lucide-react";

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type = "CANCEL", // PAUSE, RESUME, CANCEL, UPGRADE, DOWNGRADE
  planData = null,
  loading = false,
}) {
  if (!isOpen) return null;

  const modalConfigs = {
    PAUSE: {
      title: "Pause Subscription",
      icon: PauseCircle,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/30",
      btnColor: "bg-amber-500 hover:bg-amber-600 text-black font-bold",
      description:
        "Are you sure you want to pause your active subscription? Your upcoming auto-renewals will be paused until you resume.",
      consequence:
        "Storage features and uploads will remain accessible until the end of your current billing period.",
    },
    RESUME: {
      title: "Resume Subscription",
      icon: PlayCircle,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/30",
      btnColor: "bg-emerald-500 hover:bg-emerald-600 text-black font-bold",
      description:
        "Ready to resume your Vault Storage subscription? Auto-renewal and full priority speed will be reactivated.",
      consequence:
        "Your regular billing schedule will continue seamlessly without interruption.",
    },
    CANCEL: {
      title: "Cancel Subscription",
      icon: AlertTriangle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 border-rose-500/30",
      btnColor: "bg-rose-500 hover:bg-rose-600 text-white font-bold",
      description:
        "Warning: You are about to cancel your storage subscription. This action will terminate auto-renewals.",
      consequence:
        "Your account will downgrade to the free tier at the end of the billing cycle. Files exceeding free storage quota may become read-only.",
    },
    UPGRADE: {
      title: "Confirm Plan Upgrade",
      icon: CheckCircle2,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/30",
      btnColor: "bg-blue-500 hover:bg-blue-600 text-white font-bold",
      description: `You are upgrading to the ${planData?.type || planData?.name || "new"} plan.`,
      consequence:
        "Your storage limit and speed enhancements will be upgraded immediately upon checkout completion.",
    },
    DOWNGRADE: {
      title: "Confirm Plan Downgrade",
      icon: Info,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/30",
      btnColor: "bg-purple-500 hover:bg-purple-600 text-white font-bold",
      description: `You are requesting a downgrade to the ${planData?.type || planData?.name || "selected"} plan.`,
      consequence:
        "Your storage limit will be adjusted at the next billing cycle. Please ensure your total file usage fits within the new quota.",
    },
  };

  const config = modalConfigs[type] || modalConfigs.CANCEL;
  const Icon = config.icon;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-vault-surface dark:bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
        >
          {/* Close X */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Icon Header */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${config.iconBg}`}
            >
              <Icon size={24} className={config.iconColor} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{config.title}</h3>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                Confirmation Required
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 mb-8">
            <p className="text-sm text-white/80 leading-relaxed">
              {config.description}
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-white/70 space-y-1">
              <span className="font-bold text-white block">Consequence:</span>
              <p>{config.consequence}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-md ${config.btnColor}`}
            >
              {loading ? "Processing..." : "Confirm Action"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
