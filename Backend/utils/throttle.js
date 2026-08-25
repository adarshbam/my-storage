import redis from "../databases/redis.js";

// In-memory fallback when Redis is unavailable
const memoryStore = new Map();
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Periodically clean expired entries from the in-memory fallback
setInterval(() => {
  const now = Date.now();
  for (const [key, store] of memoryStore) {
    // If the slot expired more than 2x the typical max delay ago, it's stale
    if (now - store.nextSlot > 60_000) {
      memoryStore.delete(key);
    }
  }
}, MEMORY_CLEANUP_INTERVAL);

/**
 * Resolve the best identity key for throttling.
 * Priority: authenticated userId > sessionId cookie > IP address
 */
function resolveIdentity(req) {
  if (req.user?.id) return `uid:${req.user.id}`;
  const sid = req.signedCookies?.sessionId;
  if (sid && sid !== false) return `sid:${sid}`;
  return `ip:${req.ip}`;
}

/**
 * Try to read throttle state from Redis.
 * Returns { nextSlot, allowReq } or null on failure.
 */
async function redisGet(key) {
  try {
    const data = await redis.hGetAll(key);
    if (data && data.nextSlot) {
      return {
        nextSlot: parseInt(data.nextSlot, 10),
        allowReq: parseInt(data.allowReq, 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write throttle state to Redis with TTL.
 * TTL is set to delayMs * (maxFastReq + 5) to cover the full queue window + buffer.
 */
async function redisSet(key, store, ttlMs) {
  try {
    await redis.hSet(key, {
      nextSlot: String(store.nextSlot),
      allowReq: String(store.allowReq),
    });
    // TTL in seconds, minimum 60s
    const ttlSec = Math.max(Math.ceil(ttlMs / 1000), 60);
    await redis.expire(key, ttlSec);
  } catch {
    // Silently fail — in-memory fallback will handle it
  }
}

const MAX_QUEUE_WAIT_MS = 5000; // 5 seconds maximum queue buffer before rejecting

/**
 * Throttle middleware factory.
 *
 * @param {number} delayMs    — Minimum delay between queued requests (default 1000ms)
 * @param {number} maxFastReq — Number of requests allowed instantly before queuing (default 3)
 * @param {string} tag        — Route tag for independent throttle buckets (default "default")
 */
export default function throttle(
  delayMs = 1000,
  maxFastReq = 3,
  tag = "default",
) {
  const effectiveDelay = delayMs;
  const effectiveFastReq = maxFastReq;

  return async (req, res, next) => {
    const now = Date.now();
    const identity = resolveIdentity(req);
    const key = `throttle:${tag}:${identity}`;

    // 1. Try Redis first
    let store = await redisGet(key);

    // 2. Fallback to in-memory
    if (!store) {
      store = memoryStore.get(key) || null;
    }

    // 3. First request — initialize
    if (!store) {
      store = { nextSlot: 0, allowReq: effectiveFastReq };
    }

    // Queue cleared — reset fast allowance
    if (now >= store.nextSlot) {
      store.allowReq = effectiveFastReq;
    }

    if (now >= store.nextSlot || store.allowReq > 0) {
      store.allowReq--;
      store.nextSlot = now + effectiveDelay;

      // Persist state
      const ttlMs = effectiveDelay * (effectiveFastReq + 5);
      memoryStore.set(key, store);
      redisSet(key, store, ttlMs); // Fire-and-forget

      return next();
    }

    const waitTime = store.nextSlot - now;

    // If wait time exceeds our maximum queue ceiling, reject immediately with 429 + Retry-After
    if (waitTime > MAX_QUEUE_WAIT_MS) {
      const retryAfterSec = Math.ceil(waitTime / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        status: 429,
        error: "Too Many Requests",
        message: "Requests arriving too quickly. Please slow down and try again.",
        retryAfter: retryAfterSec,
      });
    }

    store.nextSlot += effectiveDelay;

    // Persist updated state
    const ttlMs = effectiveDelay * (effectiveFastReq + 5);
    memoryStore.set(key, store);
    redisSet(key, store, ttlMs); // Fire-and-forget

    setTimeout(next, waitTime);
  };
}
