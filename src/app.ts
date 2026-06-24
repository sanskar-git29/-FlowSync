import express, {
  type Application, type Request, type Response
} from 'express';
import { env }            from './config/env.js';
import authRoutes         from './modules/auth/auth.routes.js';
import { errorHandler }   from './middleware/error.middleware.js';
import eventsRoutes     from './modules/events/events.routes.js'; 

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

/* ── Events routes ─────────────────────────────────────── */
app.use('/api/v1/events', eventsRoutes);
// GET  /api/v1/events          ← protected (needs Bearer token)
// POST /api/v1/events          ← protected (needs Bearer token)
// GET  /api/v1/events/:id      ← protected (needs Bearer token)
// PUT  /api/v1/events/:id      ← protected (needs Bearer token)
// DELETE /api/v1/events/:id    ← protected (needs Bearer token)

/* ── Other routes ───────────────────────────────────────── */
app.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({ message: 'Welcome to the FlowSync API' });
});

/* ── 404 ─────────────────────────────────────────────────── */
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Route not found' });
});

/* ── Error handler — MUST be last ───────────────────────── */
app.use(errorHandler);

export default app;