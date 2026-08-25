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
      <div className="w-full mb-6 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-vault-surface/90 backdrop-blur-xl transition-all duration-300 shadow-md">
        {isTrialEligible ? (
          /* Free Trial Available Banner */
          <div className="relative p-4 sm:p-5 bg-gradient-to-r from-accent-soft via-accent-soft/30 to-transparent border-l-4 border-l-accent-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary shrink-0 shadow-accent-glow-sm">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    Storage Subscription Required (Read-Only Mode)
                  </h4>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border">
                    Free Trial Available
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-0.5">
                  You currently have no active storage subscription. Start your{" "}
                  <span className="text-accent-primary font-semibold">
                    30-Day Free Trial
                  </span>{" "}
                  with 5 GB vault storage, full uploads, and cloud sync.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                onClick={handleActivateTrial}
                disabled={activating}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary hover:opacity-90 active:scale-95 text-accent-foreground font-bold text-xs sm:text-sm shadow-accent-glow transition-all disabled:opacity-50 cursor-pointer"
              >
                {activating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Start 30-Day Free Trial
                  </>
                )}
              </button>
              <Link
                to="/dashboard/billing"
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-medium transition-all"
              >
                View Plans <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : isNoPlan ? (
          /* No Plan & Trial Already Used Banner */
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-l-4 border-l-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    Account in Read-Only Mode
                  </h4>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    Trial Expired
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-0.5">
                  Your trial period has concluded. Uploads and modifying files are
                  temporarily paused until a plan is activated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <Link
                to="/dashboard/billing"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <Zap size={15} fill="currentColor" />
                Choose a Storage Plan
              </Link>
            </div>
          </div>
        ) : isTrialActive ? (
          /* Subtle Active Trial Pill Banner */
          <div className="px-4 py-2 bg-accent-soft border-t border-accent-border text-accent-primary text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="animate-pulse" />
              <span>
                <strong>Free Trial Active:</strong> You have{" "}
                {trialDaysRemaining} days remaining in your 30-day evaluation
                period.
              </span>
            </div>
            <Link
              to="/dashboard/billing"
              className="hover:underline font-bold text-accent-primary"
            >
              Upgrade Anytime →
            </Link>
          </div>
        ) : null}
      </div>

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
