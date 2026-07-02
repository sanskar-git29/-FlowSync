import { Redis } from 'ioredis';
import { redisClient } from './client.js';

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const v = await redisClient.get(key);
    return v ? JSON.parse(v) as T : null;
  } catch { return null; } // Redis down → fall through to DB
}

export async function setCache<T>(
  key: string, value: T, ttl = 300
): Promise<void> {
  try { await redisClient.setex(key, ttl, JSON.stringify(value)); }
  catch {} // Redis down → skip caching, not a fatal error
}

export async function deleteByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  } catch {}
}