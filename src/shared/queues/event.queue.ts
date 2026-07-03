// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// This is the PRODUCER side of the queue.
// The API calls enqueueEvent() after inserting an event to the DB.
// That pushes a job into Redis. The worker (a separate process)
// picks it up and processes it.
//
// The API never waits for the job to complete. It just drops the
// job into the queue and moves on. That's what makes it async.
// ─────────────────────────────────────────────────────────────

import { Queue }            from 'bullmq';
import { env }              from '../../config/env.js';
import { bullmqConnection } from './bullmq-connection.js';
import {
  JOB_NAMES,
  type EventJobPayload,
  type JobName,
} from './queue.types.js';

// Queue
//
// DataType   = EventJobPayload — shape of the data in each job
// ResultType = void            — our processor returns nothing
// NameType   = JobName         — the literal string 'process.event'
//
// All three must match exactly between Queue and Worker.
export const eventQueue = new Queue<EventJobPayload, void, JobName>(
  'events',  // queue name — worker.ts must use the EXACT same string
  {
    connection: bullmqConnection,
    defaultJobOptions: {
      // Total number of attempts before a job is considered permanently failed.
      // attempt 1 = first try, attempt 2 = first retry, attempt 3 = second retry.
      attempts: env.QUEUE_MAX_ATTEMPTS,

      // Exponential backoff: wait 2s before retry 1, 4s before retry 2, 8s before retry 3.
      // This gives external services (webhooks, emails) time to recover
      // instead of hammering them immediately on failure.
      backoff: { type: 'exponential', delay: 2_000 },

      // Keep the last 100 completed jobs in Redis for debugging.
      // Lets you inspect what jobs ran recently without flooding Redis memory.
      removeOnComplete: { count: 100 },

      // Never auto-delete failed jobs.
      // Failed jobs ARE your dead-letter queue. They stay in Redis
      // so you can inspect them, replay them, or alert on them.
      removeOnFail: false,
    },
  },
);

// The only function the API calls. Hides all BullMQ internals
// behind a clean interface. If you ever swap BullMQ for another
// queue library, you only change this one function.
export async function enqueueEvent(
  payload: EventJobPayload,
): Promise<void> {
  await eventQueue.add(
    JOB_NAMES.PROCESS_EVENT,
    payload,
    {
      // jobId = idempotency key.
      // If the same event is enqueued twice (e.g. a network retry
      // caused the API to receive the same request twice), BullMQ
      // silently ignores the second add() call because a job with
      // that ID already exists. The event is only processed once.
      jobId: payload.eventId,
    },
  );
  console.log(`[queue] enqueued → eventId=${payload.eventId} type=${payload.type}`);
}