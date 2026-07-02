import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

// Plain config object — NOT an ioredis Redis instance
// BullMQ takes this and creates its own internal ioredis connection
// This avoids the ioredis version conflict entirely
export const bullmqConnection: ConnectionOptions = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  // empty string breaks ioredis auth — must be undefined if no password
  password:             env.REDIS_PASSWORD || undefined,
  // BullMQ REQUIRES null here — NOT 0, NOT a number, exactly null
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};