import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  HardDrive,
  Lock,
} from "lucide-react";
import Modal from "../ui/Modal";
import { usePlan } from "../../context/PlanContext";
import { useAuth } from "../../context/AuthContext";
import PhoneVerificationModal from "../auth/PhoneVerificationModal";
import { getUser } from "../../lib/utils";

export default function SubscriptionRequiredModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const {
    canUseFreeTrial,
    activateFreeTrial,
    refreshPlan,
  } = usePlan();

  const [activating, setActivating] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const triggerActivation = async () => {
    setActivating(true);
    try {
      const res = await activateFreeTrial();
      if (res?.success) {
        await refreshPlan();
        await getUser(setUser);
        if (onClose) onClose();
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

  const handleStartTrial = async () => {
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

  const handleViewPlans = () => {
    if (onClose) onClose();
    navigate("/dashboard/billing");
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Storage Subscription Required"
        className="max-w-lg"
      >
        <div className="space-y-6">
          {/* Header Visual */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-accent-soft via-accent-soft/30 to-transparent border border-accent-border/40">
            <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary shrink-0 shadow-accent-glow-sm">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Uploads Require an Active Plan
              </h3>
              <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5 leading-relaxed">
                Your vault is currently in Read-Only Mode. Choose a plan or activate your Free Trial to enable file uploads and cloud sync.
              </p>
            </div>
          </div>

          {/* Value Prop Features */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-white/80">
              <HardDrive size={16} className="text-accent-primary shrink-0" />
              <span>5 GB High-Speed Secure Cloud Vault Storage</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-white/80">
              <Zap size={16} className="text-accent-primary shrink-0" />
              <span>Unrestricted Single & Multipart File Uploads</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-white/80">
              <Lock size={16} className="text-accent-primary shrink-0" />
              <span>Client-Side AES-256 Zero-Knowledge Encryption</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
            {canUseFreeTrial ? (
              <>
                <button
                  type="button"
                  onClick={handleViewPlans}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition-all text-center cursor-pointer order-2 sm:order-1"
                >
                  View Plans
                </button>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  disabled={activating}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:opacity-90 active:scale-95 text-accent-foreground text-xs font-bold shadow-accent-glow transition-all disabled:opacity-50 cursor-pointer order-1 sm:order-2"
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
              </>
            ) : (
              <button
                type="button"
                onClick={handleViewPlans}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
              >
                <Zap size={16} fill="currentColor" />
                Choose a Storage Plan <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </Modal>

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
