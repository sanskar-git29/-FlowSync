import { Queue }            from 'bullmq';
import { bullmqConnection } from './bullmq-connection.js';
import { JOB_NAMES, type WorkflowJobPayload, type WorkflowJobName } from './queue.types.js';

export const workflowQueue = new Queue<WorkflowJobPayload, void, WorkflowJobName>(
  'workflows',
  {
    connection: bullmqConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff:  { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 100 },
      removeOnFail:     false,
    },
  },
);

export async function enqueueWorkflowStep(
  payload:  WorkflowJobPayload,
  delayMs = 0,
): Promise<void> {
  await workflowQueue.add(
    JOB_NAMES.EXECUTE_WORKFLOW,
    payload,
    {
      jobId: `${payload.workflowRunId}:step:${payload.stepPosition}`,
      delay: delayMs,
    },
  );
}