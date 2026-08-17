/**
 * Centralized Notification Constants
 * Strictly separates Type, Severity, and Event Keys
 */

export const NOTIFICATION_TYPES = {
  SECURITY: "security",
  SUBSCRIPTION: "subscription",
  BILLING: "billing",
  STORAGE: "storage",
  SYSTEM: "system",
};

export const NOTIFICATION_SEVERITIES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  CRITICAL: "critical",
};

export const NOTIFICATION_EVENT_KEYS = {
  // Security
  SECURITY_2FA_DISABLED: (userId) => `security-2fa-disabled:${userId}`,
  SECURITY_RECOVERY_EMAIL_MISSING: (userId) => `security-recovery-email-missing:${userId}`,
  SECURITY_PHONE_UNVERIFIED: (userId) => `security-phone-unverified:${userId}`,
  SECURITY_SETTING_CHANGED: (userId, setting) => `security-changed:${userId}:${setting}`,

  // Subscription
  SUBSCRIPTION_ACTIVATED: (subId) => `sub-activated:${subId}`,
  SUBSCRIPTION_CANCELLED: (subId) => `sub-cancelled:${subId}`,
  SUBSCRIPTION_PAUSED: (subId) => `sub-paused:${subId}`,
  SUBSCRIPTION_RESUMED: (subId) => `sub-resumed:${subId}`,
  SUBSCRIPTION_EXPIRING: (subId) => `sub-expiring:${subId}`,
  SUBSCRIPTION_EXPIRED: (subId) => `sub-expired:${subId}`,

  // File Deletion / Retention Warnings
  FILE_DELETION_SCHEDULED: (userId, daysRemaining) => `file-deletion-scheduled:${userId}:${daysRemaining}d`,

  // Billing
  PAYMENT_SUCCESS: (paymentId) => `payment-success:${paymentId}`,
  PAYMENT_FAILED: (paymentId) => `payment-failed:${paymentId}`,

  // Storage Thresholds
  STORAGE_THRESHOLD: (userId, thresholdPercent) => `storage-threshold:${userId}:${thresholdPercent}`,
};
