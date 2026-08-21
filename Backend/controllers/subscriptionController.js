import {
  createSubscriptionLogic,
  getCurrentSubscriptionLogic,
  pauseSubscriptionLogic,
  resumeSubscriptionLogic,
  cancelSubscriptionLogic,
  confirmSubscriptionPaymentLogic,
} from "../services/subscription.service.js";
import { invalidatePlanContextCache } from "../middlewares/loadPlanContext.js";

export const createSubscription = async (req, res, next) => {
  try {
    const result = await createSubscriptionLogic({
      planId: req.body.planId,
      userId: req.user.id,
    });
    return res.json(result);
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const confirmSubscriptionPayment = async (req, res, next) => {
  try {
    const result = await confirmSubscriptionPaymentLogic({
      razorpaySubscriptionId:
        req.body.razorpaySubscriptionId || req.body.subscriptionId,
      razorpayPaymentId: req.body.razorpayPaymentId || req.body.paymentId,
      userId: req.user.id || req.user._id,
    });
    return res.json(result);
  } catch (err) {
    console.error("[confirmSubscriptionPayment] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const getCurrentSubscription = async (req, res, next) => {
  try {
    const result = await getCurrentSubscriptionLogic({
      userId: req.user._id || req.user.id,
      userUsedStorage: req.user.usedStorage,
      userMaxStorage: req.user.maxStorage,
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
    const result = await pauseSubscriptionLogic({
      subscriptionId:
        req.params.id || req.body?.subscriptionId || req.user?.subscription,
      userId: req.user.id || req.user._id,
    });
    await invalidatePlanContextCache(req.user.id || req.user._id);
    return res.json(result);
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const resumeSubscription = async (req, res, next) => {
  try {
    const result = await resumeSubscriptionLogic({
      subscriptionId:
        req.params.id || req.body?.subscriptionId || req.user?.subscription,
      userId: req.user.id || req.user._id,
    });
    await invalidatePlanContextCache(req.user.id || req.user._id);
    return res.json(result);
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await cancelSubscriptionLogic({
      subscriptionId:
        req.params.id || req.body?.subscriptionId || req.user?.subscription,
      userId: req.user.id || req.user._id,
      cancelAtCycleEnd: req.body?.cancelAtCycleEnd ?? true,
    });
    await invalidatePlanContextCache(req.user.id || req.user._id);
    return res.json(result);
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};
