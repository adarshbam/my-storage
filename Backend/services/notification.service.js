import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_EVENT_KEYS,
} from "../constants/notification.constants.js";
import { AppError } from "../errors/AppError.js";

/**
 * Creates a notification with database-level idempotency and deduplication.
 * If an active (unresolved) notification with the same eventKey exists for the user,
 * it returns the existing notification instead of creating a duplicate.
 */
export async function createNotificationLogic({
  userId,
  type,
  severity = NOTIFICATION_SEVERITIES.INFO,
  title,
  message,
  action = null,
  eventKey = null,
  metadata = {},
  expiresAt = null,
}) {
  if (!userId) {
    throw AppError.badRequest("User ID is required for notification creation");
  }
  if (!type || !Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw AppError.badRequest(`Invalid notification type: ${type}`);
  }
  if (!severity || !Object.values(NOTIFICATION_SEVERITIES).includes(severity)) {
    throw AppError.badRequest(`Invalid notification severity: ${severity}`);
  }
  if (!title || !title.trim()) {
    throw AppError.badRequest("Notification title is required");
  }
  if (!message || !message.trim()) {
    throw AppError.badRequest("Notification message is required");
  }

  const cleanAction =
    action && action.label && action.route
      ? {
          label: String(action.label).trim(),
          route: String(action.route).trim(),
        }
      : null;

  // 1. If eventKey is specified, check for existing active notification
  if (eventKey) {
    const existing = await Notification.findOne({
      userId,
      eventKey,
      resolvedAt: null,
    });
    if (existing) {
      return existing;
    }
  }

  // 2. Create the notification document with race-condition safety
  try {
    const notification = await Notification.create({
      userId,
      type,
      severity,
      title: title.trim(),
      message: message.trim(),
      action: cleanAction,
      eventKey: eventKey ? eventKey.trim() : null,
      metadata: metadata || {},
      expiresAt: expiresAt || null,
    });
    return notification;
  } catch (err) {
    // Catch MongoDB duplicate key error (code 11000) for race conditions
    if (err.code === 11000 && eventKey) {
      const existing = await Notification.findOne({
        userId,
        eventKey,
        resolvedAt: null,
      });
      if (existing) {
        return existing;
      }
    }
    console.error(
      "[NotificationService] Error creating notification:",
      err.message,
    );
    throw err;
  }
}

/**
 * Retrieves paginated notifications strictly scoped to the authenticated user.
 */
export async function getUserNotificationsLogic({
  userId,
  type,
  severity,
  unreadOnly = false,
  includeDismissed = false,
  page = 1,
  limit = 20,
}) {
  if (!userId) {
    throw AppError.unauthorized("Authentication required");
  }

  const now = new Date();
  const query = {
    userId,
    // Exclude expired notifications
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };

  if (type) {
    query.type = type;
  }

  if (severity) {
    query.severity = severity;
  }

  if (unreadOnly) {
    query.readAt = null;
  }

  if (!includeDismissed) {
    query.dismissedAt = null;
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / safeLimit) || 1;
  const hasMore = safePage < totalPages;

  return {
    data: notifications,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasMore,
    },
  };
}

/**
 * Lightweight unread count query.
 */
export async function getUnreadCountLogic({ userId }) {
  if (!userId) {
    throw AppError.unauthorized("Authentication required");
  }

  const now = new Date();
  const count = await Notification.countDocuments({
    userId,
    readAt: null,
    dismissedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  return { unreadCount: count };
}

/**
 * Marks a single notification as read (strictly verified against userId).
 */
export async function markAsReadLogic({ userId, notificationId }) {
  if (!userId) throw AppError.unauthorized("Authentication required");
  if (!notificationId) throw AppError.badRequest("Notification ID required");

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!notification) {
    throw AppError.notFound("Notification not found");
  }

  return notification;
}

/**
 * Marks all unread notifications as read for the user.
 */
export async function markAllAsReadLogic({ userId }) {
  if (!userId) throw AppError.unauthorized("Authentication required");

  const now = new Date();
  const result = await Notification.updateMany(
    { userId, readAt: null, dismissedAt: null },
    { $set: { readAt: now } },
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Dismisses a single notification from the user's active view.
 */
export async function dismissNotificationLogic({ userId, notificationId }) {
  if (!userId) throw AppError.unauthorized("Authentication required");
  if (!notificationId) throw AppError.badRequest("Notification ID required");

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { dismissedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!notification) {
    throw AppError.notFound("Notification not found");
  }

  return notification;
}

/**
 * Dismisses all active notifications for the user.
 */
export async function dismissAllNotificationsLogic({ userId }) {
  if (!userId) throw AppError.unauthorized("Authentication required");

  const now = new Date();
  const result = await Notification.updateMany(
    { userId, dismissedAt: null },
    { $set: { dismissedAt: now } },
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Resolves a notification by ID.
 */
export async function resolveNotificationLogic({ userId, notificationId }) {
  if (!userId) throw AppError.unauthorized("Authentication required");

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { resolvedAt: new Date() } },
    { returnDocument: "after" },
  );

  return notification;
}

/**
 * Resolves active notifications matching a specific eventKey.
 */
export async function resolveByEventKeyLogic({ userId, eventKey }) {
  if (!userId || !eventKey) return null;

  const now = new Date();
  const result = await Notification.updateMany(
    { userId, eventKey, resolvedAt: null },
    { $set: { resolvedAt: now } },
  );

  return result;
}

/**
 * Resolves active notifications matching an eventKey prefix.
 */
export async function resolveByEventKeyPrefixLogic({ userId, prefix }) {
  if (!userId || !prefix) return null;

  const now = new Date();
  const result = await Notification.updateMany(
    {
      userId,
      eventKey: { $regex: `^${prefix}` },
      resolvedAt: null,
    },
    { $set: { resolvedAt: now } },
  );

  return result;
}

// =========================================================================
// ── Domain Helpers: Security Notifications ──
// =========================================================================

export async function securityTwoFactorDisabled({ userId }) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.WARNING,
    title: "Two-Factor Authentication Disabled",
    message:
      "Your account is less secure without two-factor authentication. Enable 2FA to protect your vault and files.",
    action: {
      label: "Enable 2FA",
      route: "/profile",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_2FA_DISABLED(userId),
  });
}

export async function securityTwoFactorEnabled({ userId }) {
  // 1. Resolve any existing 2FA disabled warning
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_2FA_DISABLED(userId),
  });

  // 2. Create success confirmation
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Two-Factor Authentication Enabled",
    message:
      "Your vault account is now protected with Two-Factor Authentication (TOTP).",
    action: {
      label: "View Security",
      route: "/profile",
    },
  });
}

export async function securityRecoveryEmailMissing({ userId }) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.WARNING,
    title: "Recovery Email Not Configured",
    message:
      "Configure a secondary recovery email to ensure you never lose access to your encrypted vault files.",
    action: {
      label: "Add Recovery Email",
      route: "/profile",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_RECOVERY_EMAIL_MISSING(userId),
  });
}

export async function securityRecoveryEmailAdded({ userId, email }) {
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_RECOVERY_EMAIL_MISSING(userId),
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Secondary Recovery Email Verified",
    message: `Secondary recovery email (${email || "configured"}) is active and linked to your account.`,
    action: {
      label: "View Profile",
      route: "/profile",
    },
  });
}

export async function securityPhoneUnverified({ userId }) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.WARNING,
    title: "Phone Number Not Verified",
    message:
      "Verify your phone number to enable instant SMS recovery and unlock free trial and premium storage features.",
    action: {
      label: "Verify Phone",
      route: "/profile",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_PHONE_UNVERIFIED(userId),
  });
}

export async function securityPhoneVerified({ userId, phone }) {
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_PHONE_UNVERIFIED(userId),
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SECURITY,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Phone Number Verified",
    message: `Your phone number (${phone || "verified"}) has been linked successfully.`,
    action: {
      label: "View Profile",
      route: "/profile",
    },
  });
}

/**
 * Idempotently synchronizes security notifications for an active user session.
 * Ensures existing and new users have accurate security reminders without spam.
 */
export async function syncSecurityNotifications(user) {
  if (!user || !user._id) return;
  const userId = user._id.toString();

  // 1. Two-Factor Authentication Check
  if (!user.twoFactorEnabled) {
    await securityTwoFactorDisabled({ userId });
  } else {
    await resolveByEventKeyLogic({
      userId,
      eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_2FA_DISABLED(userId),
    });
  }

  // 2. Secondary Recovery Email Check
  if (!user.secondaryRecoveryEmailVerified) {
    await securityRecoveryEmailMissing({ userId });
  } else {
    await resolveByEventKeyLogic({
      userId,
      eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_RECOVERY_EMAIL_MISSING(userId),
    });
  }

  // 3. Phone Verification Check
  if (!user.phoneVerified) {
    await securityPhoneUnverified({ userId });
  } else {
    await resolveByEventKeyLogic({
      userId,
      eventKey: NOTIFICATION_EVENT_KEYS.SECURITY_PHONE_UNVERIFIED(userId),
    });
  }
}

// =========================================================================
// ── Domain Helpers: Subscription & Billing Notifications ──
// =========================================================================

export async function subscriptionCancelled({
  userId,
  subscriptionId,
  retentionDays = 60,
}) {
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_PAUSED(subscriptionId),
  });
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_RESUMED(subscriptionId),
  });
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_ACTIVATED(subscriptionId),
  });
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_CANCELLED(subscriptionId),
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    severity: NOTIFICATION_SEVERITIES.CRITICAL,
    title: "Subscription Cancelled",
    message: `Your subscription has been cancelled. Your stored vault files will be permanently purged after ${retentionDays} days unless you reactivate your subscription.`,
    action: {
      label: "Reactivate Subscription",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_CANCELLED(subscriptionId),
    metadata: { subscriptionId, retentionDays },
  });
}

export async function subscriptionActivated({
  userId,
  subscriptionId,
  planName = "Storage Plan",
}) {
  // Resolve any cancellation or deletion warning notifications
  await resolveByEventKeyPrefixLogic({ userId, prefix: "sub-cancelled" });
  await resolveByEventKeyPrefixLogic({ userId, prefix: "sub-expired" });
  await resolveByEventKeyPrefixLogic({ userId, prefix: "sub-paused" });
  await resolveByEventKeyPrefixLogic({ userId, prefix: "sub-resumed" });
  await resolveByEventKeyPrefixLogic({ userId, prefix: "sub-activated" });
  await resolveByEventKeyPrefixLogic({
    userId,
    prefix: "file-deletion-scheduled",
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Subscription Activated",
    message: `Your ${planName} is now active with full upload, download, and vault storage features.`,
    action: {
      label: "View Invoices",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_ACTIVATED(subscriptionId),
    metadata: { subscriptionId, planName },
  });
}

export async function subscriptionPaused({ userId, subscriptionId }) {
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_RESUMED(subscriptionId),
  });
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_PAUSED(subscriptionId),
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    severity: NOTIFICATION_SEVERITIES.WARNING,
    title: "Subscription Paused",
    message:
      "Your subscription is currently paused. Resume your subscription to restore unmetered storage access.",
    action: {
      label: "Manage Billing",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_PAUSED(subscriptionId),
    metadata: { subscriptionId },
  });
}

export async function subscriptionResumed({ userId, subscriptionId }) {
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_PAUSED(subscriptionId),
  });
  await resolveByEventKeyLogic({
    userId,
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_RESUMED(subscriptionId),
  });

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Subscription Resumed",
    message: "Your subscription is active again. Full access is restored.",
    action: {
      label: "View Billing",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_RESUMED(subscriptionId),
    metadata: { subscriptionId },
  });
}

export async function subscriptionExpiring({
  userId,
  subscriptionId,
  daysRemaining,
  expiresAt,
}) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    severity: NOTIFICATION_SEVERITIES.WARNING,
    title: "Subscription Expiring Soon",
    message: `Your storage plan will expire in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Renew now to avoid account restrictions.`,
    action: {
      label: "Renew Plan",
      route: "/dashboard/billing",
    },
    eventKey: `${NOTIFICATION_EVENT_KEYS.SUBSCRIPTION_EXPIRING(subscriptionId)}:${daysRemaining}d`,
    metadata: { subscriptionId, daysRemaining, expiresAt },
  });
}

export async function fileDeletionScheduled({
  userId,
  daysRemaining,
  purgeDate,
}) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.STORAGE,
    severity: NOTIFICATION_SEVERITIES.CRITICAL,
    title: "Files Scheduled for Permanent Purge",
    message: `Your account has no active subscription. Your stored vault files are scheduled for irreversible deletion in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Activate a plan to preserve your data.`,
    action: {
      label: "Activate Plan Now",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.FILE_DELETION_SCHEDULED(
      userId,
      daysRemaining,
    ),
    metadata: { daysRemaining, purgeDate },
  });
}

export async function paymentSucceeded({
  userId,
  paymentId,
  amount,
  currency = "INR",
}) {
  const formattedAmount =
    typeof amount === "number" ? (amount / 100).toFixed(2) : amount;
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.BILLING,
    severity: NOTIFICATION_SEVERITIES.SUCCESS,
    title: "Payment Received",
    message: `We successfully processed your payment of ${currency} ${formattedAmount}. Thank you for using Vault Storage!`,
    action: {
      label: "View Invoices",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.PAYMENT_SUCCESS(paymentId),
    metadata: { paymentId, amount, currency },
  });
}

export async function paymentFailed({ userId, paymentId, reason }) {
  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.BILLING,
    severity: NOTIFICATION_SEVERITIES.CRITICAL,
    title: "Payment Failed",
    message: `Your recent subscription renewal payment could not be processed${reason ? `: ${reason}` : ""}. Please update your payment details to prevent disruption.`,
    action: {
      label: "Update Payment Method",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.PAYMENT_FAILED(paymentId),
    metadata: { paymentId, reason },
  });
}

// =========================================================================
// ── Domain Helpers: Storage Quota Notifications ──
// =========================================================================

export async function storageThresholdReached({
  userId,
  percentage,
  usedBytes,
  maxBytes,
}) {
  let severity = NOTIFICATION_SEVERITIES.INFO;
  let title = "Storage Approaching Limit";
  let message = `You have used ${percentage}% of your storage quota.`;

  if (percentage >= 100) {
    severity = NOTIFICATION_SEVERITIES.CRITICAL;
    title = "Storage Quota Exceeded (100%)";
    message =
      "You have filled 100% of your allocated storage capacity. New uploads and sync operations are blocked until you upgrade or free up space.";
  } else if (percentage >= 90) {
    severity = NOTIFICATION_SEVERITIES.WARNING;
    title = "Storage Almost Full (90%)";
    message =
      "Your storage is 90% full. Upgrade your plan to ensure smooth uninterrupted file uploads.";
  } else if (percentage >= 80) {
    severity = NOTIFICATION_SEVERITIES.INFO;
    title = "Storage Warning (80%)";
    message =
      "You have consumed 80% of your current storage tier. Consider upgrading your plan for additional space.";
  }

  return createNotificationLogic({
    userId,
    type: NOTIFICATION_TYPES.STORAGE,
    severity,
    title,
    message,
    action: {
      label: "Upgrade Storage",
      route: "/dashboard/billing",
    },
    eventKey: NOTIFICATION_EVENT_KEYS.STORAGE_THRESHOLD(userId, percentage),
    metadata: { percentage, usedBytes, maxBytes },
  });
}

export async function storageLimitResolved({ userId }) {
  return resolveByEventKeyPrefixLogic({
    userId,
    prefix: `storage-threshold:${userId}:`,
  });
}

export default {
  create: createNotificationLogic,
  getUserNotifications: getUserNotificationsLogic,
  getUnreadCount: getUnreadCountLogic,
  markAsRead: markAsReadLogic,
  markAllAsRead: markAllAsReadLogic,
  dismiss: dismissNotificationLogic,
  dismissAll: dismissAllNotificationsLogic,
  resolve: resolveNotificationLogic,
  resolveByEventKey: resolveByEventKeyLogic,
  resolveByEventKeyPrefix: resolveByEventKeyPrefixLogic,
  securityTwoFactorDisabled,
  securityTwoFactorEnabled,
  securityRecoveryEmailMissing,
  securityRecoveryEmailAdded,
  securityPhoneUnverified,
  securityPhoneVerified,
  syncSecurityNotifications,
  subscriptionCancelled,
  subscriptionActivated,
  subscriptionPaused,
  subscriptionResumed,
  subscriptionExpiring,
  fileDeletionScheduled,
  paymentSucceeded,
  paymentFailed,
  storageThresholdReached,
  storageLimitResolved,
};
