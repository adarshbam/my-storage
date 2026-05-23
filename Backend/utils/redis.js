import { createClient } from "redis";

const redis = createClient({
  url: "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
  disableOfflineQueue: true, // Fail fast: reject commands immediately if disconnected
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.connect().catch((err) => {
  console.error("Redis initial connect failed:", err.message);
});

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

export default redis;
