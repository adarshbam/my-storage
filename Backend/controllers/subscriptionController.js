import {
  createSubscriptionLogic,
  getCurrentSubscriptionLogic,
  pauseSubscriptionLogic,
  resumeSubscriptionLogic,
  cancelSubscriptionLogic,
  changePlanLogic
} from "../services/subscription.service.js";

export const createSubscription = async (req, res, next) => {
  try {
    const result = await createSubscriptionLogic({ planId: req.body.planId, userId: req.user.id });
    return res.json(result);
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const getCurrentSubscription = async (req, res, next) => {
  try {
    const result = await getCurrentSubscriptionLogic({
      userId: req.user._id || req.user.id,
      userUsedStorage: req.user.usedStorage,
      userMaxStorage: req.user.maxStorage
    });
    return res.json(result);
  } catch (err) {
    console.error("[getCurrentSubscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const pauseSubscription = async (req, res, next) => {
  try {
    const result = await pauseSubscriptionLogic({ subscriptionId: req.params.id, userId: req.user.id });
    return res.json(result);
  } catch (err) {
    console.error("[pauseSubscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const resumeSubscription = async (req, res, next) => {
  try {
    const result = await resumeSubscriptionLogic({ subscriptionId: req.params.id, userId: req.user.id });
    return res.json(result);
  } catch (err) {
    console.error("[resumeSubscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await cancelSubscriptionLogic({
      subscriptionId: req.params.id,
      userId: req.user.id,
      cancelAtCycleEnd: req.body.cancelAtCycleEnd
    });
    return res.json(result);
  } catch (err) {
    console.error("[cancelSubscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const changePlan = async (req, res, next) => {
  try {
    const result = await changePlanLogic({ targetPlanId: req.body.targetPlanId, userId: req.user.id });
    return res.json(result);
  } catch (err) {
    console.error("[changePlan] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};
