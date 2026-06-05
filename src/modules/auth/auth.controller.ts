
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { pool } from '../../shared/db/pool.js';

export async function register(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const tokens = await authService.register(email, password);
    res.status(201).json({ message: 'Account created', ...tokens });
  } catch (err) {
    next(err); // passes to errorHandler middleware
  }
}

export async function login(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const tokens = await authService.login(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    // Verify the refresh token is valid and not expired
    const payload = authService.verifyRefreshToken(refreshToken);

    // Double-check the user still exists (could have been deleted)
    const { rowCount } = await pool.query(
      'SELECT id FROM users WHERE id = $1', [payload.userId]
    );
    if ((rowCount ?? 0) === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Issue a brand new pair of tokens
    const tokens = authService.generateTokens(payload.userId);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request, res: Response
): Promise<void> {
  // req.user is set by authenticate middleware
  // If we're here, the user is authenticated — no try/catch needed
  res.status(200).json({ user: req.user });
}
