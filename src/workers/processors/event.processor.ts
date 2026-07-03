// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// This is the actual work function. BullMQ calls this function
// with each job. It runs inside the Worker process, completely
// separate from the API server.
//
// Two rules about this function:
//   1. If it throws → BullMQ marks the job FAILED and retries it
//   2. If it returns → BullMQ marks the job COMPLETED
//
// Every step must be safe to run twice (idempotent).
// If the worker crashes mid-job, BullMQ re-runs the job from scratch.
// Running UPDATE events SET status='processing' twice is harmless.
// ─────────────────────────────────────────────────────────────

import type { Job } from 'bullmq';
import { pool }            from '../../shared/db/pool.js';
import { deleteByPattern } from '../../shared/redis/cache.js';
import type { EventJobPayload, JobName } from '../../shared/queues/queue.types.js';

// BullMQ calls this function once per job.
// The Job type carries both the data you put in (job.data)
// and BullMQ metadata (job.id, job.attemptsMade, job.opts).
export async function processEvent(
  job: Job<EventJobPayload, void, JobName>,
): Promise<void> {
  const { eventId, userId, type, payload } = job.data;

  console.log(
    `[processor] start`,
    `eventId=${eventId}`,
    `type=${type}`,
    `attempt=${job.attemptsMade + 1}/${job.opts.attempts ?? 3}`,
  );

  // Step 1: mark the event as 'processing' in the database.
  // This lets clients polling GET /events/:id see it's being worked on.
  // Safe to run twice — UPDATE on the same row just sets the same value.
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['processing', eventId],
  );

  // Step 2: invalidate the cached event list for this user.
  // The list is now stale because one of the events changed status.
  // The next GET /events call will be a cache miss and fetch fresh data.
  await deleteByPattern(`events:${userId}:*`);

  // Step 3: do the actual business logic.
  // Right now this is a placeholder. In future phases this will:
  //   - Evaluate workflow triggers
  //   - Execute workflow steps
  //   - Call external webhooks
  //   - Send notifications
  // For now: just simulate work with a small delay.
  await job.updateProgress(50);
  await new Promise<void>(resolve => setTimeout(resolve, 100));
  await job.updateProgress(100);

  // Step 4: mark the event as 'completed'.
  // Only reached if every step above succeeded.
  // If anything throws above, we never get here — BullMQ retries.
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['completed', eventId],
  );

  // Step 5: bust cache again so clients see the final 'completed' status.
  await deleteByPattern(`events:${userId}:*`);

  console.log(`[processor] done  eventId=${eventId}`);
}