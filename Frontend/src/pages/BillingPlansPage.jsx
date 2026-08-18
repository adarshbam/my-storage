import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  CreditCard,
  Download,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  Sliders,
  Calendar,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SERVER_URL } from "../lib/api";
import { formatSize } from "../lib/utils";
import PlanCard from "../components/billing/PlanCard";
import ConfirmationModal from "../components/billing/ConfirmationModal";

export default function BillingPlansPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("CANCEL"); // PAUSE, RESUME, CANCEL, UPGRADE, DOWNGRADE
  const [targetPlan, setTargetPlan] = useState(null);

  useEffect(() => {
    fetchInitialData();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.id = "razorpay-script";
    document.body.appendChild(script);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Current Subscription
      const subRes = await fetch(`${SERVER_URL}/subscriptions/current`, {
        credentials: "include",
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }

      // 2. Fetch Active Plans
      const plansRes = await fetch(`${SERVER_URL}/plan/get-active-plans`, {
        credentials: "include",
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (Array.isArray(plansData)) {
          setPlans(plansData);
        }
      }

      // 3. Fetch Invoices
      const invRes = await fetch(`${SERVER_URL}/billing/invoices`, {
        credentials: "include",
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (err) {
      console.error("Failed to load billing details:", err);
      showToast("Error loading billing details", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, type = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Razorpay Popup
  const openRazorpayPopup = ({ subscriptionId, razorpayKeyId }) => {
    if (!window.Razorpay) {
      showToast("Razorpay SDK not loaded yet. Please retry.", "error");
      return;
    }
    const rzp = new window.Razorpay({
      key: razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TD0xv90hsl04nA",
      subscription_id: subscriptionId,
      name: "Vault Storage",
      description: "Cloud Storage Subscription",
      handler: async function (response) {
        console.log("Razorpay Checkout Response:", response);
        showToast("Payment response received! Refreshing subscription status...", "success");
        fetchInitialData();
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#10b981",
      },
    });
    rzp.open();
  };

  // Purchase/Plan Select Handler
  const handleSelectPlan = async (plan) => {
    const isCurrentPlan =
      subscription?.razorpayPlanId === plan.razorpayPlanId ||
      subscription?.planName?.toLowerCase() === (plan.type || plan.slug)?.toLowerCase();

    if (isCurrentPlan) return;

    const currentAmount = subscription?.amount || 0;
    const selectedAmount = plan.amount || plan.price || 0;

    if (currentAmount > 0) {
      setTargetPlan(plan);
      if (selectedAmount > currentAmount) {
        setModalType("UPGRADE");
      } else {
        setModalType("DOWNGRADE");
      }
      setModalOpen(true);
      return;
    }

    // Direct Purchase via Razorpay
    try {
      setActionLoading(true);
      const res = await fetch(`${SERVER_URL}/subscriptions/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: plan.razorpayPlanId || plan._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate purchase");

      openRazorpayPopup({
        subscriptionId: data.subscriptionId,
        razorpayKeyId: data.razorpayKeyId,
      });
    } catch (err) {
      console.error("Purchase error:", err);
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Subscription Action from Confirmation Modal
  const handleConfirmModalAction = async () => {
    setActionLoading(true);
    const subId = subscription?.razorpaySubscriptionId || subscription?._id || "sub_current";
    try {
      let endpoint = "";
      let method = "POST";
      let body = null;

      if (modalType === "PAUSE") {
        endpoint = `${SERVER_URL}/subscriptions/${subId}/pause`;
      } else if (modalType === "RESUME") {
        endpoint = `${SERVER_URL}/subscriptions/${subId}/resume`;
      } else if (modalType === "CANCEL") {
        endpoint = `${SERVER_URL}/subscriptions/${subId}/cancel`;
        body = JSON.stringify({ cancelAtCycleEnd: true });
      } else if (modalType === "UPGRADE" || modalType === "DOWNGRADE") {
        endpoint = `${SERVER_URL}/subscriptions/change-plan`;
        body = JSON.stringify({ targetPlanId: targetPlan?.razorpayPlanId || targetPlan?._id });
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to execute ${modalType}`);

      showToast(data.message || `${modalType} request submitted successfully!`, "success");
      setModalOpen(false);
      fetchInitialData();
    } catch (err) {
      console.error(`Action error [${modalType}]:`, err);
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Computed Values
  const status = (subscription?.status || "ACTIVE").toUpperCase();
  const usedStorage = user?.usedStorage ?? subscription?.usedStorage ?? 0;
  const maxStorage = user?.maxStorage ?? subscription?.maxStorage ?? 10737418240;
  const usedPercent = Math.min(100, Math.max(0, ((usedStorage / maxStorage) * 100).toFixed(1)));

  // Status Styling Config
  const statusConfigs = {
    ACTIVE: {
      label: "Active Subscription",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: CheckCircle2,
      bannerClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
      message: "Your subscription is active and all vault storage features are fully enabled.",
    },
    PAUSED: {
      label: "Subscription Paused",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: PauseCircle,
      bannerClass: "bg-amber-500/10 border-amber-500/20 text-amber-300",
      message: "Your subscription is currently paused. Resume anytime to reactivate auto-renewal.",
    },
    PENDING: {
      label: "Payment Pending",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: Clock,
      bannerClass: "bg-amber-500/10 border-amber-500/20 text-amber-300",
      message: "Your latest subscription payment is pending processing.",
    },
    HALTED: {
      label: "Payment Halted",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      icon: ShieldAlert,
      bannerClass: "bg-rose-500/10 border-rose-500/20 text-rose-300",
      message: "Your subscription requires payment attention. Please check your payment details.",
    },
    CANCELLED: {
      label: "Subscription Cancelled",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      icon: XCircle,
      bannerClass: "bg-rose-500/10 border-rose-500/20 text-rose-300",
      message: "Your subscription has been cancelled and will end at the current billing cycle finish.",
    },
    EXPIRED: {
      label: "Subscription Expired",
      badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      icon: AlertTriangle,
      bannerClass: "bg-slate-500/10 border-slate-500/20 text-slate-300",
      message: "Your previous storage subscription has expired. Select a plan below to renew.",
    },
  };

  const statusConfig = statusConfigs[status] || statusConfigs.ACTIVE;
  const StatusIcon = statusConfig.icon;

  // Filter plans by billing period toggle
  const filteredPlans = plans.filter(
    (p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"),
  );

  return (
    <div className="space-y-10 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 text-sm font-semibold ${
            toastMessage.type === "error"
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : toastMessage.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-blue-500/20 border-blue-500/40 text-blue-300"
          }`}
        >
          <Sparkles size={16} />
          <span>{toastMessage.text}</span>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent-primary text-xs uppercase font-bold tracking-widest mb-1">
            <Zap size={14} fill="currentColor" /> Vault Account Dashboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Plans & Subscription
          </h1>
          <p className="text-slate-500 dark:text-white/50 text-sm font-medium mt-1">
            Manage your storage plan, subscription status, and billing lifecycle.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-bold transition-colors self-start md:self-auto"
        >
          <ArrowLeft size={14} /> Back to Vault
        </Link>
      </div>

      {/* ── SECTION 1 & 2: CURRENT PLAN SUMMARY HERO ── */}
      {loading && !subscription ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10 animate-pulse space-y-4 shadow-sm">
          <div className="h-6 bg-slate-200 dark:bg-white/10 rounded w-1/4" />
          <div className="h-10 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Current Plan Hero Card */}
          <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 bg-white dark:bg-gradient-to-br dark:from-vault-surface dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-accent-border/30 shadow-md relative overflow-hidden flex flex-col justify-between text-slate-900 dark:text-white">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent-soft/20 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-accent-primary">
                  Current Subscription
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${statusConfig.badgeClass}`}
                >
                  <StatusIcon size={12} /> {statusConfig.label}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {subscription?.planName || "Novice Vault"}
                  </h2>
                  <p className="text-slate-500 dark:text-white/50 text-xs font-medium mt-1">
                    High-performance cloud vault storage
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    ₹{subscription?.amount || 299}
                  </span>
                  <span className="text-slate-500 dark:text-white/40 text-xs font-semibold">
                    /{subscription?.period?.toLowerCase() || "month"}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border ${statusConfig.bannerClass} flex items-start gap-3 mb-6`}>
                <StatusIcon size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">
                  {statusConfig.message}
                </p>
              </div>

              {/* Storage Usage Component */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <HardDrive size={14} className="text-accent-primary" /> Storage Used
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-white/70">
                    {formatSize(usedStorage)} / {formatSize(maxStorage)} ({usedPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-accent-primary rounded-full transition-all duration-500"
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION 3: SUBSCRIPTION ACTIONS ── */}
            <div className="border-t border-slate-200 dark:border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-1.5">
                <Calendar size={14} className="text-accent-primary" />
                Next Billing Date:{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {subscription?.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "25 Aug 2026"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {status === "ACTIVE" && (
                  <button
                    onClick={() => {
                      setModalType("PAUSE");
                      setModalOpen(true);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
                  >
                    Pause Subscription
                  </button>
                )}

                {status === "PAUSED" && (
                  <button
                    onClick={() => {
                      setModalType("RESUME");
                      setModalOpen(true);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                  >
                    Resume Subscription
                  </button>
                )}

                {status !== "CANCELLED" && (
                  <button
                    onClick={() => {
                      setModalType("CANCEL");
                      setModalOpen(true);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 5 & 8: BILLING SUMMARY & QUICK STORAGE CARD ── */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6 shadow-sm">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-500" /> Billing Summary
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-white/50">Plan Tier</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {subscription?.planName || "Novice Vault"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-white/50">Price</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{subscription?.amount || 299} / {subscription?.period || "Month"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-white/50">Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{status}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-white/50">Payment Gateways</span>
                  <span className="font-bold text-slate-900 dark:text-white">Razorpay Secure</span>
                </div>
              </div>
            </div>

            {/* SECTION 7: PAYMENT FAILURE WARNING IF PENDING/HALTED */}
            {(status === "PENDING" || status === "HALTED") && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Payment requires attention
                </p>
                <p className="opacity-80">
                  Your latest subscription payment could not be completed automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 4: AVAILABLE PLANS GRID ── */}
      <div className="space-y-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Available Vault Storage Plans
            </h2>
            <p className="text-slate-500 dark:text-white/50 text-xs font-medium mt-1">
              Select or change your plan tier. Pricing details are updated live from existing backend configs.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 self-start sm:self-auto shadow-sm">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !isYearly
                  ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isYearly
                  ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yearly (Save ~17%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-3xl bg-white dark:bg-vault-surface/40 border border-slate-200 dark:border-white/10 animate-pulse shadow-sm"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan._id || plan.razorpayPlanId}
                plan={plan}
                isCurrent={
                  subscription?.razorpayPlanId === plan.razorpayPlanId ||
                  subscription?.planName?.toLowerCase() === (plan.type || plan.slug)?.toLowerCase()
                }
                currentPlanAmount={subscription?.amount || 0}
                loading={actionLoading}
                onSelect={(p) => handleSelectPlan(p)}
                currentUsedStorage={usedStorage}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 9: PLAN COMPARISON MATRIX ── */}
      <div className="space-y-6 pt-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sliders size={20} className="text-accent-primary" /> Compare Plans
          </h2>
          <p className="text-slate-500 dark:text-white/50 text-xs font-medium mt-1">
            Detailed side-by-side feature comparison across storage tiers.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-vault-surface/80 backdrop-blur-xl overflow-x-auto custom-scrollbar shadow-sm">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <th className="p-4 sm:p-5 text-xs font-bold uppercase text-slate-500 dark:text-white/50">Feature</th>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <th key={p._id || p.razorpayPlanId} className="p-4 sm:p-5 text-sm font-black text-slate-900 dark:text-white">
                      {p.type || p.slug}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-800 dark:text-white/80">
              <tr>
                <td className="p-4 sm:p-5 font-semibold text-slate-500 dark:text-white/60">Storage Quota</td>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <td key={p._id} className="p-4 sm:p-5 font-bold text-accent-primary">
                      {formatSize(p.storage)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-semibold text-slate-500 dark:text-white/60">Max Devices</td>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <td key={p._id} className="p-4 sm:p-5 font-medium">
                      {p.rules?.maxDevicesLimit || (p.type?.includes("Ultimate") ? "Unlimited" : p.type?.includes("Pro") ? "5 Devices" : "2 Devices")}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-semibold text-slate-500 dark:text-white/60">Upload Speed</td>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <td key={p._id} className="p-4 sm:p-5 font-medium">
                      {p.type?.includes("Novice") ? "Standard Speed" : "10x Priority Speed"}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-semibold text-slate-500 dark:text-white/60">Version History</td>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <td key={p._id} className="p-4 sm:p-5 font-medium">
                      {p.type?.includes("Ultimate") ? "Unlimited History" : p.type?.includes("Pro") ? "30 Days" : "7 Days"}
                    </td>
                  ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 font-semibold text-slate-500 dark:text-white/60">Price ({isYearly ? "Yearly" : "Monthly"})</td>
                {plans
                  .filter((p) => p.period?.toLowerCase() === (isYearly ? "yearly" : "monthly"))
                  .map((p) => (
                    <td key={p._id} className="p-4 sm:p-5 font-bold text-slate-900 dark:text-white">
                      ₹{p.amount || p.price}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 6: INVOICES / BILLING HISTORY ── */}
      <div className="space-y-6 pt-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Download size={20} className="text-accent-primary" /> Billing History & Invoices
          </h2>
          <p className="text-slate-500 dark:text-white/50 text-xs font-medium mt-1">
            Download past payment invoices and billing statements.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-vault-surface/80 backdrop-blur-xl overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 dark:text-white/30">
                <CreditCard size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Billing History Yet</h4>
              <p className="text-xs text-slate-500 dark:text-white/40 max-w-sm mx-auto">
                Invoices will automatically appear here once payments are processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs uppercase font-bold text-slate-500 dark:text-white/50">
                    <th className="p-4">Invoice ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Billing Period</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-800 dark:text-white/80 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id || inv._id}>
                      <td className="p-4 font-mono text-accent-primary">{inv.id || "INV-1001"}</td>
                      <td className="p-4">{inv.date || "Aug 1, 2026"}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">₹{inv.amount || 299}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">
                          {inv.status || "Paid"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-white/60">{inv.period || "Aug 1 – Aug 31"}</td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 border border-slate-200 dark:border-white/10">
                          <Download size={12} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Component */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmModalAction}
        type={modalType}
        planData={targetPlan}
        loading={actionLoading}
      />
    </div>
  );
}
