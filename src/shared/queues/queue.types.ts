export interface EventJobPayload {
  eventId: string;
  userId:  string;
  type:    string;
  payload: Record<string, unknown>;
}

export const JOB_NAMES = {
  PROCESS_EVENT: 'process.event',
} as const;

// JobName resolves to the union of all values: 'process.event'
// If you add more job types later: 'process.event' | 'send.notification' | etc
export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];