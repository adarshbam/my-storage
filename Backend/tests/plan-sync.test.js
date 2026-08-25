import mongoose from "mongoose";
import "../databases/mongoose.js";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTier from "../models/planTierModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import SystemConfig from "../models/systemConfigModel.js";
import {
  updateGlobalLimitsLogic,
  updatePlansLogic,
  createPlanTierLogic,
  getOwnerSettingsLogic,
  updateTierConfigurationsLogic,
} from "../services/plan.service.js";
import { getCurrentSubscriptionLogic } from "../services/subscription.service.js";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("\n⚡ --- RUNNING DYNAMIC PLAN & STORAGE SYNC TESTS --- ⚡\n");

  const testUserId = new mongoose.Types.ObjectId();
  const testTestingTierId = new mongoose.Types.ObjectId();
  const transientTierSlug = `test_transient_${Date.now()}`;
  const testSlug = `newtier_${Date.now()}`;
  const rulesTestSlug = `rules_${Date.now()}`;

  let freeTrialSub = null;
  let freeTrialPlan = null;
  let testingPlan = null;
  let originalInheritedTier = "ultimate";

  try {
    const sys = await SystemConfig.findOne({ key: "global" }).lean();
    if (sys?.freeTrialInheritedTier) {
      originalInheritedTier = sys.freeTrialInheritedTier;
    }

    // 0. Setup test tiers and billing plans
    await PlanTier.create({
      _id: testTestingTierId,
      slug: transientTierSlug,
      title: "Transient Test Tier",
      description: "1 GB Testing Tier",
      active: true,
    });

    testingPlan = await BillingPlan.create({
      tier: testTestingTierId,
      slug: transientTierSlug,
      period: "Monthly",
      amount: 60,
      currency: "INR",
      storage: 1073741824, // 1 GB
      razorpayPlanId: "plan_testing_test",
      active: true,
    });

    freeTrialPlan = await BillingPlan.findOne({
      slug: { $in: ["free-trial", "free-trail"] },
      period: "Monthly",
    });

    if (!freeTrialPlan) {
      freeTrialPlan = await BillingPlan.create({
        slug: "free-trial",
        period: "Monthly",
        amount: 0,
        currency: "INR",
        storage: 5368709120, // 5 GB
        razorpayPlanId: "plan_freetrial_test",
        active: true,
      });
    }

    // Create Free Trial subscription for test user
    freeTrialSub = await Subscription.create({
      userId: testUserId,
      billingPlan: freeTrialPlan._id,
      razorpaySubscriptionId: `trial_${testUserId}_${Date.now()}`,
      amount: 0,
      status: "active",
      isFreeTrial: true,
    });

    const testUser = await User.create({
      _id: testUserId,
      name: "Test Sync User",
      email: `testsync_${Date.now()}@example.com`,
      subscription: freeTrialSub._id,
      maxStorage: 5368709120,
      rootDirId: new mongoose.Types.ObjectId(),
    });

    // ── Test Group 1: Free Trial Configured Storage & Inherited Tier Name ──
    console.log("📦 Test Group 1: Free Trial Configured Storage & Inherited Tier Name");

    // 1. Set inherited tier to transient test tier
    await updateGlobalLimitsLogic({
      limits: { freeTrialInheritedTier: transientTierSlug },
      userRole: "Owner",
    });

    let currentSub = await getCurrentSubscriptionLogic({
      userId: testUserId,
      userUsedStorage: 0,
      userMaxStorage: testUser.maxStorage,
    });

    assert(
      currentSub.maxStorage === (freeTrialPlan.storage || 5368709120),
      "Free Trial dynamically resolves maxStorage from free-trial BillingPlan",
    );
    assert(
      currentSub.planName === "Free Trial (Transient Test Tier)",
      "Free Trial dynamically inherits tier title in planName: 'Free Trial (Transient Test Tier)'",
    );
    assert(
      currentSub.isFreeTrial === true,
      "isFreeTrial is true on current subscription",
    );

    // ── Test Group 2: Modifying Free Trial Plan Storage Directly ──
    console.log("\n🔧 Test Group 2: Modifying Free Trial Plan Storage Directly");

    await updatePlansLogic({
      plans: [
        {
          _id: freeTrialPlan._id,
          slug: "free-trial",
          period: "Monthly",
          amount: 0,
          currency: "INR",
          storage: 10737418240, // 10 GB
        },
      ],
      userRole: "Owner",
    });

    currentSub = await getCurrentSubscriptionLogic({
      userId: testUserId,
      userUsedStorage: 0,
      userMaxStorage: 0,
    });

    assert(
      currentSub.maxStorage === 10737418240,
      "Free Trial dynamically reflects modified Free Trial plan storage (10 GB)",
    );

    // Restore free trial plan storage back to 5 GB
    await updatePlansLogic({
      plans: [
        {
          _id: freeTrialPlan._id,
          slug: "free-trial",
          period: "Monthly",
          amount: 0,
          currency: "INR",
          storage: 5368709120, // 5 GB
        },
      ],
      userRole: "Owner",
    });

    // ── Test Group 3: Paid Plan Storage Dynamic Resolution ──
    console.log("\n💳 Test Group 3: Paid Plan Storage Dynamic Resolution");

    await updatePlansLogic({
      plans: [
        {
          _id: testingPlan._id,
          slug: transientTierSlug,
          period: "Monthly",
          amount: 60,
          currency: "INR",
          storage: 2147483648, // 2 GB
        },
      ],
      userRole: "Owner",
    });

    await Subscription.updateOne(
      { _id: freeTrialSub._id },
      {
        $set: {
          billingPlan: testingPlan._id,
          isFreeTrial: false,
          amount: 60,
        },
      },
    );

    currentSub = await getCurrentSubscriptionLogic({
      userId: testUserId,
      userUsedStorage: 0,
      userMaxStorage: 0,
    });

    assert(
      currentSub.maxStorage === 2147483648,
      "Paid plan dynamically returns billingPlan.storage (2 GB)",
    );

    // ── Test Group 4: Creating New Tier (Creates Monthly, Yearly & Config) ──
    console.log("\n🚀 Test Group 4: Creating New Tier (Creates Monthly, Yearly & Config)");

    const createResult = await createPlanTierLogic({
      tierData: {
        slug: testSlug,
        title: "New Custom Tier",
        description: "Custom enterprise tier",
        badge: "Special",
        amount: 299,
        storage: 10 * 1024 ** 3, // 10 GB
      },
      userRole: "Owner",
    });

    assert(
      Boolean(createResult?.newTier?._id),
      "New PlanTier document created successfully",
    );
    assert(
      Array.isArray(createResult?.createdBillingPlans) &&
        createResult.createdBillingPlans.length === 2,
      "Creates both Monthly and Yearly BillingPlan documents for new tier",
    );

    const monthlyCreated = createResult.createdBillingPlans.find(
      (p) => p.period === "Monthly",
    );
    const yearlyCreated = createResult.createdBillingPlans.find(
      (p) => p.period === "Yearly",
    );
    assert(
      monthlyCreated && monthlyCreated.amount === 299,
      "Monthly billing plan has correct amount (299)",
    );
    assert(
      yearlyCreated && yearlyCreated.amount === 2990,
      "Yearly billing plan has correct amount (2990)",
    );

    const createdConfig = await PlanTierConfiguration.findOne({
      slug: testSlug,
    }).lean();
    assert(
      Boolean(createdConfig?._id),
      "PlanTierConfiguration document created and seeded with features & limits",
    );

    // ── Test Group 5: Operational Rules & Limits Persistence & Enforcement ──
    console.log("\n🚀 Test Group 5: Operational Rules & Limits Persistence & Enforcement");

    await PlanTier.create({
      slug: rulesTestSlug,
      title: "Rules Test Tier",
      description: "Testing rule matrices",
      active: true,
    });

    await updateTierConfigurationsLogic({
      configs: {
        tierFeatureConfigs: {
          [rulesTestSlug]: ["password_links"],
        },
        tierRuleConfigs: {
          [rulesTestSlug]: {
            allowUpload: false,
            allowDownload: true,
            allowSharing: false,
            maxConnectedDevices: 10,
            maxUploadSizeVal: 50,
            maxUploadSizeUnit: "MB",
            uploadSpeedMultiplier: "20",
            deleteFilesAfterExpiry: "60",
            versionHistoryDays: "90",
          },
        },
      },
      userRole: "Owner",
    });

    const savedRuleConfig = await PlanTierConfiguration.findOne({
      slug: rulesTestSlug,
    }).lean();

    assert(
      savedRuleConfig?.rules?.permissions?.allowUpload === false,
      "allowUpload rule saved as false",
    );
    assert(
      savedRuleConfig?.rules?.permissions?.allowSharing === false,
      "allowSharing rule saved as false",
    );
    assert(
      savedRuleConfig?.rules?.limits?.maxConnectedDevices === 10,
      "maxConnectedDevices saved as 10",
    );
    assert(
      savedRuleConfig?.rules?.limits?.maxUploadFileSize === 50 * 1024 * 1024,
      "maxUploadFileSize converted from 50 MB to 52,428,800 bytes",
    );
    assert(
      savedRuleConfig?.rules?.settings?.uploadSpeedMultiplier === 20,
      "uploadSpeedMultiplier saved as 20",
    );
    assert(
      savedRuleConfig?.rules?.settings?.deleteFilesAfterExpiryDays === 60,
      "deleteFilesAfterExpiryDays saved as 60",
    );
    assert(
      savedRuleConfig?.rules?.settings?.versionHistoryDays === 90,
      "versionHistoryDays saved as 90",
    );
  } catch (err) {
    console.error("Test execution failed:", err);
    testsFailed++;
  } finally {
    // ── Complete & Guaranteed Teardown ──
    console.log("\n🧹 Cleaning up test artifacts...");
    await PlanTier.deleteMany({ slug: { $in: [transientTierSlug, testSlug, rulesTestSlug, "test", "testing"] } });
    await BillingPlan.deleteMany({ slug: { $in: [transientTierSlug, testSlug, rulesTestSlug, "test", "testing"] } });
    await PlanTierConfiguration.deleteMany({ slug: { $in: [transientTierSlug, testSlug, rulesTestSlug, "test", "testing"] } });
    await User.deleteMany({ email: { $regex: /^testsync_/ } });
    if (freeTrialSub?._id) {
      await Subscription.deleteOne({ _id: freeTrialSub._id });
    }
    await updateGlobalLimitsLogic({
      limits: { freeTrialInheritedTier: originalInheritedTier },
      userRole: "Owner",
    });
    console.log("Cleanup complete.\n");
  }

  console.log("=================================================");
  console.log(`TOTAL PASSED: ${testsPassed}`);
  console.log(`TOTAL FAILED: ${testsFailed}`);
  console.log("=================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
