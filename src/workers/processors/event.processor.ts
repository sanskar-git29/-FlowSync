import type { Job } from 'bullmq';
import { pool }         from '../../shared/db/pool.js';
import { deleteByPattern } from '../../shared/redis/cache.js';
import type { EventJobPayload } from '../../shared/queues/queue.types.js';

export async function processEvent(
  job: Job<EventJobPayload>
): Promise<void> {
  const { eventId, userId, type } = job.data;
  console.log(`[processor] event=${eventId} attempt=${job.attemptsMade + 1}`);

  await pool.query(
    'UPDATE events SET status=$1 WHERE id=$2',
    ['processing', eventId]
  );
  await deleteByPattern(`events:${userId}:*`); // bust cache

  await job.updateProgress(50);
  // ↑ real work goes here in future phases
  await new Promise(r => setTimeout(r, 100));   // simulate work
  await job.updateProgress(100);

  await pool.query(
    'UPDATE events SET status=$1 WHERE id=$2',
    ['completed', eventId]
  );
  console.log(`[processor] ✓ ${eventId}`);
}