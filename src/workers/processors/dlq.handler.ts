import type { Job } from 'bullmq';
import { pool } from '../../shared/db/pool.js';
import type { EventJobPayload } from '../../shared/queues/queue.types.js';

export async function handleDlq(
  job:   Job<EventJobPayload>,
  error: Error,
): Promise<void> {
  console.error('[dlq] ══════════════════════════');
  console.error(`[dlq] DEAD: event=${job.data.eventId}`);
  console.error(`[dlq] error: ${error.message}`);
  console.error(`[dlq] attempts: ${job.attemptsMade}`);
  console.error('[dlq] ══════════════════════════');

  await pool.query(
    'UPDATE events SET status=$1 WHERE id=$2',
    ['failed', job.data.eventId]
  );
  // Phase 4: replace above with Prometheus counter + Slack alert
}