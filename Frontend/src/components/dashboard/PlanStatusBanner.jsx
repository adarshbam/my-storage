import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { usePlan } from "../../context/PlanContext";
import { useAuth } from "../../context/AuthContext";
import PhoneVerificationModal from "../auth/PhoneVerificationModal";
import { getUser } from "../../lib/utils";

export default function PlanStatusBanner() {
  const { user, setUser } = useAuth();
  const {
    isNoPlan,
    isNoSubscription,
    canUseFreeTrial,
    subscription,
    activateFreeTrial,
    refreshPlan,
  } = usePlan();
  const [activating, setActivating] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const isTrialActive = Boolean(
    (subscription?.isFreeTrial || subscription?.amount === 0) &&
    subscription?.status?.toLowerCase() === "active"
  );
  const noPlan = (isNoPlan || isNoSubscription) && !isTrialActive;
  const trialEnd = subscription?.currentPeriodEnd || subscription?.currentEnd;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd) - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  // If user has a valid paid active subscription (non-trial), don't show any banner
  if (!noPlan && !isTrialActive) return null;

  // Determine if free trial has ever been used
  const isTrialEligible = noPlan && canUseFreeTrial;

  const triggerActivation = async () => {
    setActivating(true);
    try {
      const res = await activateFreeTrial();
      if (res?.success) {
        await refreshPlan();
        await getUser(setUser);
      } else {
        alert(res?.error || "Failed to activate free trial");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Error activating free trial");
    } finally {
      setActivating(false);
    }
  };

  const handleActivateTrial = async () => {
    // If user's phone is not verified, prompt phone verification modal first
    if (!user?.phoneVerified) {
      setShowPhoneModal(true);
      return;
    }
    await triggerActivation();
  };

  const handlePhoneSuccess = async () => {
    setShowPhoneModal(false);
    await getUser(setUser);
    await triggerActivation();
  };

  return (
    <>
      {isTrialActive ? (
        /* Dark Elevated Status Bar for Active Trial */
        <div className="w-full mb-6 relative overflow-hidden rounded-xl bg-white/90 dark:bg-vault-surface/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] px-4 py-2.5 sm:px-5 sm:py-3 transition-all duration-200">
          {/* Subtle Ambient Radial Glow restricted to left status icon */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-24 bg-accent-primary/[0.07] rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            {/* Left Status Group */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent-border/40 flex items-center justify-center text-accent-primary shrink-0 shadow-xs">
                <Sparkles size={15} />
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0 text-xs sm:text-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                  Free Trial Active
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-white/20">•</span>
                <span className="text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                  You have{" "}
                  <span className="font-semibold text-accent-primary tracking-tight">
                    {trialDaysRemaining} days
                  </span>{" "}
                  remaining in your 30-day evaluation period.
                </span>
              </div>
            </div>

            {/* Right Action Button */}
            <Link
              to="/dashboard/billing"
              className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-hover active:bg-accent-active text-accent-foreground text-xs font-semibold tracking-wide transition-all shadow-xs shrink-0 whitespace-nowrap active:scale-98"
            >
              <span>Upgrade Anytime</span>
              <ArrowRight size={13} className="shrink-0" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full mb-6 relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-vault-surface/90 backdrop-blur-xl transition-all duration-300 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          {isTrialEligible ? (
            /* Free Trial Available Banner */
            <div className="relative p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-slate-900 dark:text-white">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent-border/40 flex items-center justify-center text-accent-primary shrink-0 shadow-xs mt-0.5 sm:mt-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Storage Subscription Required (Read-Only Mode)
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-accent-soft text-accent-primary border border-accent-border/30 shrink-0">
                      Free Trial Available
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Start your{" "}
                    <span className="text-accent-primary font-medium">
                      30-Day Free Trial
                    </span>{" "}
                    with 5 GB encrypted vault storage, full uploads, and real-time cloud sync.
                  </p>
                </div>
              </div>

              <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleActivateTrial}
                  disabled={activating}
                  className="w-full min-[480px]:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-hover active:scale-98 text-accent-foreground font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {activating ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Start 30-Day Free Trial</span>
                    </>
                  )}
                </button>
                <Link
                  to="/dashboard/billing"
                  className="w-full min-[480px]:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-medium transition-all text-center whitespace-nowrap cursor-pointer active:scale-98"
                >
                  <span>View Plans</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ) : isNoPlan ? (
            /* No Plan & Trial Already Used Banner */
            <div className="p-3.5 sm:p-4 border-l-2 border-l-amber-500/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Account in Read-Only Mode
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Your evaluation period has concluded. File mutations are paused until a storage plan is active.
                  </p>
                </div>
              </div>

              <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 w-full sm:w-auto shrink-0">
                <Link
                  to="/dashboard/billing"
                  className="w-full min-[480px]:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer active:scale-98"
                >
                  <Zap size={13} fill="currentColor" />
                  <span>Choose a Storage Plan</span>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneSuccess}
        title="Verify Mobile Number"
        subtitle="A verified mobile number is required to claim your 30-day Free Trial and protect against multi-account abuse."
        purpose="trial"
      />
    </>
  );
}
