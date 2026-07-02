
import { pool }           from '../../shared/db/pool.js';
import { enqueueEvent }   from '../../shared/queues/event.queue.js';
import { getCache, setCache, deleteByPattern }
                           from '../../shared/redis/cache.js';
import type { Event, CreateEventDto, PaginatedResult }
                           from './events.types.js';

// ─────────────────────────────────────────────────────────────
// createEvent
// ─────────────────────────────────────────────────────────────
export async function createEvent(
  userId: string,
  dto:    CreateEventDto,
): Promise<Event> {
  // 1. Insert into PostgreSQL
  const result = await pool.query(
    `INSERT INTO events (user_id, type, payload)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, dto.type, JSON.stringify(dto.payload ?? {})],
  );

 
  const event = result.rows[0] as Event;


  await enqueueEvent({
    eventId: event.id,
    userId,
    type:    event.type,
    payload: event.payload,
  });

  // 3. Bust cached event lists — they're now stale
  await deleteByPattern(`events:${userId}:*`);

  return event;
}

// ─────────────────────────────────────────────────────────────
// getUserEvents  (paginated, cache-aside)
// ─────────────────────────────────────────────────────────────
export async function getUserEvents(
  userId: string,
  page    = 1,
  limit   = 20,
): Promise<PaginatedResult<Event>> {

  // FIX 2: actually use the cache — check Redis first
  const key    = `events:${userId}:${page}:${limit}`;
  const cached = await getCache<PaginatedResult<Event>>(key);
  if (cached) {
    console.log(`[cache] HIT  ${key}`);
    return cached;
  }
  console.log(`[cache] MISS ${key}`);

  // Cache miss — hit PostgreSQL
  const offset = (page - 1) * limit;

  const [eventsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    pool.query(
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

  // Store in Redis for 5 minutes — auto-expires
  await setCache(key, result, 300);
  return result;
}

// ─────────────────────────────────────────────────────────────
// getEventById
// ─────────────────────────────────────────────────────────────
export async function getEventById(
  userId:  string,
  eventId: string,
): Promise<Event | null> {
  const result = await pool.query(
    'SELECT * FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );
  return (result.rows[0] as Event | undefined) ?? null;
}

// ─────────────────────────────────────────────────────────────
// deleteEvent
// ─────────────────────────────────────────────────────────────
export async function deleteEvent(
  userId:  string,
  eventId: string,
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );
  const deleted = (result.rowCount ?? 0) > 0;

  // FIX 4: bust cache after delete — otherwise stale data returned
  if (deleted) {
    await deleteByPattern(`events:${userId}:*`);
  }

  return deleted;
}

// ─────────────────────────────────────────────────────────────
// updateEventStatus  (called by worker — NOT by the API)
// ─────────────────────────────────────────────────────────────
export async function updateEventStatus(
  eventId: string,
  status:  Event['status'],
): Promise<void> {
  // FIX 3: correct body — just update DB, nothing else
  await pool.query(
    'UPDATE events SET status = $1 WHERE id = $2',
    [status, eventId],
  );
  // worker calls this as: pending → processing → completed / failed
}