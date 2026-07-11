export interface EventJobPayload {
  eventId: string;
  userId:  string;
  type:    string;
  payload: Record<string, unknown>;
}

// WorkflowJobPayload — used by the workflow queue
export interface WorkflowJobPayload {
  workflowRunId: string;
  workflowId:    string;
  eventId:       string;
  userId:        string;
  stepPosition:  number;
  context:       Record<string, unknown>;
}

export const JOB_NAMES = {
  PROCESS_EVENT:    'process.event',
  EXECUTE_WORKFLOW: 'execute.workflow',
} as const;

export type EventJobName    = typeof JOB_NAMES.PROCESS_EVENT;
export type WorkflowJobName = typeof JOB_NAMES.EXECUTE_WORKFLOW;