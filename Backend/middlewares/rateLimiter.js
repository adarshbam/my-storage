import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../utils/redis.js";

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

// 1. Registration Limiter: max 3 account creations per hour (strict — argon2 hashing)
export const registerLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  "Too many account creation attempts. Please try again after an hour.",
  "register"
);

// 2. Login Limiter: max 10 requests per 15 minutes
export const loginLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many login attempts. Please try again after 15 minutes.",
  "login"
);

// 3. OTP Limiter (Send & Verify): max 5 attempts per 15 minutes
export const otpLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many OTP requests or verification attempts. Please try again after 15 minutes.",
  "otp"
);

// 4. Password Reset Limiter: max 5 requests per 15 minutes
export const passwordResetLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many password reset requests. Please try again after 15 minutes.",
  "pwd-reset"
);

// 5. Password Update Limiter: max 10 requests per 15 minutes
export const passwordUpdateLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many password update attempts. Please try again after 15 minutes.",
  "pwd-update"
);

// ────────────────────────────────────────────────────────────────────────────────
// OPERATION LIMITERS (authenticated routes — keyed by userId)
// ────────────────────────────────────────────────────────────────────────────────

// 6. Heavy Operation Limiter (Zips, Cross-provider transfers, Batch Deletes): max 5 / 15min
export const heavyOpLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many heavy operations performed. Please try again after 15 minutes.",
  "heavy-op"
);

// 7. File Upload Limiter: max 30 uploads per 15 minutes
export const uploadLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many file upload requests. Please try again after 15 minutes.",
  "upload"
);

// 8. Search Limiter: max 30 searches per 15 minutes
export const searchLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many search queries. Please try again after 15 minutes.",
  "search"
);

// 9. Thumbnail Limiter: max 100 requests per 15 minutes (must be fast for UI)
export const thumbnailLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  "Too many thumbnail requests. Please try again after 15 minutes.",
  "thumbnail"
);

// 10. Light Read Limiter: max 100 / 15min (user info, profile pic GET, searched items, theme)
export const lightReadLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  "Too many requests. Please slow down.",
  "light-read"
);

// 11. Standard Write Limiter: max 60 / 15min (directory CRUD, file rename/delete, get)
export const standardWriteLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  60,
  "Too many requests. Please slow down.",
  "std-write"
);

// 12. Medium Write Limiter: max 30 / 15min (file save, GitHub/Drive write ops)
export const mediumWriteLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many write operations. Please slow down.",
  "med-write"
);

// 13. Share Limiter: max 20 / 15min (share link generation/claiming)
export const shareLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  20,
  "Too many share requests. Please slow down.",
  "share"
);

// 14. Admin Limiter: max 30 / 15min (system user management)
export const adminLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many admin operations. Please slow down.",
  "admin"
);

// 15. Profile Pic Upload Limiter: max 15 / 15min (sharp image processing)
export const profilePicLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  15,
  "Too many profile picture uploads. Please slow down.",
  "profile-pic"
);
