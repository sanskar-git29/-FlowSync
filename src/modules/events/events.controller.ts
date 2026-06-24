import type { Request, Response, NextFunction } from 'express';
import * as eventsService from './events.service.js';
import type { CreateEventDto } from './events.types.js';

export async function create(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const event = await eventsService.createEvent(
      req.user!.id,         // guaranteed by authenticate middleware
      req.body as CreateEventDto
    );
    res.status(201).json({ event });
  } catch (err) { next(err); }
}

export async function list(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    // Parse + clamp pagination params from query string
    const page  = Math.max(1,   parseInt(String(req.query.page  ?? '1'),  10));
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '20'), 10));

    const result = await eventsService.getUserEvents(req.user!.id, page, limit);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function getOne(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const event = await eventsService.getEventById(
      req.user!.id,
      req.params.id!
    );
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(200).json({ event });
  } catch (err) { next(err); }
}

export async function remove(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const deleted = await eventsService.deleteEvent(
      req.user!.id,
      req.params.id!
    );
    if (!deleted) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(204).send(); // 204 = success with no body
  } catch (err) { next(err); }
}