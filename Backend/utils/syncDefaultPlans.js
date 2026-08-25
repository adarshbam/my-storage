import BillingPlan from "../models/billingPlanModel.js";
import Feature from "../models/featureModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import SystemConfig from "../models/systemConfigModel.js";
import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import { invalidateGlobalPlanCache } from "../databases/redis.js";

export const initialPlanTiers = [
  {
    slug: "free-trial",
    type: "Free Trial",
    title: "Free Trial",
    description: "Try 100% of Ultimate features free for 30 days with a 5 GB quota.",
    badge: "30 Days Free",
    accentColor: "emerald",
    active: true,
  },
  {
    slug: "novice",
    type: "Novice",
    title: "Novice Vault",
    description: "1 TB secure storage for personal files, photos, and documents.",
    badge: "Personal",
    accentColor: "purple",
    active: true,
  },
  {
    slug: "professional",
    type: "Professional",
    title: "Professional",
    description:
      "Designed for power users with priority speed, cloud linkage, and AI search.",
    badge: "Most Popular",
    accentColor: "rose",
    active: true,
  },
  {
    slug: "ultimate",
    type: "Ultimate",
    title: "Ultimate Enterprise",
    description:
      "Full capability suite with 15 TB storage for power teams and total backup.",
    badge: "Best Value",
    accentColor: "sky",
    active: true,
  },
];

export const initialBillingPlans = [
  {
    period: "Monthly",
    slug: "free-trial",
    amount: 0,
    currency: "INR",
    storage: 5368709120, // 5 GB
    active: true,
    version: 1,
    description: "30-day free trial tier with 5 GB storage and full Ultimate features.",
  },
  {
    period: "Monthly",
    slug: "novice",
    amount: 199,
    currency: "INR",
    storage: 1099511627776, // 1 TB
    active: true,
    version: 1,
    description: "1 TB secure storage for personal files and photos.",
  },
  {
    slug: "novice",
    period: "Yearly",
    amount: 1999,
    currency: "INR",
    storage: 1099511627776, // 1 TB
    active: true,
    version: 1,
    description: "1 TB secure storage billed annually (2 months free).",
  },
  {
    slug: "professional",
    period: "Monthly",
    amount: 499,
    currency: "INR",
    storage: 5497558138880, // 5 TB
    active: true,
    version: 1,
    description:
      "5 TB storage with priority speed, cloud linkage and integrations.",
  },
  {
    slug: "professional",
    period: "Yearly",
    amount: 4999,
    currency: "INR",
    storage: 5497558138880, // 5 TB
    active: true,
    version: 1,
    description:
      "5 TB storage billed annually with priority speed and linkage.",
  },
  {
    slug: "ultimate",
    period: "Monthly",
    amount: 1199,
    currency: "INR",
    storage: 16492674416640, // 15 TB
    active: true,
    version: 1,
    description:
      "15 TB power storage for teams, AI search and unlimited versioning.",
  },
  {
    slug: "ultimate",
    period: "Yearly",
    amount: 11999,
    currency: "INR",
    storage: 16492674416640, // 15 TB
    active: true,
    version: 1,
    description: "15 TB annual power tier for teams and total backup.",
  },
];

export const initialFeatures = [
  {
    key: "secure_storage",
    title: "Secure Vault Storage",
    description: "AES-256 encrypted cloud file vault storage.",
    category: "Storage",
    enabled: true,
  },
  {
    key: "folder_upload",
    title: "Folder Hierarchy Upload",
    description:
      "Upload entire directory trees while preserving folder structure.",
    category: "Storage",
    enabled: true,
  },
  {
    key: "share_links",
    title: "Public Share Links",
    description: "Generate shareable links with read and download access.",
    category: "Sharing",
    enabled: true,
  },
  {
    key: "password_links",
    title: "Password Protected Links",
    description: "Protect shared files with secret access passcodes.",
    category: "Security",
    enabled: true,
  },
  {
    key: "expiring_links",
    title: "Expiring Access Links",
    description: "Set self-destruct time limits on public file shares.",
    category: "Security",
    enabled: true,
  },
  {
    key: "gdrive_sync",
    title: "Google Drive Integration",
    description: "Direct import and seamless sync with Google Drive accounts.",
    category: "Integrations",
    enabled: true,
  },
  {
    key: "dropbox_sync",
    title: "Dropbox Integration",
    description: "Connect and sync files directly with Dropbox vaults.",
    category: "Integrations",
    enabled: true,
  },
  {
    key: "github_backup",
    title: "GitHub Repository Backup",
    description: "Automated snapshot backup of code repositories.",
    category: "Integrations",
    enabled: true,
  },
  {
    key: "ai_search",
    title: "AI Semantic Search",
    description: "Natural language search across file contents and metadata.",
    category: "AI",
    enabled: true,
  },
  {
    key: "priority_speed",
    title: "Priority Upload Acceleration",
    description: "10x faster multi-part upload bandwidth pipes.",
    category: "Performance",
    enabled: true,
  },
  {
    key: "version_history",
    title: "Unlimited Version History",
    description: "Restore previous file revisions without auto-pruning.",
    category: "Storage",
    enabled: true,
  },
  {
    key: "priority_support",
    title: "24/7 Priority Support",
    description: "Dedicated account support channel with SLA guarantee.",
    category: "Support",
    enabled: true,
  },
];

// Free Trial gets 100% of the Ultimate features (Sandbox of Ultimate)
export const initialPlanTierFeatureConfigs = {
  "free-trial": [
    "secure_storage",
    "folder_upload",
    "share_links",
    "password_links",
    "expiring_links",
    "gdrive_sync",
    "dropbox_sync",
    "github_backup",
    "ai_search",
    "priority_speed",
    "version_history",
    "priority_support",
  ],
  novice: [
    "secure_storage",
    "folder_upload",
    "share_links",
    "password_links",
    "expiring_links",
  ],
  professional: [
    "secure_storage",
    "folder_upload",
    "share_links",
    "password_links",
    "expiring_links",
    "gdrive_sync",
    "dropbox_sync",
    "ai_search",
    "priority_speed",
  ],
  ultimate: [
    "secure_storage",
    "folder_upload",
    "share_links",
    "password_links",
    "expiring_links",
    "gdrive_sync",
    "dropbox_sync",
    "github_backup",
    "ai_search",
    "priority_speed",
    "version_history",
    "priority_support",
  ],
};

export const initialPlanTierRuleConfigs = {
  "free-trial": {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
      allowEdit: true,
      allowMove: true,
      allowCopy: true,
      allowDelete: true,
    },
    limits: {
      storageLimit: 5368709120, // 5 GB
      maxConnectedDevices: 5,
      maxUploadFileSize: 2147483648, // 2 GB
    },
    settings: {
      uploadSpeedMultiplier: 10,
      versionHistoryDays: 30,
      deleteFilesAfterExpiryDays: 30, // 30 days read-only rescue window after lapse
    },
  },
  novice: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
      allowEdit: true,
      allowMove: true,
      allowCopy: true,
      allowDelete: true,
    },
    limits: {
      storageLimit: 1099511627776, // 1 TB
      maxConnectedDevices: 5,
      maxUploadFileSize: 5368709120, // 5 GB
    },
    settings: {
      uploadSpeedMultiplier: 5,
      versionHistoryDays: 90,
      deleteFilesAfterExpiryDays: 0, // Never while active
    },
  },
  professional: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
      allowEdit: true,
      allowMove: true,
      allowCopy: true,
      allowDelete: true,
    },
    limits: {
      storageLimit: 5497558138880, // 5 TB
      maxConnectedDevices: 10,
      maxUploadFileSize: 10737418240, // 10 GB
    },
    settings: {
      uploadSpeedMultiplier: 10,
      versionHistoryDays: 365,
      deleteFilesAfterExpiryDays: 0, // Never while active
    },
  },
  ultimate: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
      allowEdit: true,
      allowMove: true,
      allowCopy: true,
      allowDelete: true,
    },
    limits: {
      storageLimit: 16492674416640, // 15 TB
      maxConnectedDevices: 20,
      maxUploadFileSize: 21474836480, // 20 GB
    },
    settings: {
      uploadSpeedMultiplier: 20,
      versionHistoryDays: 0, // Unlimited
      deleteFilesAfterExpiryDays: 0, // Never while active
    },
  },
};

export const initialSystemConfig = {
  maxDevicesLimit: 3,
  maxFileSizeValue: 500,
  maxFileSizeUnit: "MB",
  sessionTimeoutValue: 24,
  sessionTimeoutUnit: "Hours",
  defaultStorageUnit: "GB",
};

/**
 * Dynamically generate a Razorpay Plan or return existing/fallback
 */
async function resolveRazorpayPlanId(billingPlan) {
  if (!billingPlan.amount || billingPlan.amount === 0) {
    return null;
  }

  const planCurrency = (billingPlan.currency || "INR").toUpperCase();
  const rzAmount = Math.round(billingPlan.amount * 100);

  try {
    const newRzPlan = await rzInstance.plans.create({
      period: billingPlan.period.toLowerCase(),
      interval: 1,
      item: {
        name: `${billingPlan.slug} - ${billingPlan.period}`,
        amount: rzAmount,
        currency: planCurrency,
        description: billingPlan.description || `${billingPlan.slug} ${billingPlan.period} subscription`,
      },
    });

    console.log(
      `[syncDefaultPlans] Created dynamic Razorpay Plan for ${billingPlan.slug} (${billingPlan.period}):`,
      newRzPlan.id,
    );
    return newRzPlan.id;
  } catch (rzErr) {
    const existing = await BillingPlan.findOne({
      slug: billingPlan.slug,
      period: billingPlan.period,
      amount: billingPlan.amount,
      razorpayPlanId: { $exists: true, $ne: "" },
    });

    if (existing?.razorpayPlanId) {
      return existing.razorpayPlanId;
    }

    console.warn(
      `[syncDefaultPlans] Razorpay API unavailable, using deterministic fallback for ${billingPlan.slug}:`,
      rzErr?.error?.description || rzErr.message,
    );
    return `plan_${billingPlan.slug}_${billingPlan.period.toLowerCase()}_dynamic`;
  }
}

const resetToDefaultSettings = async (req, res, next) => {
  try {
    // 1. Global System Config reset or initial set
    const globalSystemConfig = await SystemConfig.findOneAndUpdate(
      { key: "global" },
      { $set: initialSystemConfig },
      { upsert: true, returnDocument: "after" },
    );

    // 2. Initial Features reset or initial Set in parallel
    await Promise.all(
      initialFeatures.map((f) =>
        Feature.findOneAndUpdate(
          { key: f.key },
          {
            $set: {
              title: f.title,
              key: f.key,
              category: f.category,
              description: f.description,
              enabled: f.enabled,
            },
          },
          { upsert: true, returnDocument: "after" },
        ),
      ),
    );

    // 3. Plan Tiers & Tier Configurations reset or initial Set
    await Promise.all(
      initialPlanTiers.map(async (planTier) => {
        const { slug, title, description, accentColor, active } = planTier;
        const currentPlanTier = await PlanTier.findOneAndUpdate(
          { slug },
          { $set: { slug, title, description, accentColor, active } },
          { upsert: true, returnDocument: "after" },
        );

        const currentPlanFeatures = await Feature.find({
          key: { $in: initialPlanTierFeatureConfigs[slug] || [] },
        }).select("_id");

        const tierRules = initialPlanTierRuleConfigs[slug] || {};

        await PlanTierConfiguration.findOneAndUpdate(
          { tier: currentPlanTier._id, slug },
          {
            $set: {
              tier: currentPlanTier._id,
              slug,
              features: currentPlanFeatures.map((f) => f._id),
              rules: tierRules,
            },
          },
          { upsert: true, returnDocument: "after" },
        );
      }),
    );

    // Remove any legacy/invalid Yearly Free Trial plans from database
    await BillingPlan.deleteMany({
      slug: { $in: ["free-trial", "free-trail"] },
      period: "Yearly",
    });

    // 5. Seed default billing plans with robust Razorpay Plan ID resolution
    await Promise.all(
      initialBillingPlans.map(async (billingPlan) => {
        const { slug, amount, period, description, version, storage, active, currency } = billingPlan;
        const currentPlanTier = await PlanTier.findOne({ slug });
        const dynamicRazorpayId = await resolveRazorpayPlanId(billingPlan);

        await BillingPlan.findOneAndUpdate(
          { slug, period },
          {
            $set: {
              tier: currentPlanTier?._id || null,
              slug,
              amount,
              period,
              description,
              version,
              storage,
              active,
              currency,
              ...(dynamicRazorpayId ? { razorpayPlanId: dynamicRazorpayId } : {}),
            },
          },
          { upsert: true, returnDocument: "after" },
        );
      }),
    );

    console.log("[syncDefaultPlans] Successfully reset all settings to defaults.");
    await invalidateGlobalPlanCache();

    if (res && typeof res.status === "function") {
      return res.status(200).json({
        success: true,
        message: "Default system limits, plan tiers, dynamic Razorpay billing plans, and feature catalogue synchronized successfully.",
        globalSystemConfig,
      });
    }
  } catch (err) {
    console.error("[syncDefaultPlans] Error during reset:", err);
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        success: false,
        error: "Failed to reset settings to default: " + err.message,
      });
    }
    throw err;
  }
};

export default resetToDefaultSettings;

