
import express, {
  type Application, type Request, type Response
} from 'express';
import { env }            from './config/env.js';
import authRoutes         from './modules/auth/auth.routes.js';
import { errorHandler }   from './middleware/error.middleware.js';

const app: Application = express();

/* ── Body parsing ───────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Health check ───────────────────────────────────────── */
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', env: env.NODE_ENV });
});

/* ── Auth routes ────────────────────────────────────────── */
app.use('/api/v1/auth', authRoutes);
// GET  /api/v1/auth/me       ← protected (needs Bearer token)
// POST /api/v1/auth/register ← public
// POST /api/v1/auth/login    ← public
// POST /api/v1/auth/refresh  ← public

/* ── 404 ─────────────────────────────────────────────────── */
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Route not found' });
});

/* ── Error handler — MUST be last ───────────────────────── */
app.use(errorHandler);

export default app;
