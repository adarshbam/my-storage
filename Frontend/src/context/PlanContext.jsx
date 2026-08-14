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

  const fetchPlanContext = useCallback(async () => {
    if (!user) {
      setPlanContext(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${SERVER_URL}/plan/current-plan-context`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        console.log(data);
        setPlanContext(data);
      }
    } catch (err) {
      console.error("Failed to load plan context:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlanContext();
  }, [fetchPlanContext]);

  const hasFeature = useCallback(
    (featureKey) => {
      if (!planContext?.features) return false;
      return planContext.features.some(
        (f) =>
          f.key === featureKey ||
          f.slug === featureKey ||
          f.name === featureKey ||
          f.title === featureKey,
      );
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
        throw new Error(data.error || data.message || "Failed to activate free trial");
      }
      await fetchPlanContext();
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
    loading,
    hasFeature,
    activateFreeTrial,
    refreshPlan: fetchPlanContext,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  return useContext(PlanContext);
}

