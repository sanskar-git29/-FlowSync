
import rateLimit, { type Options } from 'express-rate-limit';
import { env }    from '../config/env.js';
import { logger } from '../shared/logger.js';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  handler: (req, res) => {
    logger.warn('[rate] exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
  },
};

export const globalLimiter = rateLimit({ ...shared, windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX });
export const authLimiter   = rateLimit({ ...shared, windowMs: 15 * 60 * 1000, max: 10 });
export const eventLimiter  = rateLimit({ ...shared, windowMs: env.RATE_LIMIT_WINDOW_MS, max: 200 });