import type { Job } from 'bullmq';
import { pool }               from '../../shared/db/pool.js';
import { publishEventUpdate } from '../../shared/redis/publisher.js';  // ← ADD
import type { EventJobPayload, JobName } from '../../shared/queues/queue.types.js';

export async function handleDlq(
  job:   Job<EventJobPayload, void, JobName>,
  error: Error,
): Promise<void> {
  const { eventId, userId, type } = job.data;

  console.error('[dlq] ══════════════════════════════════════');
  console.error(`[dlq] PERMANENTLY FAILED  eventId=${eventId}`);
  console.error(`[dlq] type=${type}  userId=${userId}`);
  console.error(`[dlq] attempts=${job.attemptsMade}`);
  console.error(`[dlq] error=${error.message}`);
  console.error('[dlq] ══════════════════════════════════════');

  // Mark as failed in PostgreSQL
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['failed', eventId],
  );

  // ── Publish failure to WebSocket clients ─────────── ← ADD
  // Client's browser receives this and can show an error message:
  // "Your event failed. Please try again."
  await publishEventUpdate(userId, {
    type:  'event.failed',
    event: { id: eventId, status: 'failed', type },
  });
}