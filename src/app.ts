import express, { type Application, type Request } from 'express';
import { env } from './config/env.js';

const app: Application = express();

/* ── Middleware ─────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));     // parse JSON bodies, limit size
app.use(express.urlencoded({ extended: true })); // parse form bodies

/* ── Health endpoint ────────────────────────────────────── */
// This is the first thing your load balancer checks.
// It must respond 200 even before your DB is connected.
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok i am workking fine',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});



/* ── Routes ─────────────────────────────────────────────── */
// You'll add these in Phase 1:
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/events', eventsRouter);

/* ── 404 handler ────────────────────────────────────────── */
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Route not  found' });
});

/* ── Global error handler ───────────────────────────────── */
// Must be LAST middleware and have exactly 4 params.
// Express uses the 4-param signature to identify error handlers.
app.use((
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    // never expose err.message in production
    ...(env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

export default app;