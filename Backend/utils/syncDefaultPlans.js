import BillingPlan from "../models/billingPlanModel.js";
import Feature from "../models/featureModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import SystemConfig from "../models/systemConfigModel.js";

export const initialPlanTiers = [
  {
    slug: "free-trial",
    type: "Free Trial",
    title: "Free Trial",
    description: "Try everything free for 30 days with essential features.",
    badge: "30 Days Free",
    accentColor: "emerald",
    active: true,
  },
  {
    slug: "novice",
    type: "Novice",
    title: "Novice Vault",
    description: "1 TB secure storage for personal files and photos.",
    badge: "Personal",
    accentColor: "purple",
    active: true,
  },
  {
    slug: "professional",
    type: "Professional",
    title: "Professional",
    description:
      "Designed for creators and power users with priority speed and AI search.",
    badge: "Most Popular",
    accentColor: "rose",
    active: true,
  },
  {
    slug: "ultimate",
    type: "Ultimate",
    title: "Ultimate Enterprise",
    description:
      "Everything included with 15 TB storage for teams and total backup.",
    badge: "Best Value",
    accentColor: "sky",
    active: true,
  },
];

export const initialBillingPlans = [
  {
    period: "Monthly",
    slug: "free-trail",
    amount: 0,
    currency: "USD",
    storage: 5368709120, // 5 GB
    razorpayPlanId: "plan_free_0000",
    active: true,
    version: 1,
    description: "30-day free trial tier with 5 GB storage.",
  },
  {
    period: "Yearly",
    slug: "free-trail",
    amount: 0,
    currency: "USD",
    storage: 5368709120, // 5 GB
    razorpayPlanId: "plan_free_0000_yr",
    active: true,
    version: 1,
    description: "Annual free trial tier with 5 GB storage.",
  },
  {
    period: "Monthly",
    slug: "novice",
    amount: 199,
    currency: "INR",
    storage: 1099511627776, // 1 TB
    razorpayPlanId: "plan_TLhlNqWa9N7Eds",
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
    razorpayPlanId: "plan_TLhpKywIQbITby",
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
    razorpayPlanId: "plan_TLhqYa2YW08mV0",
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
    razorpayPlanId: "plan_TLhsDtgn6S2jzn",
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
    razorpayPlanId: "plan_TLhu6W2TP8aXLF",
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
    razorpayPlanId: "plan_TLhvIDwdeWiEmn",
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

export const initialPlanTierFeatureConfigs = {
  "free-trial": ["secure_storage", "share_links"],
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
    },
    limits: {
      storageLimit: 5368709120, // 5 GB
      maxConnectedDevices: 3,
      maxUploadFileSize: 2147483648, // 2 GB
    },
    settings: {
      uploadSpeedMultiplier: 1,
      versionHistoryDays: 30,
      deleteFilesAfterExpiryDays: 60,
    },
  },
  novice: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
    },
    limits: {
      storageLimit: 1099511627776, // 1 TB
      maxConnectedDevices: 5,
      maxUploadFileSize: 5368709120, // 5 GB
    },
    settings: {
      uploadSpeedMultiplier: 5,
      versionHistoryDays: 90,
      deleteFilesAfterExpiryDays: 0, // Never
    },
  },
  professional: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
    },
    limits: {
      storageLimit: 5497558138880, // 5 TB
      maxConnectedDevices: 10,
      maxUploadFileSize: 10737418240, // 10 GB
    },
    settings: {
      uploadSpeedMultiplier: 10,
      versionHistoryDays: 365,
      deleteFilesAfterExpiryDays: 0, // Never
    },
  },
  ultimate: {
    permissions: {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
    },
    limits: {
      storageLimit: 16492674416640, // 15 TB
      maxConnectedDevices: 20,
      maxUploadFileSize: 21474836480, // 20 GB
    },
    settings: {
      uploadSpeedMultiplier: 20,
      versionHistoryDays: 0, // Unlimited
      deleteFilesAfterExpiryDays: 0, // Never
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

const resetToDefaultSettings = async (req, res, next) => {
  // Global System Config reset or initial set
  const {
    maxDevicesLimit,
    maxFileSizeValue,
    maxFileSizeUnit,
    sessionTimeoutValue,
    sessionTimeoutUnit,
    defaultStorageUnit,
  } = initialSystemConfig;

  const globalSystemConfig = await SystemConfig.findOneAndUpdate(
    { key: "global" },
    {
      maxDevicesLimit,
      maxFileSizeValue,
      maxFileSizeUnit,
      sessionTimeoutValue,
      sessionTimeoutUnit,
      defaultStorageUnit,
    },
    { upsert: true, returnDocument: "after" },
  );

  console.log(globalSystemConfig);

  // Initial Features reset or initial Set
  for (const initialFeature of initialFeatures) {
    console.log(initialFeature);
    const { title, key, category, description, enabled } = initialFeature;

    console.log(initialFeature);
    let currentFeature = await Feature.findOneAndUpdate(
      { key },
      { title, key, category, description, enabled },
      { upsert: true, returnDocument: "after" },
    );
    console.log(currentFeature);
  }

  // Plan Tier reset or initial Set
  for (const planTier of initialPlanTiers) {
    console.log(planTier);
    const { slug, type, title, description, accentColor, active } = planTier;
    const currentPlanTier = await PlanTier.findOneAndUpdate(
      { slug },
      { slug, title, description, accentColor, active },
      { upsert: true, returnDocument: "after" },
    );
    console.log(currentPlanTier);

    const currentPlanFeatures = await Feature.find({
      key: { $in: initialPlanTierFeatureConfigs[slug] },
    }).select("_id");

    console.log(currentPlanFeatures);
    const tierRules = initialPlanTierRuleConfigs[slug] || {};

    const currentPlanTierConfiguration =
      await PlanTierConfiguration.findOneAndUpdate(
        { tier: currentPlanTier._id, slug },
        {
          tier: currentPlanTier._id,
          slug,
          features: currentPlanFeatures,
          rules: tierRules,
        },
        { upsert: true, returnDocument: "after" },
      );
    console.log(currentPlanTierConfiguration);
  }

  // Billing Plans reset or inital Set
  for (const billingPlan of initialBillingPlans) {
    console.log(billingPlan);
    const {
      slug,
      amount,
      period,
      description,
      version,
      storage,
      active,
      currency,
      razorpayPlanId,
    } = billingPlan;

    const currentPlanTier = await PlanTier.find({ slug });
    console.log(currentPlanTier);
    let currentBillingPlan = await BillingPlan.findOneAndUpdate(
      { slug, period, amount },
      {
        tier: currentPlanTier._id,
        slug,
        amount,
        period,
        description,
        version,
        storage,
        active,
        currency,
        razorpayPlanId,
      },
      { upsert: true, returnDocument: "after" },
    );
    console.log(currentBillingPlan);
  }
};

export default resetToDefaultSettings;
