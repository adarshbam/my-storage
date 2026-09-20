import mongoose from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTier from "../models/planTierModel.js";
import {
  GOOGLE_TESTER_EMAIL,
  GOOGLE_TESTER_PASSWORD,
  GOOGLE_TESTER_NAME,
  RECRUITER_EMAIL,
  RECRUITER_PASSWORD,
  RECRUITER_NAME,
} from "../config/config.js";
import { createUserWithRootDir } from "../utils/authHelpers.js";
import { invalidatePlanContextCache } from "../middlewares/loadPlanContext.js";
import { invalidateUserSessions } from "../databases/redis.js";

/**
 * Checks if an email corresponds to one of the reserved special accounts.
 * @param {string} email
 * @returns {boolean}
 */
export function isSpecialBypassAccount(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized === GOOGLE_TESTER_EMAIL.toLowerCase() ||
    normalized === RECRUITER_EMAIL.toLowerCase()
  );
}

/**
 * Checks if an email is specifically the Google Reviewer/Tester account.
 * @param {string} email
 * @returns {boolean}
 */
export function isGoogleTesterAccount(email) {
  if (!email || typeof email !== "string") return false;
  return email.toLowerCase().trim() === GOOGLE_TESTER_EMAIL.toLowerCase();
}

/**
 * Checks if an email is specifically the Recruiter Portfolio Demo account.
 * @param {string} email
 * @returns {boolean}
 */
export function isRecruiterAccount(email) {
  if (!email || typeof email !== "string") return false;
  return email.toLowerCase().trim() === RECRUITER_EMAIL.toLowerCase();
}

/**
 * Checks if a subscription ID is flagged as a lifetime permanent subscription.
 * @param {string} subscriptionId
 * @returns {boolean}
 */
export function isPermanentSubscription(subscriptionId) {
  if (!subscriptionId || typeof subscriptionId !== "string") return false;
  return subscriptionId.startsWith("sub_permanent_");
}

/**
 * Finds the Ultimate BillingPlan (or syncs default plans if not yet initialized).
 */
async function resolveUltimateBillingPlan() {
  let ultimatePlan = await BillingPlan.findOne({
    slug: { $regex: /^ultimate$/i },
    active: true,
  }).populate("tier");

  if (!ultimatePlan) {
    ultimatePlan = await BillingPlan.findOne({
      slug: { $regex: /^ultimate$/i },
    }).populate("tier");
  }

  if (!ultimatePlan) {
    console.log("[SpecialAccounts] Ultimate plan not found. Initializing default system plans...");
    try {
      const syncDefaultPlans = (await import("../utils/syncDefaultPlans.js")).default;
      await syncDefaultPlans(
        null,
        { status: () => ({ json: () => {} }) },
        () => {},
      );
    } catch (syncErr) {
      console.warn("[SpecialAccounts] Plan sync notice:", syncErr.message);
    }

    ultimatePlan = await BillingPlan.findOne({
      slug: { $regex: /^ultimate$/i },
    }).populate("tier");
  }

  return ultimatePlan;
}

/**
 * Idempotently provisions or synchronizes a single special account.
 */
async function provisionAccount({
  email,
  password,
  name,
  role,
  phonePlaceholder,
  subPrefix,
  ultimatePlan,
}) {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    console.log(`[SpecialAccounts] Creating dedicated ${role} account: ${normalizedEmail}`);
    const { userId } = await createUserWithRootDir({
      name,
      email: normalizedEmail,
      password,
      profilepicId: null,
      isVerified: true,
    });
    user = await User.findById(userId);
  } else {
    // Ensure credentials match environment configuration
    const isPasswordValid = await user.comparePassword(password).catch(() => false);
    if (!isPasswordValid) {
      console.log(`[SpecialAccounts] Updating credentials for ${normalizedEmail} to match configuration.`);
      user.password = password; // Triggers argon2 pre-save hook
    }
  }

  // Ensure critical flags are always enforced
  user.name = name;
  user.role = role;
  user.isVerified = true;
  user.phoneVerified = true;
  if (!user.phone) {
    user.phone = phonePlaceholder;
  }
  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.status = "Active";
  user.noSubscriptionSince = null;
  user.noPlanSince = null;
  if (ultimatePlan?.storage) {
    user.maxStorage = ultimatePlan.storage;
  }

  const razorpaySubscriptionId = `${subPrefix}_${user._id}`;
  let subscription = await Subscription.findOne({
    userId: user._id,
    razorpaySubscriptionId,
  });

  const lifetimeExpiry = new Date("2099-12-31T23:59:59.999Z");

  if (!subscription) {
    console.log(`[SpecialAccounts] Creating lifetime Ultimate subscription for ${normalizedEmail}`);
    subscription = await Subscription.create({
      userId: user._id,
      billingPlan: ultimatePlan?._id || null,
      razorpaySubscriptionId,
      category: "storage",
      status: "active",
      amount: ultimatePlan?.amount || 0,
      currency: ultimatePlan?.currency || "INR",
      isFreeTrial: false,
      purchasedAt: new Date(),
      activatedAt: new Date(),
      currentStart: new Date(),
      currentEnd: lifetimeExpiry,
      currentPeriodStart: new Date(),
      currentPeriodEnd: lifetimeExpiry,
      totalCount: 999999,
      paidCount: 1,
      remainingCount: 999999,
    });
  } else {
    subscription.status = "active";
    subscription.billingPlan = ultimatePlan?._id || subscription.billingPlan;
    subscription.isFreeTrial = false;
    subscription.currentEnd = lifetimeExpiry;
    subscription.currentPeriodEnd = lifetimeExpiry;
    await subscription.save();
  }

  user.subscription = subscription._id;
  user.billingPlan = ultimatePlan?._id || null;
  await user.save();

  // Invalidate any stale session or plan cache in Redis
  await invalidatePlanContextCache(user._id.toString());
  await invalidateUserSessions(user._id.toString());

  console.log(
    `[SpecialAccounts] ✅ Successfully verified ${role} account: ${normalizedEmail} (Subscription: ${razorpaySubscriptionId})`
  );
  return { user, subscription };
}

/**
 * Main provisioning function to ensure both special accounts are active and properly configured.
 */
export async function provisionSpecialAccounts() {
  try {
    console.log("[SpecialAccounts] Synchronizing special demonstration & testing accounts...");
    const ultimatePlan = await resolveUltimateBillingPlan();

    if (!ultimatePlan) {
      console.warn(
        "[SpecialAccounts] Warning: Ultimate billing plan could not be resolved. Accounts will be initialized with default storage."
      );
    }

    // 1. Provision Google App Reviewer Account (Role: User)
    await provisionAccount({
      email: GOOGLE_TESTER_EMAIL,
      password: GOOGLE_TESTER_PASSWORD,
      name: GOOGLE_TESTER_NAME,
      role: "User",
      phonePlaceholder: "+15550199999",
      subPrefix: "sub_permanent_tester",
      ultimatePlan,
    });

    // 2. Provision Recruiter Portfolio Showcase Account (Role: Owner)
    await provisionAccount({
      email: RECRUITER_EMAIL,
      password: RECRUITER_PASSWORD,
      name: RECRUITER_NAME,
      role: "Owner",
      phonePlaceholder: "+15550198888",
      subPrefix: "sub_permanent_recruiter",
      ultimatePlan,
    });

    console.log("[SpecialAccounts] ✨ Dual special accounts fully ready and active.");
    return true;
  } catch (error) {
    console.error("[SpecialAccounts] Provisioning error:", error);
    return false;
  }
}
