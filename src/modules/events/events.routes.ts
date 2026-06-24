// src/modules/events/events.routes.ts
import { Router } from 'express';
import { z }      from 'zod';
import * as ctrl  from './events.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate }     from '../../middleware/validate.middleware.js';

const router = Router();

// ── This one line protects every route below it ─────────────
// Without a valid JWT, no request reaches the controllers
router.use(authenticate);

const createEventSchema = z.object({
  type: z.string()
    .min(1, 'Event type required')
    .max(100, 'Event type too long')
    // Enforce a consistent naming convention: order.placed, user.signup
    .regex(
      /^[a-z][a-z0-9_.]*$/,
      'Type must be lowercase dot-notation: e.g. order.placed'
    ),
  payload: z.record(z.unknown())
    .optional()
    .default({}),           // default to empty object if not provided
});

// POST /api/v1/events
router.post('/',     validate(createEventSchema), ctrl.create);

// GET  /api/v1/events?page=1&limit=20
router.get('/',      ctrl.list);

// GET  /api/v1/events/:id
router.get('/:id',   ctrl.getOne);

// DELETE /api/v1/events/:id
router.delete('/:id', ctrl.remove);

export default router;