// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS
//
// The Queue (API side) and the Worker (processor side) are two
// separate processes. They need to agree on the exact shape of
// a job. If the API enqueues { eventId, userId } but the worker
// reads { id, user_id }, you get a runtime crash with no compile
// error to warn you.
//
// Defining types here means TypeScript enforces the contract at
// compile time. Change the shape? Both sides update or it won't build.
// ─────────────────────────────────────────────────────────────

// The data stored inside each job in Redis.
// Keep this minimal — only what the worker needs to process the event.
// Don't store large objects here. Store IDs and let the worker
// fetch what it needs from the database.
export interface EventJobPayload {
  eventId: string;  // used to update status in DB and as idempotency key
  userId:  string;  // used to invalidate the correct cache keys
  type:    string;  // the event type e.g. 'order.placed'
  payload: Record<string, unknown>;  // the event data from the user
}

// Job name constants — typed as string literals, not plain strings.
// as const makes TypeScript treat 'process.event' as a literal type,
// not just string. This lets BullMQ type-check the queue.add() call.
export const JOB_NAMES = {
  PROCESS_EVENT: 'process.event',
} as const;

// Resolves to: type JobName = 'process.event'
// When you add more job types later, this automatically becomes a union:
// type JobName = 'process.event' | 'send.webhook' | 'send.email'
export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];
