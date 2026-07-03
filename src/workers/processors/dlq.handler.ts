// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// When a job fails all its retry attempts, it is considered
// permanently failed. This function is called once at that point.
//
// Responsibilities:
//   1. Mark the event as 'failed' in PostgreSQL so the user
//      can see their event failed (not just stuck in 'pending')
//   2. Log everything needed to debug the failure
//   3. Alert the team (in Phase 4 this becomes Prometheus + Slack)
//
// The failed job stays in Redis. You can inspect it, replay it,
// or clear it using BullMQ's API or a dashboard like Bull Board.
// ─────────────────────────────────────────────────────────────

import type { Job } from 'bullmq';
import { pool } from '../../shared/db/pool.js';
import type { EventJobPayload, JobName } from '../../shared/queues/queue.types.js';

export async function handleDlq(
  job:   Job<EventJobPayload, void, JobName>,
  error: Error,
): Promise<void> {
  // Log with clear formatting so this stands out in your terminal
  console.error('[dlq] ════════════════════════════════════════');
  console.error(`[dlq] PERMANENTLY FAILED`);
  console.error(`[dlq] eventId:  ${job.data.eventId}`);
  console.error(`[dlq] userId:   ${job.data.userId}`);
  console.error(`[dlq] type:     ${job.data.type}`);
  console.error(`[dlq] attempts: ${job.attemptsMade}`);
  console.error(`[dlq] error:    ${error.message}`);
  console.error('[dlq] ════════════════════════════════════════');

  // Update the database so the user sees their event as failed.
  // Without this, the event stays as 'processing' in the DB forever —
  // the user has no way to know something went wrong.
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['failed', job.data.eventId],
  );

  // TODO Phase 4: replace console.error with:
  //   prometheusCounter.inc({ type: job.data.type })
  //   await slackAlert({ eventId, error: error.message })
  //
  // For now, the console.error above is your alert.
  // If you see this in your terminal, something needs fixing.
}