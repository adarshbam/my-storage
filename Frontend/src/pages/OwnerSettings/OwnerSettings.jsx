import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sliders,
  Sparkles,
  RefreshCw,
  Check,
  Zap,
  Layers,
  Grid,
  CreditCard,
  Eye,
  Shield,
} from "lucide-react";

import {
  initialSystemLimits,
  initialPlanTiers,
  initialBillingPlans,
  initialFeatures,
  initialPlanTierFeatureConfigs,
  initialPlanTierRuleConfigs,
} from "./initialOwnerData";

import GlobalSystemLimitsSection from "./GlobalSystemLimitsSection";
import BillingPlansSection from "./BillingPlansSection";
import PlanTiersSection from "./PlanTiersSection";
import PlanTierConfigurationSection from "./PlanTierConfigurationSection";
import FeatureCatalogueSection from "./FeatureCatalogueSection";
import PricingLivePreviewSection from "./PricingLivePreviewSection";
import { SERVER_URL } from "../../lib/api";

export default function OwnerSettings() {
  const navigate = useNavigate();

  // Pure frontend state — no backend requests
  const [limits, setLimits] = useState(initialSystemLimits);
  const [planTiers, setPlanTiers] = useState(initialPlanTiers);
  const [billingPlans, setBillingPlans] = useState(initialBillingPlans);
  const [features, setFeatures] = useState(initialFeatures);
  const [tierFeatureConfigs, setTierFeatureConfigs] = useState(
    initialPlanTierFeatureConfigs,
  );
  const [tierRuleConfigs, setTierRuleConfigs] = useState(
    initialPlanTierRuleConfigs,
  );

  const [activeTab, setActiveTab] = useState("all");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Handlers for state updates
  const handleLimitsChange = (field, val) => {
    setLimits((prev) => ({ ...prev, [field]: val }));
  };

  const handleUpdatePlan = (planId, field, val) => {
    setBillingPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId ? { ...plan, [field]: val } : plan,
      ),
    );
  };

  // Need to be configured with the backend
  const handleUpdateTierDetail = (tierType, field, val) => {
    setPlanTiers((prev) =>
      prev.map((tier) =>
        tier.type === tierType ? { ...tier, [field]: val } : tier,
      ),
    );
  };

  const handleCreateNewTier = (newTier) => {
    setPlanTiers((prev) => [...prev, newTier]);
    // Initialize empty feature & rule configs for the new tier
    setTierFeatureConfigs((prev) => ({
      ...prev,
      [newTier.type]: ["secure_storage", "share_links"],
    }));
    setTierRuleConfigs((prev) => ({
      ...prev,
      [newTier.type]: {
        allowUpload: true,
        allowDownload: true,
        allowSharing: true,
        maxConnectedDevices: 5,
        maxUploadSizeVal: 5,
        maxUploadSizeUnit: "GB",
        uploadSpeedMultiplier: "5x",
        deleteFilesAfterExpiry: "30 days",
        versionHistoryDays: "30",
      },
    }));
    showToast(`Created new plan tier "${newTier.title}"!`);
  };

  const handleToggleTierFeature = (tier, featureKey) => {
    setTierFeatureConfigs((prev) => {
      const currentKeys = prev[tier] || [];
      const updated = currentKeys.includes(featureKey)
        ? currentKeys.filter((k) => k !== featureKey)
        : [...currentKeys, featureKey];

      return {
        ...prev,
        [tier]: updated,
      };
    });
  };

  const handleUpdateTierRule = (tier, ruleKey, value) => {
    setTierRuleConfigs((prev) => ({
      ...prev,
      [tier]: {
        ...(prev[tier] || {}),
        [ruleKey]: value,
      },
    }));
  };

  const handleToggleFeatureEnabled = (featureId) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const handleResetDefaults = async () => {
    const res = await fetch(`${SERVER_URL}/owner-settings/reset`, {
      method: "PATCH",
      credentials: "include",
    });
    setLimits(initialSystemLimits);
    setPlanTiers(initialPlanTiers);
    setBillingPlans(initialBillingPlans);
    setFeatures(initialFeatures);
    setTierFeatureConfigs(initialPlanTierFeatureConfigs);
    setTierRuleConfigs(initialPlanTierRuleConfigs);
    showToast("Reset all frontend configurations to defaults.");
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans relative bg-slate-50 dark:bg-[#020b08] transition-colors duration-300 pb-24">
      {/* Background Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-500/10 via-teal-500/5 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-rose-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
              title="Return to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25">
                  Owner Dashboard
                </span>
                <span className="text-slate-400 text-xs font-semibold">/</span>
                <span className="text-slate-500 dark:text-white/40 text-xs font-semibold">
                  Settings
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Owner Control Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <RefreshCw size={14} /> Reset Defaults
            </button>

            <button
              onClick={() => showToast("Frontend state saved successfully!")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-black shadow-lg shadow-teal-500/20 hover:opacity-95 transition-opacity"
            >
              <Check size={14} strokeWidth={3} /> Save Configurations
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl border border-white/10 flex items-center gap-2 animate-bounce">
            <Sparkles
              size={14}
              className="text-emerald-400 dark:text-emerald-600"
            />
            {toastMessage}
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-200/60 dark:border-white/10 scrollbar-none">
          {[
            { id: "all", label: "All Sections", icon: Sliders },
            { id: "limits", label: "Global System Limits", icon: Zap },
            { id: "plans", label: "Billing Plans", icon: CreditCard },
            { id: "tiers", label: "Plan Tiers", icon: Sparkles },
            { id: "catalogue", label: "Feature Catalogue", icon: Layers },
            { id: "config", label: "Plan Tier Configuration", icon: Grid },
            { id: "preview", label: "Live Preview", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                    : "bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Sections Stack */}
        <div className="space-y-12">
          {(activeTab === "all" || activeTab === "limits") && (
            <GlobalSystemLimitsSection
              limits={limits}
              onChange={handleLimitsChange}
            />
          )}

          {(activeTab === "all" || activeTab === "plans") && (
            <BillingPlansSection
              billingPlans={billingPlans}
              planTiers={planTiers}
              onUpdatePlan={handleUpdatePlan}
            />
          )}

          {(activeTab === "all" || activeTab === "tiers") && (
            <PlanTiersSection
              planTiers={planTiers}
              onUpdateTierDetail={handleUpdateTierDetail}
              onCreateNewTier={handleCreateNewTier}
            />
          )}

          {(activeTab === "all" || activeTab === "catalogue") && (
            <FeatureCatalogueSection
              features={features}
              onToggleFeatureEnabled={handleToggleFeatureEnabled}
            />
          )}

          {(activeTab === "all" || activeTab === "config") && (
            <PlanTierConfigurationSection
              features={features}
              planTiers={planTiers}
              tierFeatureConfigs={tierFeatureConfigs}
              tierRuleConfigs={tierRuleConfigs}
              onToggleTierFeature={handleToggleTierFeature}
              onUpdateTierRule={handleUpdateTierRule}
            />
          )}

          {(activeTab === "all" || activeTab === "preview") && (
            <PricingLivePreviewSection
              billingPlans={billingPlans}
              planTiers={planTiers}
              tierFeatureConfigs={tierFeatureConfigs}
              tierRuleConfigs={tierRuleConfigs}
              features={features}
            />
          )}
        </div>
      </div>
    </div>
  );
}
