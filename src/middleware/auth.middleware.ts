
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { pool }             from '../shared/db/pool.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  // Must be: "Bearer eyJhbGciOi..."
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization header missing or malformed',
      hint:  'Expected: Authorization: Bearer <token>',
    });
    return;
  }

  // "Bearer " = 7 characters — slice removes the prefix
  const token = header.slice(7);

  try {
    // Step 1: verify signature + expiry against JWT_SECRET
    // This is pure computation — no DB hit yet
    const payload = verifyAccessToken(token);

    // Step 2: load fresh user from PostgreSQL
    // Why not trust the JWT alone? The user may have been deleted,
    // or their role changed since the token was issued.
    // This DB call ensures our user data is always current.
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [payload.userId]
    );

    const user = result.rows[0] as
      | { id: string; email: string; role: string }
      | undefined;

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    // Step 3: attach user to req — available in all route handlers
    req.user = user;
    next(); // ← this is what lets the route handler run

  } catch (err) {
    const error = err as Error;

    // jsonwebtoken throws named errors — handle each specifically
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Access token has expired',
        code:  'TOKEN_EXPIRED',
        hint:  'Use POST /api/v1/auth/refresh to get a new token',
      });
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Access token is invalid',
        code:  'TOKEN_INVALID',
      });
      return;
    }

    next(err); // unexpected error → global error handler
  }
}
