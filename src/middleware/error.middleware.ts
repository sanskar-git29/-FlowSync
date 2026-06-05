
import type { Request, Response, NextFunction } from 'express';
import { env }       from '../config/env.js';
import {AuthError }from '../modules/auth/auth.types.js';

export function errorHandler(
  err:  Error,
  _req: Request,
  res:  Response,
  _next: NextFunction,  // ← must declare even if unused (4-param signature)
): void {
  // Map typed service errors to HTTP status codes
  if (err.message === AuthError.EMAIL_TAKEN) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  if (err.message === AuthError.INVALID_CREDENTIALS) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Unknown error — log it, return generic message
  // Never expose stack traces or error details in production
  console.error('[error]', err.message, err.stack);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { detail: err.message }),
  });
}
