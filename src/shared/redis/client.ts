import { Redis } from 'ioredis';
import { env }   from '../../config/env.js';

const baseConfig = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD || undefined,
  lazyConnect:          true,
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

// Used by API and worker: GET, SET, DEL, PUBLISH
export const redisClient = new Redis(baseConfig);

// Used ONLY by ws-server.ts for PSUBSCRIBE.
// Once a connection calls PSUBSCRIBE it is locked in
// listen-only mode — it cannot run any other Redis commands.
// This is why it needs its own dedicated connection object.
export const redisSubscriber = new Redis(baseConfig);

// Called in server.ts and worker.ts — connects the cache client only.
export async function connectRedis(): Promise<void> {
  await redisClient.connect();
  console.log('[redis] connected ✓');
}

// Called in ws-server.ts — connects the subscriber client only.
export async function connectRedisSubscriber(): Promise<void> {
  await redisSubscriber.connect();
  console.log('[redis:subscriber] connected ✓');
}

// Called in graceful shutdown of API + worker
export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  console.log('[redis] disconnected');
}

// Called in graceful shutdown of ws-server
export async function disconnectRedisSubscriber(): Promise<void> {
  await redisSubscriber.quit();
  console.log('[redis:subscriber] disconnected');
}

redisClient.on('error',     (err: Error) => console.error('[redis:client]',     err.message));
redisSubscriber.on('error', (err: Error) => console.error('[redis:subscriber]', err.message));
