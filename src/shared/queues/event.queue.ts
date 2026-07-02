
import { Queue }             from 'bullmq';
import { env }               from '../../config/env.js';
import { bullmqConnection }  from './bullmq-connection.js';
import { JOB_NAMES, type EventJobPayload, type JobName }
  from './queue.types.js';

// Queue<DataType, ResultType, NameType>
// DataType  = EventJobPayload  (shape of the job data)
// ResultType = void            (processor returns nothing)
// NameType  = JobName          ('process.event')
export const eventQueue = new Queue<EventJobPayload, void, JobName>(
  'events',
  {
    connection: bullmqConnection,   // plain config, not a Redis instance
    defaultJobOptions: {
      attempts: env.QUEUE_MAX_ATTEMPTS,
      backoff:  { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 100 },
      removeOnFail:     false,
    },
  }
);

export async function enqueueEvent(
  payload: EventJobPayload,
): Promise<void> {
  await eventQueue.add(
    JOB_NAMES.PROCESS_EVENT,  // ✓ now matches JobName type
    payload,
    { jobId: payload.eventId },
  );
  console.log(`[queue] enqueued ${payload.eventId}`);
}