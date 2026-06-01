import redis from "./redis.js";

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

/**
 * Throttle middleware factory.
 *
 * @param {number} delayMs    — Minimum delay between queued requests (default 1000ms)
 * @param {number} maxFastReq — Number of requests allowed instantly before queuing (default 3)
 * @param {string} tag        — Route tag for independent throttle buckets (default "default")
 */
export default function throttle(delayMs = 1000, maxFastReq = 3, tag = "default") {
  return async (req, res, next) => {
    const now = Date.now();
    const identity = resolveIdentity(req);
    const key = `throttle:${tag}:${identity}`;

    // 1. Try Redis first
    let store = await redisGet(key);
    let usingRedis = store !== null;

    // 2. Fallback to in-memory
    if (!store) {
      store = memoryStore.get(key) || null;
    }

    // 3. First request — initialize
    if (!store) {
      store = { nextSlot: 0, allowReq: maxFastReq };
    }

    // Queue cleared — reset fast allowance
    if (now >= store.nextSlot) {
      store.allowReq = maxFastReq;
    }

    if (now >= store.nextSlot || store.allowReq > 0) {
      store.allowReq--;
      store.nextSlot = now + delayMs;

      // Persist state
      const ttlMs = delayMs * (maxFastReq + 5);
      memoryStore.set(key, store);
      redisSet(key, store, ttlMs); // Fire-and-forget

      return next();
    }

    const waitTime = store.nextSlot - now;
    store.nextSlot += delayMs;

    // Persist updated state
    const ttlMs = delayMs * (maxFastReq + 5);
    memoryStore.set(key, store);
    redisSet(key, store, ttlMs); // Fire-and-forget

    setTimeout(next, waitTime);
  };
}
