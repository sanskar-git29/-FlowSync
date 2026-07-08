import type { Job } from 'bullmq';
import { pool }             from '../../shared/db/pool.js';
import { deleteByPattern }  from '../../shared/redis/cache.js';
import { publishEventUpdate } from '../../shared/redis/publisher.js';  // ← ADD
import type { EventJobPayload, JobName } from '../../shared/queues/queue.types.js';

export async function processEvent(
  job: Job<EventJobPayload, void, JobName>,
): Promise<void> {
  const { eventId, userId, type } = job.data;

  console.log(`[processor] start eventId=${eventId} attempt=${job.attemptsMade + 1}`);

  // Step 1: mark processing in DB
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['processing', eventId],
  );

  // Step 2: bust cache
  await deleteByPattern(`events:${userId}:*`);

  // Step 3: business logic (placeholder — expand in future phases)
  await job.updateProgress(50);
  await new Promise<void>(r => setTimeout(r, 100));
  await job.updateProgress(100);

  // Step 4: mark completed in DB
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    ['completed', eventId],
  );

  // Step 5: bust cache again so next GET /events shows completed status
  await deleteByPattern(`events:${userId}:*`);

  // ── Step 6: publish real-time update ────────────────────── ← ADD
  // Worker publishes → Redis delivers → WS server receives →
  // WS server finds userId's connection → pushes to browser.
  // If no WebSocket client is connected, this is a no-op (0 subscribers).
  await publishEventUpdate(userId, {
    type:  'event.completed',
    event: { id: eventId, status: 'completed', type },
  });

  console.log(`[processor] done  eventId=${eventId}`);
}