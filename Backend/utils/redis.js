import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 1, // Fail fast
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
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
      await redis.set(key, value, "EX", ttlSeconds);
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
    const data = await redis.hgetall(key);
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
    await redis.hset(key, obj);
    if (ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }
  } catch (err) {
    console.error(`cacheHset error for key ${key}:`, err.message);
  }
}

export async function invalidateUserSessions(userId) {
  try {
    const setKey = `user_sessions:${userId}`;
    const sessionIds = await redis.smembers(setKey);
    if (sessionIds && sessionIds.length > 0) {
      const keysToDelete = sessionIds.map((sid) => `session:${sid}`);
      await redis.del(...keysToDelete);
    }
    await redis.del(setKey);
  } catch (err) {
    console.error(`invalidateUserSessions error for userId ${userId}:`, err.message);
  }
}

export default redis;
