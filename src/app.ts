import express, { type Application, type Request, type Response } from 'express';
import { randomUUID }                    from 'node:crypto';
import { env }                           from './config/env.js';
import { logger }                        from './shared/logger.js';
import { register, metricsMiddleware }   from './shared/metrics.js';
import { globalLimiter, authLimiter, eventLimiter } from './middleware/rate.middleware.js';
import { errorHandler }                  from './middleware/error.middleware.js';
import authRoutes                        from './modules/auth/auth.routes.js';
import eventsRoutes                      from './modules/events/events.routes.js';
import workflowRoutes                    from './modules/workflows/workflows.routes.js';

const app: Application = express();

app.use(metricsMiddleware);
app.use((req: Request, res: Response, next): void => {
  const id = (req.headers['x-request-id'] as string) ?? randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  next();
});
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Prometheus scrape endpoint — outside rate limiter
app.get('/metrics', async (_req, res): Promise<void> => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (_req, res): void => {
  res.status(200).json({ status: 'ok', env: env.NODE_ENV });
});

// Routes
app.use('/api/v1/auth',      authLimiter,  authRoutes);
app.use('/api/v1/events',    eventLimiter, eventsRoutes);
app.use('/api/v1/workflows', workflowRoutes);

app.use((_req, res): void => { res.status(404).json({ error: 'Not found' }); });
app.use(errorHandler);

logger.info('[app] ready');
export default app;
