// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// Your app needs its own Redis connections — separate from BullMQ:
//   redisClient     → for reading/writing cache (GET, SET, DEL)
//   redisSubscriber → for pub/sub listening (Phase 3 WebSockets)
//
// These use YOUR ioredis package, not BullMQ's bundled copy.
// They are completely separate from BullMQ's internal connection.
// ─────────────────────────────────────────────────────────────

import { Redis } from 'ioredis';
import { env }   from '../../config/env.js';

const baseConfig = {
  host:     env.REDIS_HOST,
  port:     env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,

  // lazyConnect: true means the connection is not established
  // when you call new Redis(). It waits until you call .connect().
  // This gives you control over the startup sequence — you can
  // connect to DB first, then Redis, in the correct order.
  lazyConnect:          true,
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

// For all cache operations: GET, SET, DEL, KEYS
export const redisClient = new Redis(baseConfig);

// For pub/sub in Phase 3. Once you call PSUBSCRIBE on a Redis
// connection, that connection becomes read-only — it can no longer
// run GET or SET. So it needs its own dedicated connection.
export const redisSubscriber = new Redis(baseConfig);

// Called in server.ts and worker.ts on startup.
// Fails loudly if Redis is unreachable — better than starting
// with a broken cache that silently falls back to the DB every time.
export async function connectRedis(): Promise<void> {
  await redisClient.connect();
  console.log('[redis] connected ✓');
}

// Called in graceful shutdown. Closes connections cleanly
// instead of letting them hang and time out.
export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  await redisSubscriber.quit();
  console.log('[redis] disconnected');
}

// Log Redis errors to the console without crashing the process.
// Redis going down should not take down your entire API server.
// Your app will be slower (cache misses hitting the DB) but alive.
redisClient.on('error',     (err: Error) => console.error('[redis:client]',     err.message));
redisSubscriber.on('error', (err: Error) => console.error('[redis:subscriber]', err.message));