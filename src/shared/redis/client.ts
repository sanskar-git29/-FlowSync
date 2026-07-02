import { Redis } from 'ioredis';
import { env }   from '../../config/env.js';

const base = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
  lazyConnect:          true,
};

// For cache reads/writes and pub/sub publishing
export const redisClient     = new Redis(base);

// For pub/sub subscribing (Phase 3 — PSUBSCRIBE locks this connection)
export const redisSubscriber = new Redis(base);

// Note: NO 'redis' export here anymore
// BullMQ manages its own connection via bullmq-connection.ts

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
  console.log('[redis] connected ✓');
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  await redisSubscriber.quit();
  console.log('[redis] disconnected');
}

[redisClient, redisSubscriber].forEach((r, i) =>
  r.on('error', (err: Error) =>
    console.error(`[redis:${i}]`, err.message)
  )
);