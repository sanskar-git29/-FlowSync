
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// The cache-aside pattern:
//   READ  → check Redis first → hit = return fast, no DB
//                             → miss = read DB, save to Redis
//   WRITE → save to DB → delete the cached version (it's now stale)
//
// Without this, every GET /events hits PostgreSQL every time.
// With this, repeated calls for the same data return in <1ms.
//
// All functions catch Redis errors silently. If Redis goes down,
// your app still works — just slower (every request hits the DB).
// ─────────────────────────────────────────────────────────────

import { redisClient } from './client.js';

// Try to get a value from Redis.
// Returns null if the key doesn't exist or if Redis is down.
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    // Redis is down — caller will fall through to the database.
    return null;
  }
}

// Save a value to Redis with a TTL (time to live in seconds).
// When the TTL expires, Redis deletes the key automatically.
// ttlSeconds defaults to 300 = 5 minutes.
// Always set a TTL — never cache without one, or data goes stale forever.
export async function setCache<T>(
  key:        string,
  value:      T,
  ttlSeconds: number = 300,
): Promise<void> {
  try {
    // SETEX = SET + EXpiry in one atomic command.
    // Atomic means these two operations cannot be interrupted
    // by another command between them.
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis is down — skip caching. The data will be fetched from
    // DB on the next request. Not ideal but not a fatal error.
  }
}

// Delete all Redis keys matching a pattern.
// Used to bust stale cache when data changes.
// Example: deleteByPattern('events:user-uuid:*')
// deletes all cached pages for that user when they create an event.
export async function deleteByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return;
    await redisClient.del(...keys);
  } catch {
    // Redis is down — nothing to delete. The TTL will expire it eventually.
  }
}