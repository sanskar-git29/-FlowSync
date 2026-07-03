// ─────────────────────────────────────────────────────────────
// WHAT CHANGED FROM PHASE 1
//
// createEvent:   now enqueues a job after inserting, busts cache
// getUserEvents: now checks Redis before hitting the DB
// deleteEvent:   now busts cache after deleting
// updateEventStatus: fixed — just an UPDATE query, nothing else
// ─────────────────────────────────────────────────────────────

import { pool }            from '../../shared/db/pool.js';
import { enqueueEvent }    from '../../shared/queues/event.queue.js';
import { getCache, setCache, deleteByPattern }
  from '../../shared/redis/cache.js';
import type { Event, CreateEventDto, PaginatedResult }
  from './events.types.js';

export async function createEvent(
  userId: string,
  dto:    CreateEventDto,
): Promise<Event> {
  // 1. Insert the event into PostgreSQL and get the full row back.
  const result = await pool.query(
    `INSERT INTO events (user_id, type, payload)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, dto.type, JSON.stringify(dto.payload ?? {})],
  );

  // 2. Extract the inserted row. We need it before we can enqueue.
  const event = result.rows[0] as Event;

  // 3. Push a job to the BullMQ queue.
  //    This is a fast Redis write (~2ms). The worker will pick it up
  //    and process it independently after we've already responded to the client.
  //    jobId = eventId ensures the same event isn't processed twice.
  await enqueueEvent({
    eventId: event.id,
    userId:  event.userId,
    type:    event.type,
    payload: event.payload,
  });

  // 4. The cached list is now stale (it doesn't include the new event).
  //    Delete it so the next GET /events fetches fresh data from the DB.
  await deleteByPattern(`events:${userId}:*`);

  return event;
}

export async function getUserEvents(
  userId: string,
  page    = 1,
  limit   = 20,
): Promise<PaginatedResult<Event>> {
  // Cache key includes userId, page, and limit.
  // Different pages and different page sizes are cached separately.
  // Example keys:
  //   events:abc-123:1:20  → user abc-123's page 1, 20 per page
  //   events:abc-123:2:20  → user abc-123's page 2, 20 per page
  const cacheKey = `events:${userId}:${page}:${limit}`;

  // Check Redis first. If data is there, return it immediately.
  // No database query. No connection pool usage. Near-instant response.
  const cached = await getCache<PaginatedResult<Event>>(cacheKey);
  if (cached) {
    console.log(`[cache] HIT  ${cacheKey}`);
    return cached;
  }

  // Cache miss — go to the database.
  console.log(`[cache] MISS ${cacheKey}`);
  const offset = (page - 1) * limit;

  // Run both queries in parallel with Promise.all.
  // Sequential would mean: wait for query 1 to finish, THEN start query 2.
  // Parallel means: start both at the same time, wait for the slower one.
  // For two 15ms queries: sequential = 30ms total, parallel = 15ms total.
  const [eventsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    pool.query(
      // ::int casts PostgreSQL's bigint COUNT to a regular integer.
      'SELECT COUNT(*)::int AS total FROM events WHERE user_id = $1',
      [userId],
    ),
  ]);

  const total  = countResult.rows[0].total as number;
  const result: PaginatedResult<Event> = {
    data:       eventsResult.rows as Event[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  // Store in Redis for 5 minutes. Redis will auto-delete it after that.
  // The next request after expiry will be a cache miss and rebuild it.
  await setCache(cacheKey, result, 300);

  return result;
}

export async function getEventById(
  userId:  string,
  eventId: string,
): Promise<Event | null> {
  const result = await pool.query(
    // Always scope by user_id. User A cannot read user B's events
    // even if they know the UUID. This is IDOR prevention.
    'SELECT * FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );
  return (result.rows[0] as Event | undefined) ?? null;
}

export async function deleteEvent(
  userId:  string,
  eventId: string,
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );
  const deleted = (result.rowCount ?? 0) > 0;

  // Only bust cache if a row was actually deleted.
  // If nothing was deleted (wrong userId or wrong eventId),
  // the cache is still accurate — no need to clear it.
  if (deleted) {
    await deleteByPattern(`events:${userId}:*`);
  }

  return deleted;
}

// Called by the worker processor to update event status.
// This has nothing to do with caching — it's a plain DB write.
// The processor handles cache invalidation separately after calling this.
export async function updateEventStatus(
  eventId: string,
  status:  Event['status'],
): Promise<void> {
  await pool.query(
    'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, eventId],
  );
}