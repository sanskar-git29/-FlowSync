import type { Job } from 'bullmq';
import { pool }                  from '../../shared/db/pool.js';
import { deleteByPattern }       from '../../shared/redis/cache.js';
import { publishEventUpdate }    from '../../shared/redis/publisher.js';
import { findTriggeredWorkflows, createWorkflowRun } from '../../modules/workflows/workflows.service.js';
import { enqueueWorkflowStep }   from '../../shared/queues/workflow.queue.js';
import type { EventJobPayload, EventJobName } from '../../shared/queues/queue.types.js';

export async function processEvent(
  job: Job<EventJobPayload, void, EventJobName>,
): Promise<void> {
  const { eventId, userId, type, payload } = job.data;
  console.log(`[processor] start eventId=${eventId} attempt=${job.attemptsMade + 1}`);

  // 1. Mark processing
  await pool.query('UPDATE events SET status=$1, updated_at=NOW() WHERE id=$2', ['processing', eventId]);
  await deleteByPattern(`events:${userId}:*`);

  // 2. Business logic placeholder
  await job.updateProgress(50);
  await new Promise<void>(r => setTimeout(r, 100));
  await job.updateProgress(100);

  // 3. Mark completed
  await pool.query('UPDATE events SET status=$1, updated_at=NOW() WHERE id=$2', ['completed', eventId]);
  await deleteByPattern(`events:${userId}:*`);

  // 4. Real-time push (Phase 3)
  await publishEventUpdate(userId, { type: 'event.completed', event: { id: eventId, status: 'completed', type } });

  // 5. Trigger workflows (Phase 5)
  const workflows = await findTriggeredWorkflows(userId, type);
  for (const wf of workflows) {
    const initialContext = { event: { id: eventId, type, payload } };
    const run = await createWorkflowRun(wf.id, eventId, initialContext);
    await enqueueWorkflowStep({ workflowRunId: run.id, workflowId: wf.id, eventId, userId, stepPosition: 1, context: initialContext });
    console.log(`[processor] triggered workflow=${wf.id} run=${run.id}`);
  }

  console.log(`[processor] done eventId=${eventId}`);
}