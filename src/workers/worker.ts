import { Worker, type Job }          from 'bullmq';
import { connectDB, disconnectDB }    from '../shared/db/pool.js';
import { connectRedis, disconnectRedis } from '../shared/redis/client.js';
import { bullmqConnection }           from '../shared/queues/bullmq-connection.js';
import { env }                        from '../config/env.js';
import { logger }                     from '../shared/logger.js';
import { workerJobsTotal, workerDlqSize } from '../shared/metrics.js';
import { processEvent }               from './processors/event.processor.js';
import { handleDlq }                  from './processors/dlq.handler.js';
import { processWorkflowStep }        from './processors/workflow.processor.js';
import type { EventJobPayload, EventJobName,
               WorkflowJobPayload, WorkflowJobName } from '../shared/queues/queue.types.js';

await connectDB();
await connectRedis();

const workerOpts = { connection: bullmqConnection, concurrency: env.QUEUE_CONCURRENCY, lockDuration: 30_000 };

// ── Worker 1: Event queue ──────────────────────────────────────
const eventWorker = new Worker<EventJobPayload, void, EventJobName>('events', processEvent, workerOpts);

eventWorker.on('completed', (job: Job<EventJobPayload>) => {
  logger.info('[event-worker] completed', { jobId: job.id });
  workerJobsTotal.inc({ status: 'completed', event_type: job.data.type });
});
eventWorker.on('failed', async (job: Job<EventJobPayload> | undefined, err: Error) => {
  if (!job) return;
  const max = job.opts.attempts ?? env.QUEUE_MAX_ATTEMPTS;
  const final = job.attemptsMade >= max;
  logger.error('[event-worker] failed', { jobId: job.id, attempt: job.attemptsMade, final, error: err.message });
  workerJobsTotal.inc({ status: 'failed', event_type: job.data.type });
  if (final) { workerDlqSize.inc(); await handleDlq(job, err); }
});
eventWorker.on('error', (err) => logger.error('[event-worker] error', { error: err.message }));

// ── Worker 2: Workflow queue ───────────────────────────────────
const workflowWorker = new Worker<WorkflowJobPayload, void, WorkflowJobName>('workflows', processWorkflowStep, workerOpts);

workflowWorker.on('completed', (job: Job) =>
  logger.info('[workflow-worker] completed', { jobId: job.id })
);
workflowWorker.on('failed', (job: Job | undefined, err: Error) =>
  logger.error('[workflow-worker] failed', { jobId: job?.id, error: err.message })
);
workflowWorker.on('error', (err) =>
  logger.error('[workflow-worker] error', { error: err.message })
);

// ── Graceful shutdown — waits for all in-flight jobs ──────────
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`[worker] ${signal} — shutdown`);
  await Promise.all([eventWorker.close(), workflowWorker.close()]);
  await disconnectDB();
  await disconnectRedis();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

logger.info('[worker] ready', { concurrency: env.QUEUE_CONCURRENCY, queues: ['events', 'workflows'] });