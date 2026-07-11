// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// BullMQ bundles its own private copy of ioredis inside itself.
// If you create a Redis instance from YOUR ioredis and pass it
// to BullMQ, TypeScript sees two different Redis classes from
// two different packages and refuses to compile.
//
// The fix: pass a plain config object instead of a Redis instance.
// BullMQ reads this config and creates its own internal connection.
// You never touch BullMQ's internal ioredis at all.
// ─────────────────────────────────────────────────────────────

import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

export const bullmqConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,

  // If REDIS_PASSWORD is an empty string, pass undefined.
  // An empty string is not the same as no password to Redis —
  // it would cause an authentication failure.
  password: env.REDIS_PASSWORD || undefined,

  // BullMQ requires this to be null specifically.
  // It disables ioredis's automatic retry on every command,
  // letting BullMQ manage its own retry logic instead.
  maxRetriesPerRequest: null,

  // Skip the initial ready check — BullMQ handles this itself.
  enableReadyCheck: false,
};

