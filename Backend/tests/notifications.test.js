import mongoose from "mongoose";
import "../databases/mongoose.js";
import Notification from "../models/notificationModel.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_EVENT_KEYS,
} from "../constants/notification.constants.js";
import {
  createNotificationLogic,
  getUserNotificationsLogic,
  getUnreadCountLogic,
  markAsReadLogic,
  markAllAsReadLogic,
  dismissNotificationLogic,
  dismissAllNotificationsLogic,
  resolveByEventKeyLogic,
  resolveByEventKeyPrefixLogic,
  securityTwoFactorDisabled,
  securityTwoFactorEnabled,
  securityRecoveryEmailMissing,
  securityRecoveryEmailAdded,
  securityPhoneUnverified,
  securityPhoneVerified,
  syncSecurityNotifications,
  subscriptionCancelled,
  subscriptionActivated,
  storageThresholdReached,
  storageLimitResolved,
  paymentSucceeded,
  paymentFailed,
} from "../services/notification.service.js";

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

async function runNotificationTests() {
  console.log("\n🔔 --- RUNNING NOTIFICATION SYSTEM SUITE TESTS --- 🔔\n");

  const testUserId1 = new mongoose.Types.ObjectId();
  const testUserId2 = new mongoose.Types.ObjectId();

  try {
    // ── 1. Model & Validation Tests ──
    console.log("📋 Test Group 1: Creation & Validation");
    {
      const notif = await createNotificationLogic({
        userId: testUserId1,
        type: NOTIFICATION_TYPES.SECURITY,
        severity: NOTIFICATION_SEVERITIES.WARNING,
        title: "Test Security Alert",
        message: "This is a test notification message",
        action: { label: "Fix Now", route: "/profile" },
      });

      assert(notif && notif._id, "Creates valid notification with action");
      assert(notif.type === "security", "Type is preserved correctly");
      assert(notif.severity === "warning", "Severity is preserved correctly");
      assert(notif.readAt === null, "readAt is initially null");
      assert(notif.dismissedAt === null, "dismissedAt is initially null");
      assert(notif.resolvedAt === null, "resolvedAt is initially null");

      // Validation rejection tests
      let failedValidation = false;
      try {
        await createNotificationLogic({
          userId: testUserId1,
          type: "invalid_type",
          severity: "warning",
          title: "Invalid Type",
          message: "Should fail",
        });
      } catch {
        failedValidation = true;
      }
      assert(failedValidation, "Rejects invalid notification type");

      let missingTitle = false;
      try {
        await createNotificationLogic({
          userId: testUserId1,
          type: NOTIFICATION_TYPES.SYSTEM,
          severity: NOTIFICATION_SEVERITIES.INFO,
          title: "",
          message: "Should fail",
        });
      } catch {
        missingTitle = true;
      }
      assert(missingTitle, "Rejects empty title");
    }

    // ── 2. Idempotency & Event Key Deduplication ──
    console.log("\n🔑 Test Group 2: Idempotency & Event Key Deduplication");
    {
      const eventKey = `test-event:${testUserId1}:1`;

      const notif1 = await createNotificationLogic({
        userId: testUserId1,
        type: NOTIFICATION_TYPES.SUBSCRIPTION,
        severity: NOTIFICATION_SEVERITIES.CRITICAL,
        title: "Subscription Cancelled",
        message: "Your subscription was cancelled.",
        eventKey,
      });

      const notif2 = await createNotificationLogic({
        userId: testUserId1,
        type: NOTIFICATION_TYPES.SUBSCRIPTION,
        severity: NOTIFICATION_SEVERITIES.CRITICAL,
        title: "Subscription Cancelled",
        message: "Your subscription was cancelled.",
        eventKey,
      });

      assert(
        notif1._id.toString() === notif2._id.toString(),
        "Duplicate eventKey returns existing notification without creating second document",
      );

      // Concurrent creation test
      const parallelPromises = Array.from({ length: 5 }).map(() =>
        createNotificationLogic({
          userId: testUserId1,
          type: NOTIFICATION_TYPES.SUBSCRIPTION,
          severity: NOTIFICATION_SEVERITIES.CRITICAL,
          title: "Subscription Cancelled",
          message: "Concurrent duplicate check",
          eventKey,
        }),
      );
      const results = await Promise.all(parallelPromises);
      const allSameId = results.every(
        (r) => r._id.toString() === notif1._id.toString(),
      );
      assert(allSameId, "Concurrent duplicate requests resolve to the identical single notification");
    }

    // ── 3. Strict Ownership Authorization ──
    console.log("\n🛡️ Test Group 3: Strict Ownership Authorization");
    {
      const user1Notif = await createNotificationLogic({
        userId: testUserId1,
        type: NOTIFICATION_TYPES.BILLING,
        severity: NOTIFICATION_SEVERITIES.CRITICAL,
        title: "User 1 Billing Alert",
        message: "Invoice payment failed for user 1",
      });

      const user2List = await getUserNotificationsLogic({
        userId: testUserId2,
      });
      const leaked = user2List.data.some(
        (n) => n._id.toString() === user1Notif._id.toString(),
      );
      assert(!leaked, "User 2 cannot retrieve User 1 notifications in list query");

      let unauthorizedRead = false;
      try {
        await markAsReadLogic({
          userId: testUserId2,
          notificationId: user1Notif._id,
        });
      } catch (err) {
        unauthorizedRead = err.status === 404 || err.statusCode === 404;
      }
      assert(unauthorizedRead, "User 2 cannot mark User 1 notification as read");

      let unauthorizedDismiss = false;
      try {
        await dismissNotificationLogic({
          userId: testUserId2,
          notificationId: user1Notif._id,
        });
      } catch (err) {
        unauthorizedDismiss = err.status === 404 || err.statusCode === 404;
      }
      assert(unauthorizedDismiss, "User 2 cannot dismiss User 1 notification");
    }

    // ── 4. Lifecycle Transitions (Read, Dismiss, Resolve) ──
    console.log("\n🔄 Test Group 4: Lifecycle Transitions (Read, Dismiss, Resolve)");
    {
      const notif = await createNotificationLogic({
        userId: testUserId1,
        type: NOTIFICATION_TYPES.STORAGE,
        severity: NOTIFICATION_SEVERITIES.WARNING,
        title: "Storage Approaching Limit",
        message: "Usage reached 90%",
        eventKey: `storage-test:${testUserId1}`,
      });

      // Unread count check
      const unreadBefore = await getUnreadCountLogic({ userId: testUserId1 });
      assert(unreadBefore.unreadCount > 0, "Unread count accurately reflects new notification");

      // Mark as read
      const readNotif = await markAsReadLogic({
        userId: testUserId1,
        notificationId: notif._id,
      });
      assert(readNotif.readAt instanceof Date, "markAsRead sets readAt timestamp");

      // Dismiss
      const dismissedNotif = await dismissNotificationLogic({
        userId: testUserId1,
        notificationId: notif._id,
      });
      assert(
        dismissedNotif.dismissedAt instanceof Date,
        "dismissNotification sets dismissedAt timestamp",
      );

      // Verify dismissed item is excluded from active list by default
      const activeList = await getUserNotificationsLogic({
        userId: testUserId1,
      });
      assert(
        !activeList.data.some((n) => n._id.toString() === notif._id.toString()),
        "Dismissed notifications excluded from default active list",
      );

      // Verify dismissed item appears when includeDismissed is true
      const fullList = await getUserNotificationsLogic({
        userId: testUserId1,
        includeDismissed: true,
      });
      assert(
        fullList.data.some((n) => n._id.toString() === notif._id.toString()),
        "Dismissed notifications included when includeDismissed=true",
      );

      // Resolve by event key
      await resolveByEventKeyLogic({
        userId: testUserId1,
        eventKey: `storage-test:${testUserId1}`,
      });
      const resolvedDoc = await Notification.findById(notif._id).lean();
      assert(resolvedDoc.resolvedAt instanceof Date, "resolveByEventKey sets resolvedAt");
    }

    // ── 5. Business Domain Helpers: Security Flow ──
    console.log("\n🔒 Test Group 5: Security Domain Integration Flows");
    {
      // 1. 2FA disabled creates warning
      const warn2fa = await securityTwoFactorDisabled({ userId: testUserId1 });
      assert(
        warn2fa.type === "security" && warn2fa.severity === "warning",
        "securityTwoFactorDisabled creates warning notification",
      );

      // 2. 2FA enabled resolves warning and creates confirmation
      const success2fa = await securityTwoFactorEnabled({ userId: testUserId1 });
      assert(
        success2fa.type === "security" && success2fa.severity === "success",
        "securityTwoFactorEnabled creates success notification",
      );

      const old2fa = await Notification.findById(warn2fa._id).lean();
      assert(old2fa.resolvedAt instanceof Date, "securityTwoFactorEnabled resolves disabled 2FA warning");

      // 3. Recovery email missing & added
      const warnEmail = await securityRecoveryEmailMissing({ userId: testUserId1 });
      assert(warnEmail.type === "security", "securityRecoveryEmailMissing creates warning");
      await securityRecoveryEmailAdded({
        userId: testUserId1,
        email: "backup@vault.com",
      });
      const oldEmail = await Notification.findById(warnEmail._id).lean();
      assert(oldEmail.resolvedAt instanceof Date, "securityRecoveryEmailAdded resolves missing email warning");

      // 4. Phone unverified & verified
      const warnPhone = await securityPhoneUnverified({ userId: testUserId1 });
      assert(warnPhone.type === "security", "securityPhoneUnverified creates warning");
      await securityPhoneVerified({
        userId: testUserId1,
        phone: "+919876543210",
      });
      const oldPhone = await Notification.findById(warnPhone._id).lean();
      assert(oldPhone.resolvedAt instanceof Date, "securityPhoneVerified resolves phone warning");
    }

    // ── 6. Business Domain Helpers: Subscription & Billing Flow ──
    console.log("\n💳 Test Group 6: Subscription & Billing Domain Integration Flows");
    {
      const subId = new mongoose.Types.ObjectId().toString();

      // Subscription cancellation creates critical notification
      const cancelNotif = await subscriptionCancelled({
        userId: testUserId1,
        subscriptionId: subId,
        retentionDays: 60,
      });
      assert(
        cancelNotif.type === "subscription" && cancelNotif.severity === "critical",
        "subscriptionCancelled creates critical notification with retention days",
      );

      // Subscription activation resolves cancellation and deletion warnings
      const activateNotif = await subscriptionActivated({
        userId: testUserId1,
        subscriptionId: subId,
        planName: "PRO VAULT",
      });
      assert(
        activateNotif.type === "subscription" && activateNotif.severity === "success",
        "subscriptionActivated creates success notification",
      );

      const oldCancel = await Notification.findById(cancelNotif._id).lean();
      assert(oldCancel.resolvedAt instanceof Date, "subscriptionActivated resolves cancellation warning");

      // Payment success & failure
      const paySuccess = await paymentSucceeded({
        userId: testUserId1,
        paymentId: "pay_12345",
        amount: 49900,
        currency: "INR",
      });
      assert(paySuccess.severity === "success", "paymentSucceeded creates success billing notification");

      const payFail = await paymentFailed({
        userId: testUserId1,
        paymentId: "pay_failed_6789",
        reason: "Insufficient funds",
      });
      assert(payFail.severity === "critical", "paymentFailed creates critical billing notification");
    }

    // ── 7. Storage Quota Flow ──
    console.log("\n💾 Test Group 7: Storage Quota Integration Flows");
    {
      const s80 = await storageThresholdReached({
        userId: testUserId1,
        percentage: 80,
        usedBytes: 8 * 1024 * 1024 * 1024,
        maxBytes: 10 * 1024 * 1024 * 1024,
      });
      assert(s80.severity === "info", "80% storage threshold creates info notification");

      const s90 = await storageThresholdReached({
        userId: testUserId1,
        percentage: 90,
        usedBytes: 9 * 1024 * 1024 * 1024,
        maxBytes: 10 * 1024 * 1024 * 1024,
      });
      assert(s90.severity === "warning", "90% storage threshold creates warning notification");

      const s100 = await storageThresholdReached({
        userId: testUserId1,
        percentage: 100,
        usedBytes: 10 * 1024 * 1024 * 1024,
        maxBytes: 10 * 1024 * 1024 * 1024,
      });
      assert(s100.severity === "critical", "100% storage quota exceeded creates critical notification");

      // Storage limit resolved clears all threshold notifications
      await storageLimitResolved({ userId: testUserId1 });
      const activeStorageNotifs = await Notification.find({
        userId: testUserId1,
        type: "storage",
        resolvedAt: null,
      }).lean();
      assert(
        activeStorageNotifs.length === 0,
        "storageLimitResolved resolves all active storage threshold warnings",
      );
    }

    // ── Cleanup Test Records ──
    await Notification.deleteMany({
      userId: { $in: [testUserId1, testUserId2] },
    });
  } catch (err) {
    console.error("Test execution error:", err);
    testsFailed++;
  }

  console.log("\n=================================================");
  console.log(`TOTAL PASSED: ${testsPassed}`);
  console.log(`TOTAL FAILED: ${testsFailed}`);
  console.log("=================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Ensure DB connected before running
if (mongoose.connection.readyState === 1) {
  runNotificationTests();
} else {
  mongoose.connection.once("open", runNotificationTests);
}
