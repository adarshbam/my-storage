import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../databases/redis.js";

/**
 * Resolve the best identity key for rate limiting.
 * Priority: authenticated userId > sessionId cookie > IP address
 */
function keyGenerator(req) {
  if (req.user?.id) return `uid:${req.user.id}`;
  const sid = req.signedCookies?.sessionId;
  if (sid && sid !== false) return `sid:${sid}`;
  return ipKeyGenerator(req.ip);
}

/**
 * Fallback store that delegates to RedisStore if Redis is connected/ready,
 * and falls back to a local in-memory store otherwise. This prevents
 * "ClientOfflineError" and other async connection startup warnings.
 */
class FallbackStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.redisStore = null;
    this.localStore = new Map();
    this.options = null;
  }

  async init(options) {
    this.options = options;
    // Only attempt to initialize RedisStore if Redis client has connected/is open
    if (redis.isOpen && redis.isReady) {
      try {
        this.redisStore = new RedisStore({
          sendCommand: (...args) => redis.sendCommand(args),
          prefix: `rl:${this.prefix}:`,
        });
        if (typeof this.redisStore.init === "function") {
          await this.redisStore.init(options);
        }
      } catch (err) {
        this.redisStore = null;
      }
    }
  }

  async increment(key) {
    if (redis.isReady) {
      if (!this.redisStore) {
        try {
          this.redisStore = new RedisStore({
            sendCommand: (...args) => redis.sendCommand(args),
            prefix: `rl:${this.prefix}:`,
          });
          if (typeof this.redisStore.init === "function" && this.options) {
            await this.redisStore.init(this.options);
          }
        } catch (err) {
          this.redisStore = null;
        }
      }
      if (this.redisStore) {
        try {
          return await this.redisStore.increment(key);
        } catch (err) {
          this.redisStore = null; // Fallback to memory on failure
        }
      }
    }

    // In-memory fallback
    const now = Date.now();
    const windowMs = this.options ? this.options.windowMs : 15 * 60 * 1000;
    let record = this.localStore.get(key);
    if (!record || record.resetTime <= now) {
      record = {
        totalHits: 0,
        resetTime: now + windowMs,
      };
    }
    record.totalHits++;
    this.localStore.set(key, record);

    return {
      totalHits: record.totalHits,
      resetTime: new Date(record.resetTime),
    };
  }

  async decrement(key) {
    if (redis.isReady && this.redisStore) {
      try {
        if (typeof this.redisStore.decrement === "function") {
          await this.redisStore.decrement(key);
          return;
        }
      } catch {
        // Fallback silently
      }
    }
    const record = this.localStore.get(key);
    if (record && record.totalHits > 0) {
      record.totalHits--;
    }
  }

  async resetKey(key) {
    if (redis.isReady && this.redisStore) {
      try {
        if (typeof this.redisStore.resetKey === "function") {
          await this.redisStore.resetKey(key);
          return;
        }
      } catch {
        // Fallback silently
      }
    }
    this.localStore.delete(key);
  }
}

/**
 * Create a resilient rate-limit store.
 */
function createStore(prefix) {
  return new FallbackStore(prefix);
}

const isDev = process.env.NODE_ENV !== "production";

// Centralized helper to create consistent and professional rate limiters
const createLimiter = (windowMs, limit, message, prefix) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator,
    store: createStore(prefix),
    message: {
      status: 429,
      error: "Too Many Requests",
      message,
    },
  });
};

// ────────────────────────────────────────────────────────────────────────────────
// AUTH LIMITERS (unauthenticated routes — keyed by sessionId cookie or IP)
// ────────────────────────────────────────────────────────────────────────────────

// 1. Registration Limiter: max 5 account creations per hour (strict — argon2 hashing)
export const registerLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  "Too many account creation attempts. Please try again after an hour.",
  "register",
);

// 2. Login Limiter: max 15 requests per 15 minutes
export const loginLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many login attempts. Please try again after 15 minutes.",
  "login",
);

// 3. Email OTP Limiters (Decoupled Send vs Verify to prevent UX lockouts while protecting mailers)
export const otpSendLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many OTP requests. Please wait a few minutes before requesting a new code.",
  "otp-send",
);

export const otpVerifyLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many OTP verification attempts. Please request a new code or try again later.",
  "otp-verify",
);

// Backwards compatibility alias
export const otpLimiter = otpSendLimiter;

// 4. Password Reset Limiters
export const passwordResetLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many password reset requests. Please try again after 15 minutes.",
  "pwd-reset",
);

export const passwordResetSubmitLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many password reset attempts. Please try again after 15 minutes.",
  "pwd-reset-submit",
);

// 5. Password Update Limiter: max 10 requests per 15 minutes
export const passwordUpdateLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many password update attempts. Please try again after 15 minutes.",
  "pwd-update",
);

// ────────────────────────────────────────────────────────────────────────────────
// OPERATION LIMITERS (authenticated routes — keyed by userId)
// ────────────────────────────────────────────────────────────────────────────────

// 6. Heavy Operation Limiter (Zips, Cross-provider transfers, Batch Deletes): max 10 / 15min
export const heavyOpLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many heavy operations performed. Please try again after 15 minutes.",
  "heavy-op",
);

// 7. File Upload Limiter: max 60 uploads per 15 minutes
export const uploadLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  60,
  "Too many file upload requests. Please try again after 15 minutes.",
  "upload",
);

// 8. Directory & File Read Limiter: max 1200 requests per 1 minute (high throughput for navigation & listings)
export const directoryReadLimiter = createLimiter(
  60 * 1000, // 1 minute window
  1200,
  "Too many directory read requests. Please try again after 1 minute.",
  "dir-read",
);

// 9. Light Read Limiter: max 400 / 1min (user info, profile pic GET, searched items, theme)
export const lightReadLimiter = createLimiter(
  60 * 1000, // 1 minute window
  400,
  "Too many requests. Please slow down.",
  "light-read",
);

// 10. Thumbnail Limiter: max 800 requests per 1 minute (ultra fast for UI grid previews)
export const thumbnailLimiter = createLimiter(
  60 * 1000, // 1 minute window
  800,
  "Too many thumbnail requests. Please try again after 1 minute.",
  "thumbnail",
);

// 11. Search Limiter: max 200 searches per 1 minute
export const searchLimiter = createLimiter(
  60 * 1000, // 1 minute window
  200,
  "Too many search queries. Please try again after 1 minute.",
  "search",
);

// 12. Standard Write Limiter: max 80 / 15min (directory CRUD, file rename/delete)
export const standardWriteLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  80,
  "Too many requests. Please slow down.",
  "std-write",
);

// 13. Medium Write Limiter: max 40 / 15min (file save, GitHub/Drive write ops)
export const mediumWriteLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  40,
  "Too many write operations. Please slow down.",
  "med-write",
);

// 14. Share Limiter: max 30 / 15min (share link generation/claiming)
export const shareLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many share requests. Please slow down.",
  "share",
);

// 15. Admin Limiter: max 100 / 1min (system user management)
export const adminLimiter = createLimiter(
  60 * 1000, // 1 minute window
  100,
  "Too many admin operations. Please slow down.",
  "admin",
);

// 16. Profile Pic Upload Limiter: max 30 / 1min (image processing)
export const profilePicLimiter = createLimiter(
  60 * 1000, // 1 minute window
  30,
  "Too many profile picture uploads. Please slow down.",
  "profile-pic",
);

// 17. Free Trial Activation Limiter: max 5 activation attempts per 15 minutes (prevents race abuse)
export const trialActivationLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many trial activation attempts. Please try again after 15 minutes.",
  "trial-activate",
);

// 18. Subscription Limiter: max 20 requests per 15 minutes (calibrated for real payment & subscription actions)
export const subscriptionLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  20,
  "Too many subscription requests. Please try again after 15 minutes.",
  "subscription",
);

// 19. Webhook Limiter: max 100 / 15min (Razorpay sends events — generous limit)
export const webhookLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  "Too many webhook events. Please slow down.",
  "webhook",
);

// 20. Phone OTP Limiters (Decoupled Send vs Verify)
export const phoneOtpSendLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many phone verification requests. Please wait a few minutes before requesting another code.",
  "phone-otp-send",
);

export const phoneOtpVerifyLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many phone verification attempts. Please request a new code or try again later.",
  "phone-otp-verify",
);

// Backwards compatibility alias
export const phoneOtpLimiter = phoneOtpSendLimiter;

// 21. Two-Factor Authentication Limiter: max 15 attempts per 15 minutes
export const twoFactorLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many 2FA verification attempts. Please try again after 15 minutes.",
  "2fa",
);

// 22. Secondary Recovery Email Limiters (Decoupled Send vs Verify)
export const recoveryEmailSendLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many recovery email verification requests. Please wait before requesting another code.",
  "rec-email-send",
);

export const recoveryEmailVerifyLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many recovery email verification attempts. Please try again after 15 minutes.",
  "rec-email-verify",
);

// Backwards compatibility alias
export const recoveryEmailLimiter = recoveryEmailSendLimiter;

// 23. Test Route Limiter: max 120 requests per 1 minute (safe for deployment checks & monitoring)
export const testLimiter = createLimiter(
  60 * 1000, // 1 minute window
  120,
  "Too many test requests. Please slow down.",
  "test",
);

