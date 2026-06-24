import { pool } from '../../shared/db/pool.js';
import type { Event, CreateEventDto, PaginatedResult } from './events.types.js';

export async function createEvent(
  userId: string,
  dto: CreateEventDto,
): Promise<Event> {
  const result = await pool.query(
    `INSERT INTO events (user_id, type, payload)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, dto.type, JSON.stringify(dto.payload ?? {})]
  );
  return result.rows[0] as Event;
}

export async function getUserEvents(
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResult<Event>> {
  const offset = (page - 1) * limit;

  // Run BOTH queries at the same time — not one after the other
  // Promise.all = parallel. Await one-by-one = sequential = slower
  const [eventsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query(
      // ::int casts the count to integer — PostgreSQL returns bigint by default
      'SELECT COUNT(*)::int AS total FROM events WHERE user_id = $1',
      [userId]
    ),
  ]);

  const total = countResult.rows[0].total as number;

  return {
    data:       eventsResult.rows as Event[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEventById(
  userId: string,
  eventId: string,
): Promise<Event | null> {
  const result = await pool.query(
    // Always scope by user_id — user A cannot read user B's events
    'SELECT * FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return (result.rows[0] as Event | undefined) ?? null;
}

export async function deleteEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId]
  );
  // rowCount = 1 means deleted, 0 means not found or wrong user
  return (result.rowCount ?? 0) > 0;
}

// Used by the worker in Phase 2 to update event status
export async function updateEventStatus(
  eventId: string,
  status: Event['status'],
): Promise<void> {
  await pool.query(
    'UPDATE events SET status = $1 WHERE id = $2',
    [status, eventId]
  );
}