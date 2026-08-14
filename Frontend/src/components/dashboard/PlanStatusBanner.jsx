import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlan } from "../../context/PlanContext";
import { Sparkles, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

export default function PlanStatusBanner() {
  const {
    isNoSubscription,
    isNoPlan,
    canUseFreeTrial,
    daysUntilPurge,
    activateFreeTrial,
  } = usePlan();
  const [activating, setActivating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const noSub = isNoSubscription || isNoPlan;
  if (!noSub) return null;

  const handleActivateTrial = async () => {
    setActivating(true);
    setErrorMsg("");
    setSuccessMsg("");
    const res = await activateFreeTrial();
    if (res.success) {
      setSuccessMsg(res.message || "30-Day Free Trial Activated!");
    } else {
      setErrorMsg(res.error || "Failed to activate Free Trial");
    }
    setActivating(false);
  };

  return (
    <div className="w-full mb-6 relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl transition-all duration-300 shadow-2xl">
      {canUseFreeTrial ? (
        /* Free Trial Available Banner */
        <div className="relative p-4 sm:p-5 bg-gradient-to-r from-vault-emerald/15 via-[#00d4a5]/10 to-transparent border-l-4 border-l-vault-emerald flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-vault-emerald/20 border border-vault-emerald/40 flex items-center justify-center text-vault-emerald shrink-0 shadow-[0_0_15px_rgba(0,212,165,0.3)]">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Storage Subscription Required (Read-Only Mode)
                </h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-vault-emerald/20 text-vault-emerald border border-vault-emerald/30">
                  Free Trial Available
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                You currently have no active storage subscription. Start your{" "}
                <span className="text-vault-emerald font-semibold">
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
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-vault-emerald to-[#00d4a5] hover:opacity-90 active:scale-95 text-vault-black font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,212,165,0.4)] transition-all disabled:opacity-50"
            >
              {activating ? (
                <div className="w-4 h-4 border-2 border-vault-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Start 30-Day Free Trial
                </>
              )}
            </button>
            <Link
              to="/dashboard/billing"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs sm:text-sm font-medium transition-all"
            >
              View Plans <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        /* Free Trial Used -> Urgent Purge Warning Banner */
        <div className="relative p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border-l-4 border-l-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Account in Read-Only Mode (No Active Subscription)
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {daysUntilPurge} Days Until Storage Purge
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                New uploads and sharing are paused. Unsubscribed vaults are
                permanently purged after 60 days. Choose a plan to restore full
                access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link
              to="/dashboard/billing"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
            >
              Choose a Storage Plan <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={14} />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-2 bg-emerald-500/20 border-t border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} />
          {successMsg}
        </div>
      )}
    </div>
  );
}
