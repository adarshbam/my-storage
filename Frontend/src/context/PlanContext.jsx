import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "./AuthContext";

const PlanContext = createContext();

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [planContext, setPlanContext] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPlanContext = useCallback(async (silent = false) => {
    if (!user) {
      setPlanContext(null);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${SERVER_URL}/plan/current-plan-context`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPlanContext(data);
      }
    } catch (err) {
      console.error("Failed to load plan context:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlanContext(false);

    // 1. Live Sync listeners for subscription & plan updates
    const handleSync = () => {
      fetchPlanContext(true);
    };
    window.addEventListener("subscription:updated", handleSync);
    window.addEventListener("plan:updated", handleSync);
    window.addEventListener("auth:refresh", handleSync);

    // 2. Real-time refresh when switching back to tab/window
    const handleFocus = () => {
      fetchPlanContext(true);
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPlanContext(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 3. Live-polling interval (every 4s) to ensure instant real-time sync
    const pollInterval = setInterval(() => {
      fetchPlanContext(true);
    }, 4000);

    return () => {
      window.removeEventListener("subscription:updated", handleSync);
      window.removeEventListener("plan:updated", handleSync);
      window.removeEventListener("auth:refresh", handleSync);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(pollInterval);
    };
  }, [fetchPlanContext]);

  const hasFeature = useCallback(
    (featureKey) => {
      if (!planContext?.features || !Array.isArray(planContext.features)) return false;
      const normalize = (s) => (s || "").toLowerCase().replace(/[-_\s]+/g, "");
      const target = normalize(featureKey);

      return planContext.features.some((f) => {
        if (!f) return false;
        if (typeof f === "string") {
          const normF = normalize(f);
          return (
            normF === target ||
            (target.includes("gdrive") && normF.includes("gdrive")) ||
            (target.includes("googledrive") && (normF.includes("gdrive") || normF.includes("googledrive")))
          );
        }
        const k = normalize(f.key);
        const s = normalize(f.slug);
        const n = normalize(f.name);
        const t = normalize(f.title);

        if (k === target || s === target || n === target || t === target) return true;

        // Aliases for Google Drive
        if (
          (target === "gdrivesync" ||
            target === "googledrive" ||
            target === "googledriveintegration" ||
            target === "gdrive") &&
          (k === "gdrivesync" ||
            k === "googledrive" ||
            k === "googledriveintegration" ||
            k === "gdrive" ||
            t.includes("googledrive") ||
            t.includes("gdrive"))
        ) {
          return true;
        }

        // Aliases for GitHub
        if (
          (target === "githubbackup" ||
            target === "github" ||
            target === "githubintegration") &&
          (k === "githubbackup" || k === "github" || t.includes("github"))
        ) {
          return true;
        }

        // Aliases for Dropbox
        if (
          (target === "dropboxsync" ||
            target === "dropbox" ||
            target === "dropboxintegration") &&
          (k === "dropboxsync" || k === "dropbox" || t.includes("dropbox"))
        ) {
          return true;
        }

        return false;
      });
    },
    [planContext],
  );

  const activateFreeTrial = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SERVER_URL}/plan/activate-free-trial`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || data.message || "Failed to activate free trial",
        );
      }
      await fetchPlanContext(false);
      window.dispatchEvent(new Event("subscription:updated"));
      window.dispatchEvent(new Event("plan:updated"));
      return { success: true, message: data.message };
    } catch (err) {
      console.error("Free trial activation error:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchPlanContext]);

  const isNoSubscription = !!(
    planContext?.isNoSubscription ?? planContext?.isNoPlan
  );

  const storageLimit =
    planContext?.storageLimit ??
    planContext?.rules?.limits?.storageLimit ??
    planContext?.billingPlan?.storage ??
    5368709120;

  const permissions = planContext?.rules?.permissions || {
    allowUpload: true,
    allowDownload: true,
    allowSharing: true,
    allowEdit: true,
    allowMove: true,
    allowCopy: true,
    allowDelete: true,
  };

  const limits = planContext?.rules?.limits || {
    storageLimit,
    maxConnectedDevices: 5,
    maxUploadFileSize: 5368709120,
  };

  const settings = planContext?.rules?.settings || {
    uploadSpeedMultiplier: 1,
    versionHistoryDays: 30,
    deleteFilesAfterExpiryDays: 0,
  };

  const maxUploadFileSize = limits.maxUploadFileSize || 5368709120;
  const allowUpload = permissions.allowUpload !== false;
  const allowDownload = permissions.allowDownload !== false;
  const allowSharing = permissions.allowSharing !== false;

  const value = {
    planContext,
    isNoSubscription,
    isNoPlan: isNoSubscription, // alias for seamless compatibility
    canUseFreeTrial: !!planContext?.canUseFreeTrial,
    noSubscriptionDays:
      planContext?.noSubscriptionDays ?? planContext?.noPlanDays ?? 0,
    noPlanDays: planContext?.noSubscriptionDays ?? planContext?.noPlanDays ?? 0,
    daysUntilPurge: planContext?.daysUntilPurge ?? 60,
    subscription: planContext?.subscription || null,
    billingPlan: planContext?.billingPlan || null,
    planTier: planContext?.planTier || null,
    features: planContext?.features || [],
    rules: planContext?.rules || {},
    permissions,
    limits,
    settings,
    maxUploadFileSize,
    allowUpload,
    allowDownload,
    allowSharing,
    storageLimit,
    maxStorage: storageLimit,
    loading,
    hasFeature,
    activateFreeTrial,
    refreshPlan: () => fetchPlanContext(false),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  return useContext(PlanContext);
}

