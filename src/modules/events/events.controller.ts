// ─────────────────────────────────────────────────────────────
// WHAT CHANGED FROM PHASE 1
//
// create: returns 202 Accepted instead of 201 Created.
//
// 201 Created means "the resource exists and is ready right now".
// 202 Accepted means "we received it and will process it".
// These are different promises to the client. Since the event
// starts as 'pending' and the worker processes it later, 202 is correct.
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import * as eventsService from './events.service.js';
import type { CreateEventDto } from './events.types.js';

export async function create(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const event = await eventsService.createEvent(
      req.user!.id,           // guaranteed by authenticate middleware
      req.body as CreateEventDto,
    );

    // 202 — not 201. The event exists in the DB but is still pending.
    // statusUrl tells the client where to poll for the final status.
    res.status(202).json({
      message:   'Event accepted for processing',
      event,
      statusUrl: `/api/v1/events/${event.id}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function list(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    // parseInt on query params without a fallback returns NaN.
    // String() converts undefined to 'undefined' — parseInt('undefined') = NaN.
    // The ?? operator provides a default before String() is called.
    const page  = Math.max(1,   parseInt(String(req.query['page']  ?? '1'),  10));
    const limit = Math.min(100, parseInt(String(req.query['limit'] ?? '20'), 10));

    const result = await eventsService.getUserEvents(req.user!.id, page, limit);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOne(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const event = await eventsService.getEventById(
      req.user!.id,
      req.params['id']! as string,
    );
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const deleted = await eventsService.deleteEvent(
      req.user!.id,
      req.params['id']! as string,
    );
    if (!deleted) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}