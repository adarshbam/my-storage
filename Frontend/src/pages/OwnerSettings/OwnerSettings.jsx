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
import { useEffect } from "react";

export default function OwnerSettings() {
  const navigate = useNavigate();

  // Pure frontend state — no backend requests
  const [limits, setLimits] = useState({});
  const [planTiers, setPlanTiers] = useState([]);
  const [billingPlans, setBillingPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [tierFeatureConfigs, setTierFeatureConfigs] = useState({});
  const [tierRuleConfigs, setTierRuleConfigs] = useState({});

  const [activeTab, setActiveTab] = useState("all");
  const [toastMessage, setToastMessage] = useState(null);

  async function getOwnerSettings() {
    const res = await fetch(`${SERVER_URL}/owner-settings`, {
      credentials: "include",
    });
    const ownerSettings = await res.json();

    if (res.ok) {
      setLimits(ownerSettings.limits);
      setPlanTiers(ownerSettings.planTiers);
      setBillingPlans(ownerSettings.billingPlans);
      setFeatures(ownerSettings.features);
      setTierFeatureConfigs(
        Object.assign(
          {},
          ...ownerSettings.tiersConfigs.flatMap((tier) => {
            if (!Array.isArray(tier.features)) return { [tier.slug]: [] };
            return {
              [tier.slug]: tier.features
                .filter((feature) => feature.key)
                .map((feature) => feature.key),
            };
          }),
        ),
      );
      setTierRuleConfigs(
        Object.assign(
          {},
          ...ownerSettings.tiersConfigs.flatMap((tier) => {
            return {
              [tier.slug]: tier.rules,
            };
          }),
        ),
      );
    }
  }

  useEffect(() => {
    getOwnerSettings();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Handlers for state updates
  const handleLimitsChange = async (field, val) => {
    setLimits((prev) => ({ ...prev, [field]: val }));
  };

  const handleGlobalLimits = async () => {
    const res = await fetch(`${SERVER_URL}/owner-settings/global`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json", // 2. Set the content type header
      },
      body: JSON.stringify(limits),
    });
    const globalSystemLimits = await res.json();
    console.log(globalSystemLimits);

    if (res.ok) {
      setLimits(globalSystemLimits);
      showToast("Global system limits saved successfully!");
    }
  };

  const handleUpdatePlan = (planId, field, val) => {
    setBillingPlans((prev) =>
      prev.map((plan) =>
        plan._id === planId ? { ...plan, [field]: val } : plan,
      ),
    );
  };

  const handleSaveBillingPlans = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/plans/update-plans`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingPlans),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          setBillingPlans((prev) =>
            prev.map((p) => {
              const updated = data.find((item) => item._id === p._id);
              return updated ? { ...p, ...updated } : p;
            }),
          );
        }
        showToast("All billing plans saved successfully!");
      } else {
        showToast(data.error || "Failed to save billing plans.");
      }
    } catch (err) {
      console.error("[handleSaveBillingPlans] Error:", err);
      showToast("Error connecting to server.");
    }
  };

  // Save handlers for each section
  const handleSavePlanTiers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/owner-settings/tiers`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planTiers),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          setPlanTiers((prev) =>
            prev.map((t) => {
              const updated = data.find(
                (item) => item._id === t._id || item.slug === t.slug,
              );
              return updated ? { ...t, ...updated } : t;
            }),
          );
        }
        showToast("Plan tiers saved successfully!");
      } else {
        showToast(data.error || "Failed to save plan tiers.");
      }
    } catch (err) {
      console.error("[handleSavePlanTiers] Error:", err);
      showToast("Error connecting to server.");
    }
  };

  const handleSaveFeatures = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/owner-settings/features`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(features),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          setFeatures((prev) =>
            prev.map((f) => {
              const updated = data.find((item) => item._id === f._id);
              return updated ? { ...f, ...updated } : f;
            }),
          );
        }
        showToast("Feature catalogue saved successfully!");
      } else {
        showToast(data.error || "Failed to save feature catalogue.");
      }
    } catch (err) {
      console.error("[handleSaveFeatures] Error:", err);
      showToast("Error connecting to server.");
    }
  };

  const handleSaveConfigurations = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/owner-settings/configurations`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tierFeatureConfigs,
          tierRuleConfigs,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.tierFeatureConfigs)
          setTierFeatureConfigs(data.tierFeatureConfigs);
        if (data.tierRuleConfigs) setTierRuleConfigs(data.tierRuleConfigs);
        showToast("Tier configurations saved successfully!");
      } else {
        showToast(data.error || "Failed to save tier configurations.");
      }
    } catch (err) {
      console.error("[handleSaveConfigurations] Error:", err);
      showToast("Error connecting to server.");
    }
  };

  // Handlers for state updates
  const handleUpdateTierDetail = async (tierSlug, field, val) => {
    setPlanTiers((prev) =>
      prev.map((tier) =>
        tier.slug === tierSlug ? { ...tier, [field]: val } : tier,
      ),
    );

    if (field === "active") {
      try {
        const res = await fetch(`${SERVER_URL}/owner-settings/tier/active`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slug: tierSlug, active: val }),
        });
        const data = await res.json();
        if (res.ok) {
          const { updatedTier, updatedBillingPlans } = data;
          if (updatedTier) {
            setPlanTiers((prev) =>
              prev.map((tier) =>
                tier.slug === updatedTier.slug
                  ? { ...tier, ...updatedTier }
                  : tier,
              ),
            );
          }
          if (Array.isArray(updatedBillingPlans)) {
            setBillingPlans((prev) =>
              prev.map((bp) => {
                const match = updatedBillingPlans.find(
                  (ubp) => ubp._id === bp._id || ubp.slug === bp.slug,
                );
                return match ? { ...bp, active: match.active } : bp;
              }),
            );
          }
          showToast(
            `Plan tier "${tierSlug}" is now ${val ? "active" : "inactive"}.`,
          );
        } else {
          showToast(data.error || "Failed to update tier active status.");
          setPlanTiers((prev) =>
            prev.map((tier) =>
              tier.slug === tierSlug ? { ...tier, active: !val } : tier,
            ),
          );
        }
      } catch (err) {
        console.error(
          "[handleUpdateTierDetail] Error updating tier active:",
          err,
        );
        showToast("Error connecting to server.");
      }
    }
  };

  const handleCreateNewTier = async (newTier) => {
    const slugKey =
      newTier.slug || newTier.type.toLowerCase().replace(/\s+/g, "-");
    const tierPayload = { ...newTier, slug: slugKey };

    try {
      const res = await fetch(`${SERVER_URL}/owner-settings/tier`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tierPayload),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.newTier) {
          setPlanTiers((prev) => [...prev, data.newTier]);
        }
        if (Array.isArray(data.createdBillingPlans)) {
          setBillingPlans((prev) => [...prev, ...data.createdBillingPlans]);
        }
        setTierFeatureConfigs((prev) => ({
          ...prev,
          [slugKey]: ["secure_storage", "share_links"],
        }));
        setTierRuleConfigs((prev) => ({
          ...prev,
          [slugKey]: {
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
      } else {
        showToast(data.error || "Failed to create plan tier.");
      }
    } catch (err) {
      console.error("[handleCreateNewTier] Error:", err);
      showToast(`Created new plan tier "${newTier.title}" locally!`);
    }
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
      prev.map((f) =>
        f._id === featureId ? { ...f, enabled: !f.enabled } : f,
      ),
    );
  };

  const handleResetDefaults = async () => {
    try {
      showToast("Resetting configurations to defaults...");
      const res = await fetch(`${SERVER_URL}/owner-settings/reset`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await getOwnerSettings();
        showToast(data.message || "Reset all configurations to defaults successfully!");
      } else {
        showToast(data.error || "Failed to reset configurations.");
      }
    } catch (err) {
      console.error("[handleResetDefaults] Error:", err);
      showToast("Error resetting configurations.");
    }
  };

  const handleSaveAll = async () => {
    try {
      showToast("Saving all configurations to database...");
      await Promise.all([
        fetch(`${SERVER_URL}/owner-settings/global`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(limits),
        }),
        fetch(`${SERVER_URL}/plans/update-plans`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(billingPlans),
        }),
        fetch(`${SERVER_URL}/owner-settings/tiers`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planTiers),
        }),
        fetch(`${SERVER_URL}/owner-settings/features`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(features),
        }),
        fetch(`${SERVER_URL}/owner-settings/configurations`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tierFeatureConfigs,
            tierRuleConfigs,
          }),
        }),
      ]);
      await getOwnerSettings();
      showToast("All owner configurations saved and applied successfully!");
    } catch (err) {
      console.error("[handleSaveAll] Error:", err);
      showToast("Error saving configurations.");
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans relative bg-vault-bg transition-colors duration-300 pb-24">
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
              onClick={handleSaveAll}
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
              handleGlobalLimits={handleGlobalLimits}
            />
          )}

          {(activeTab === "all" || activeTab === "plans") && (
            <BillingPlansSection
              billingPlans={billingPlans}
              planTiers={planTiers.filter((planTier) => planTier.active)}
              onUpdatePlan={handleUpdatePlan}
              onSavePlans={handleSaveBillingPlans}
            />
          )}

          {(activeTab === "all" || activeTab === "tiers") && (
            <PlanTiersSection
              planTiers={planTiers}
              onUpdateTierDetail={handleUpdateTierDetail}
              onCreateNewTier={handleCreateNewTier}
              onSaveTiers={handleSavePlanTiers}
            />
          )}

          {(activeTab === "all" || activeTab === "catalogue") && (
            <FeatureCatalogueSection
              features={features}
              onToggleFeatureEnabled={handleToggleFeatureEnabled}
              onSaveFeatures={handleSaveFeatures}
            />
          )}

          {(activeTab === "all" || activeTab === "config") && (
            <PlanTierConfigurationSection
              features={features}
              planTiers={planTiers.filter((planTier) => planTier.active)}
              tierFeatureConfigs={tierFeatureConfigs}
              tierRuleConfigs={tierRuleConfigs}
              onToggleTierFeature={handleToggleTierFeature}
              onUpdateTierRule={handleUpdateTierRule}
              onSaveConfigurations={handleSaveConfigurations}
            />
          )}

          {(activeTab === "all" || activeTab === "preview") && (
            <PricingLivePreviewSection
              billingPlans={billingPlans}
              planTiers={planTiers.filter((planTier) => planTier.active)}
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
