import cron from "node-cron";
import redis from "../databases/redis.js";
import { cleanFiles } from "./cleanup.job.js";
import OTP from "../models/otpModel.js";
import { reconcileDirectoryPathsAndSizes } from "../utils/reconcile.js";

/**
 * Acquire a distributed Redis lock to guarantee only 1 node/cluster instance
 * executes a scheduled cron job at a time.
 */
async function acquireDistributedLock(jobKey, ttlSeconds = 3600) {
  try {
    const result = await redis.set(`lock:cron:${jobKey}`, "locked", {
      NX: true, // Only set if key does not exist
      EX: ttlSeconds, // Auto-release lock after TTL as fail-safe
    });
    return result === "OK";
  } catch (err) {
    // If Redis is offline, allow single local fallback execution
    console.warn(`[Cron Lock] Redis unavailable for ${jobKey}, executing locally: ${err.message}`);
    return true;
  }
}

/**
 * Release the distributed Redis lock upon job completion.
 */
async function releaseDistributedLock(jobKey) {
  try {
    await redis.del(`lock:cron:${jobKey}`);
  } catch (err) {
    console.error(`[Cron Lock] Error releasing lock for ${jobKey}:`, err.message);
  }
}

/**
 * Job 1: Daily Trash & 60-Day Unsubscribed Account Assets Purge
 * Schedule: Runs daily at 03:00 AM UTC (03:00:00)
 */
export async function runDailyStorageCleanup() {
  const jobKey = "daily-storage-cleanup";
  const locked = await acquireDistributedLock(jobKey, 7200); // 2-hour lock window
  if (!locked) {
    console.log(`[Cron:StorageCleanup] Job already running on another instance. Skipping.`);
    return;
  }

  console.log(`[Cron:StorageCleanup] 🕒 Starting scheduled daily storage & trash purge at 03:00 AM UTC...`);
  try {
    await cleanFiles();
    console.log(`[Cron:StorageCleanup] ✅ Daily storage & trash purge completed successfully.`);
  } catch (err) {
    console.error(`[Cron:StorageCleanup] ❌ Error during storage cleanup:`, err);
  } finally {
    await releaseDistributedLock(jobKey);
  }
}

/**
 * Job 2: Hourly Stale OTP & Token Garbage Collection
 * Schedule: Runs at minute 0 of every hour
 */
export async function runHourlyOtpCleanup() {
  const jobKey = "hourly-otp-cleanup";
  const locked = await acquireDistributedLock(jobKey, 600); // 10-minute lock window
  if (!locked) {
    return;
  }

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await OTP.deleteMany({
      createdAt: { $lt: tenMinutesAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`[Cron:OtpCleanup] 🧹 Purged ${result.deletedCount} expired OTP records.`);
    }
  } catch (err) {
    console.error(`[Cron:OtpCleanup] ❌ Error during OTP cleanup:`, err.message);
  } finally {
    await releaseDistributedLock(jobKey);
  }
}

/**
 * Job 3: Weekly Directory Tree & Storage Size Reconciliation
 * Schedule: Runs every Sunday at 04:00 AM UTC
 */
export async function runWeeklyReconciliation() {
  const jobKey = "weekly-reconciliation";
  const locked = await acquireDistributedLock(jobKey, 3600);
  if (!locked) {
    console.log(`[Cron:Reconciliation] Job already running on another instance. Skipping.`);
    return;
  }

  console.log(`[Cron:Reconciliation] 🔄 Starting weekly directory tree & size reconciliation...`);
  try {
    await reconcileDirectoryPathsAndSizes();
    console.log(`[Cron:Reconciliation] ✅ Weekly reconciliation completed successfully.`);
  } catch (err) {
    console.error(`[Cron:Reconciliation] ❌ Error during reconciliation:`, err);
  } finally {
    await releaseDistributedLock(jobKey);
  }
}

/**
 * Initialize all scheduled cron jobs on server boot.
 */
export function startScheduledJobs() {
  console.log(`[Cron Scheduler] 🚀 Initializing production cron jobs with distributed Redis locking...`);

  // 1. Daily 3:00 AM UTC Storage & Trash Purge (0 3 * * *)
  cron.schedule("0 3 * * *", () => {
    runDailyStorageCleanup();
  });

  // 2. Hourly Stale OTP Cleanup (0 * * * *)
  cron.schedule("0 * * * *", () => {
    runHourlyOtpCleanup();
  });

  // 3. Weekly Sunday 4:00 AM UTC Integrity Reconciliation (0 4 * * 0)
  cron.schedule("0 4 * * 0", () => {
    runWeeklyReconciliation();
  });

  console.log(`[Cron Scheduler] ✅ 3 Cron jobs registered: [Daily 03:00 UTC Purge, Hourly OTP GC, Weekly Sunday 04:00 UTC Reconcile]`);
}
