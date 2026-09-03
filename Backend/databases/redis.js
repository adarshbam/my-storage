import { createClient } from "redis";
import { REDIS_URL } from "../config/config.js";

const isTls = typeof REDIS_URL === "string" && REDIS_URL.startsWith("rediss://");

const redis = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 10000,
    keepAlive: 30000,
    ...(isTls && { tls: true, rejectUnauthorized: false }),
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        return new Error("Redis reconnection retry limit reached");
      }
      return Math.min(retries * 200, 3000);
    },
  },
  disableOfflineQueue: true, // Fail fast: reject commands immediately if disconnected
});

let lastRedisErrorLog = 0;
redis.on("error", (err) => {
  const now = Date.now();
  if (now - lastRedisErrorLog > 10000) {
    lastRedisErrorLog = now;
    console.warn("⚠️ Redis connection notice:", err.message);
  }
});

redis.connect().catch((err) => {
  console.warn("⚠️ Redis initial connect notice:", err.message);
});

export async function disconnectRedis() {
  try {
    if (redis.isOpen) {
      await redis.quit();
      console.log("✅ Redis disconnected cleanly");
    }
  } catch (err) {
    console.warn("Redis disconnect notice:", err.message);
  }
}

export async function cacheGet(key) {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`cacheGet error for key ${key}:`, err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  try {
    if (ttlSeconds) {
      await redis.set(key, value, { EX: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (err) {
    console.error(`cacheSet error for key ${key}:`, err.message);
  }
}

export async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`cacheDel error for key ${key}:`, err.message);
  }
}

export async function cacheHgetall(key) {
  try {
    const data = await redis.hGetAll(key);
    if (data && Object.keys(data).length > 0) {
      return data;
    }
    return null;
  } catch (err) {
    console.error(`cacheHgetall error for key ${key}:`, err.message);
    return null;
  }
}

export async function cacheHset(key, obj, ttlSeconds) {
  try {
    await redis.hSet(key, obj);
    if (ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }
  } catch (err) {
    console.error(`cacheHset error for key ${key}:`, err.message);
  }
}

export async function cacheSadd(key, value, ttlSeconds) {
  try {
    await redis.sAdd(key, value);
    if (ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }
  } catch (err) {
    console.error(`cacheSadd error for key ${key}:`, err.message);
  }
}

export async function invalidateUserSessions(userId) {
  try {
    const setKey = `user_sessions:${userId}`;
    const sessionIds = await redis.sMembers(setKey);
    if (sessionIds && sessionIds.length > 0) {
      const keysToDelete = sessionIds.map((sid) => `session:${sid}`);
      await redis.del(keysToDelete);
    }
    await redis.del(setKey);
  } catch (err) {
    console.error(`invalidateUserSessions error for userId ${userId}:`, err.message);
  }
}

export async function invalidateAllPlanContexts() {
  try {
    const keys = await redis.keys("plan_context:*");
    if (keys && keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("invalidateAllPlanContexts error:", err.message);
  }
}

export async function invalidateAllSessions() {
  try {
    const keys = await redis.keys("session:*");
    if (keys && keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("invalidateAllSessions error:", err.message);
  }
}

export async function invalidateGlobalPlanCache() {
  await Promise.all([
    invalidateAllPlanContexts(),
    invalidateAllSessions(),
  ]).catch((err) => {
    console.error("invalidateGlobalPlanCache error:", err.message);
  });
}

export default redis;
