// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// This is the CONSUMER side. It is a completely separate Node.js
// process from the API server. It does NOT share memory, variables,
// or connections with the API.
//
// It connects to the SAME PostgreSQL and Redis as the API,
// but through its own independent connection pool and client.
//
// The Worker class from BullMQ:
//   - Connects to Redis
//   - Continuously polls the 'events' queue
//   - When a job appears, calls processEvent(job)
//   - Marks the job completed or failed based on the result
//   - Handles retries and stall detection automatically
// ─────────────────────────────────────────────────────────────

import { Worker, type Job } from 'bullmq';
import { connectDB, disconnectDB }       from '../shared/db/pool.js';
import { connectRedis, disconnectRedis } from '../shared/redis/client.js';
import { bullmqConnection }              from '../shared/queues/bullmq-connection.js';
import { env }                           from '../config/env.js';
import { processEvent }                  from './processors/event.processor.js';
import { handleDlq }                     from './processors/dlq.handler.js';
import type { EventJobPayload, JobName }  from '../shared/queues/queue.types.js';

// Connect dependencies before doing anything else.
// If the DB or Redis is unreachable, crash immediately with a clear error.
// A worker that can't connect to the DB is useless — failing fast is correct.
await connectDB();
await connectRedis();
console.log('[worker] dependencies connected');

// Worker
// Must match the Queue generics exactly. Same queue name 'events'.
const worker = new Worker<EventJobPayload, void, JobName>(
  'events',     // must match the Queue name in event.queue.ts exactly
  processEvent, // called once per job
  {
    connection:  bullmqConnection,
    concurrency: env.QUEUE_CONCURRENCY,

    // lockDuration: how long (ms) BullMQ holds a Redis lock on the job.
    // While a job is 'active', its lock is renewed every lockRenewTime ms.
    // If the worker crashes and stops renewing, the lock expires after
    // lockDuration ms. BullMQ detects this and marks the job as 'stalled',
    // then re-queues it automatically. This is crash recovery.
    lockDuration:  30_000,  // 30 seconds
    lockRenewTime: 15_000,  // renew every 15 seconds (must be < lockDuration)
  },
);

// 'completed' fires when processEvent returns without throwing.
worker.on('completed', (job: Job) => {
  console.log(`[worker] ✓ completed  jobId=${job.id}`);
});

// 'failed' fires when processEvent throws.
// If attempts < max, BullMQ retries automatically. We only
// call handleDlq when ALL attempts are exhausted.
worker.on('failed', async (
  job: Job<EventJobPayload, void, JobName> | undefined,
  err: Error,
) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts ?? env.QUEUE_MAX_ATTEMPTS;
  console.error(
    `[worker] ✗ failed`,
    `jobId=${job.id}`,
    `attempt=${job.attemptsMade}/${maxAttempts}`,
    `error=${err.message}`,
  );

  // Only call DLQ handler on the final failure, not on retries.
  if (job.attemptsMade >= maxAttempts) {
    await handleDlq(job, err);
  }
});

// 'stalled' means: the worker was processing this job but crashed
// mid-execution, the lock expired, and BullMQ detected it.
// BullMQ re-queues the job automatically. This just logs the event.
worker.on('stalled', (jobId: string) => {
  console.warn(`[worker] ⚠ stalled  jobId=${jobId} — re-queued by BullMQ`);
});

worker.on('error', (err: Error) => {
  console.error('[worker] error:', err.message);
});

// ─────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
//
// When Docker stops a container, or Kubernetes redeploys,
// SIGTERM is sent first. Without this handler, the process
// dies immediately — any job mid-execution is corrupted.
//
// With this handler:
//   1. worker.close() tells BullMQ to stop picking up new jobs
//   2. It waits for in-flight jobs to finish
//   3. Then we close DB and Redis connections
//   4. Then we exit cleanly with code 0
// ─────────────────────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  console.log(`[worker] ${signal} received — shutting down gracefully`);
  await worker.close();
  await disconnectDB();
  await disconnectRedis();
  console.log('[worker] shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));   // Ctrl+C in dev

process.on('unhandledRejection', (reason) => {
  console.error('[worker] unhandledRejection:', reason);
  process.exit(1);
});

console.log(
  `[worker] ready  queue=events  concurrency=${env.QUEUE_CONCURRENCY}`,
);