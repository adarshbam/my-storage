import "../config/config.js";
import { connectDB, disconnectDB } from "../databases/mongoose.js";
import { disconnectRedis } from "../databases/redis.js";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import { loginUserLogic } from "../services/auth.service.js";
import { setupTwoFactorLogic } from "../services/twoFactor.service.js";
import { deleteSystemUserLogic, updateSystemUserRoleLogic } from "../services/systemUsers.service.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import {
  GOOGLE_TESTER_EMAIL,
  GOOGLE_TESTER_PASSWORD,
  RECRUITER_EMAIL,
  RECRUITER_PASSWORD,
} from "../config/config.js";

async function runAudit() {
  console.log("\n🧪 ========================================================");
  console.log("   AUTOMATED SELF-AUDIT: SPECIAL DEMONSTRATION ACCOUNTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // AUDIT 1: GOOGLE TESTER ACCOUNT VERIFICATION
    // -------------------------------------------------------------
    console.log("🔍 [1/2] Auditing Google App Reviewer Account...");
    const testerUser = await User.findOne({ email: GOOGLE_TESTER_EMAIL }).populate({
      path: "subscription",
      populate: { path: "billingPlan" },
    });

    assert(!!testerUser, `Google tester user exists in database (${GOOGLE_TESTER_EMAIL})`);
    assert(testerUser?.role === "User", `Google tester role is strictly "User" (found: "${testerUser?.role}")`);
    assert(testerUser?.isVerified === true, `Google tester is pre-verified (isVerified = true)`);
    assert(testerUser?.phoneVerified === true, `Google tester phone is pre-verified (phoneVerified = true)`);
    assert(testerUser?.twoFactorEnabled === false, `Google tester 2FA is disabled (twoFactorEnabled = false)`);
    assert(testerUser?.status === "Active", `Google tester status is "Active"`);

    const isTesterPassValid = await testerUser.comparePassword(GOOGLE_TESTER_PASSWORD);
    assert(isTesterPassValid === true, `Google tester password authenticates with configured credentials`);

    const testerSub = await Subscription.findOne({
      userId: testerUser._id,
      razorpaySubscriptionId: { $regex: /^sub_permanent_tester/ },
    });
    assert(!!testerSub, `Permanent subscription exists for tester (${testerSub?.razorpaySubscriptionId})`);
    assert(testerSub?.status === "active", `Tester subscription status is active`);
    assert(testerSub?.isFreeTrial === false, `Tester subscription is not a trial (isFreeTrial = false)`);
    assert(
      new Date(testerSub?.currentEnd).getFullYear() >= 2099,
      `Tester subscription has lifetime expiry (>= year 2099)`
    );

    // Test direct login without 2FA challenge
    const fakeRes = {
      cookie: () => {},
    };
    const fakeReq = {
      headers: {},
      signedCookies: {},
    };
    const loginResult = await loginUserLogic({
      email: GOOGLE_TESTER_EMAIL,
      password: GOOGLE_TESTER_PASSWORD,
      req: fakeReq,
      res: fakeRes,
    });
    assert(
      !loginResult.twoFactorRequired && !loginResult.tempToken,
      `Login seamlessly succeeds without 2FA interception (twoFactorRequired: ${loginResult.twoFactorRequired})`
    );

    // Test loadPlanContext middleware for Google Tester
    const planContextReq = {
      user: { id: testerUser._id.toString(), _id: testerUser._id, email: testerUser.email },
    };
    let middlewareCalled = false;
    await loadPlanContext(planContextReq, {}, () => {
      middlewareCalled = true;
    });

    assert(middlewareCalled === true, `loadPlanContext middleware resolves successfully`);
    assert(planContextReq.planContext?.isNoSubscription === false, `Plan context has isNoSubscription = false`);
    assert(planContextReq.planContext?.isReadOnly === false, `Plan context has isReadOnly = false (Write/Delete enabled)`);
    assert(
      planContextReq.planContext?.rules?.permissions?.allowUpload === true &&
        planContextReq.planContext?.rules?.permissions?.allowDelete === true,
      `Full upload and delete permissions are explicitly granted for testing`
    );
    const hasDriveFeature = planContextReq.planContext?.features?.some(
      (f) => (typeof f === "string" ? f : f?.key) === "gdrive_sync"
    );
    assert(hasDriveFeature === true, `gdrive_sync feature is active in tester plan context`);

    // Test 2FA setup blocking
    let blocked2FA = false;
    try {
      await setupTwoFactorLogic({ userId: testerUser._id.toString() });
    } catch (e) {
      blocked2FA = e.status === 400;
    }
    assert(blocked2FA === true, `Enabling 2FA on Google tester account is defensively blocked`);

    // Test deletion protection
    let blockedDeletion = false;
    try {
      await deleteSystemUserLogic({
        targetId: testerUser._id.toString(),
        requestingUser: { id: "admin_tester", role: "Owner" },
        deleteType: "hard",
      });
    } catch (e) {
      blockedDeletion = e.status === 403;
    }
    assert(blockedDeletion === true, `Deleting/Terminating Google tester account is defensively blocked`);

    // Test role modification protection
    let blockedRoleChange = false;
    try {
      await updateSystemUserRoleLogic({
        targetId: testerUser._id.toString(),
        newRole: "Owner",
        requestingUser: { id: "admin_tester", role: "Owner" },
      });
    } catch (e) {
      blockedRoleChange = e.status === 403;
    }
    assert(blockedRoleChange === true, `Demoting/Elevating Google tester role is defensively blocked`);

    // -------------------------------------------------------------
    // AUDIT 2: RECRUITER PORTFOLIO DEMO ACCOUNT VERIFICATION
    // -------------------------------------------------------------
    console.log("\n🔍 [2/2] Auditing Recruiter Portfolio Demo Account...");
    const recruiterUser = await User.findOne({ email: RECRUITER_EMAIL }).populate({
      path: "subscription",
      populate: { path: "billingPlan" },
    });

    assert(!!recruiterUser, `Recruiter demo user exists in database (${RECRUITER_EMAIL})`);
    assert(recruiterUser?.role === "Owner", `Recruiter role is strictly "Owner" (found: "${recruiterUser?.role}")`);
    assert(recruiterUser?.isVerified === true, `Recruiter is pre-verified (isVerified = true)`);
    assert(recruiterUser?.phoneVerified === true, `Recruiter phone is pre-verified (phoneVerified = true)`);
    assert(recruiterUser?.twoFactorEnabled === false, `Recruiter 2FA is disabled (twoFactorEnabled = false)`);
    assert(recruiterUser?.status === "Active", `Recruiter status is "Active"`);

    const isRecruiterPassValid = await recruiterUser.comparePassword(RECRUITER_PASSWORD);
    assert(isRecruiterPassValid === true, `Recruiter password authenticates with configured credentials`);

    const recruiterSub = await Subscription.findOne({
      userId: recruiterUser._id,
      razorpaySubscriptionId: { $regex: /^sub_permanent_recruiter/ },
    });
    assert(!!recruiterSub, `Permanent subscription exists for recruiter (${recruiterSub?.razorpaySubscriptionId})`);
    assert(recruiterSub?.status === "active", `Recruiter subscription status is active`);
    assert(recruiterSub?.isFreeTrial === false, `Recruiter subscription is not a trial (isFreeTrial = false)`);
    assert(
      new Date(recruiterSub?.currentEnd).getFullYear() >= 2099,
      `Recruiter subscription has lifetime expiry (>= year 2099)`
    );

    // Test direct login without 2FA challenge
    const recruiterLoginResult = await loginUserLogic({
      email: RECRUITER_EMAIL,
      password: RECRUITER_PASSWORD,
      req: fakeReq,
      res: fakeRes,
    });
    assert(
      !recruiterLoginResult.twoFactorRequired && !recruiterLoginResult.tempToken,
      `Recruiter login seamlessly succeeds without 2FA interception`
    );

    // Test loadPlanContext middleware for Recruiter
    const recruiterPlanContextReq = {
      user: { id: recruiterUser._id.toString(), _id: recruiterUser._id, email: recruiterUser.email },
    };
    let recruiterMiddlewareCalled = false;
    await loadPlanContext(recruiterPlanContextReq, {}, () => {
      recruiterMiddlewareCalled = true;
    });

    assert(recruiterMiddlewareCalled === true, `Recruiter loadPlanContext middleware resolves successfully`);
    assert(recruiterPlanContextReq.planContext?.isNoSubscription === false, `Recruiter plan has isNoSubscription = false`);
    assert(recruiterPlanContextReq.planContext?.isReadOnly === false, `Recruiter plan has isReadOnly = false`);
    assert(
      recruiterPlanContextReq.planContext?.rules?.permissions?.allowUpload === true &&
        recruiterPlanContextReq.planContext?.rules?.permissions?.allowDelete === true,
      `Recruiter has full unrestricted permissions`
    );

    // Test 2FA setup blocking
    let blockedRecruiter2FA = false;
    try {
      await setupTwoFactorLogic({ userId: recruiterUser._id.toString() });
    } catch (e) {
      blockedRecruiter2FA = e.status === 400;
    }
    assert(blockedRecruiter2FA === true, `Enabling 2FA on Recruiter account is defensively blocked`);

    // Test deletion protection
    let blockedRecruiterDeletion = false;
    try {
      await deleteSystemUserLogic({
        targetId: recruiterUser._id.toString(),
        requestingUser: { id: "another_owner", role: "Owner" },
        deleteType: "hard",
      });
    } catch (e) {
      blockedRecruiterDeletion = e.status === 403;
    }
    assert(blockedRecruiterDeletion === true, `Deleting/Terminating Recruiter account is defensively blocked`);

    // Test role change protection
    let blockedRecruiterRoleChange = false;
    try {
      await updateSystemUserRoleLogic({
        targetId: recruiterUser._id.toString(),
        newRole: "Admin",
        requestingUser: { id: "another_owner", role: "Owner" },
      });
    } catch (e) {
      blockedRecruiterRoleChange = e.status === 403;
    }
    assert(blockedRecruiterRoleChange === true, `Demoting Recruiter account from Owner is defensively blocked`);

    console.log("\n========================================================");
    console.log(`📊 FINAL RESULT: ${passed} Passed, ${failed} Failed`);
    console.log("========================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Audit exception:", err);
    process.exit(1);
  } finally {
    try {
      await disconnectDB();
      await disconnectRedis();
    } catch {}
    process.exit(0);
  }
}

runAudit();
