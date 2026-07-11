import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total', help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'], registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds', help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5], registers: [register],
});

export const workerJobsTotal = new Counter({
  name: 'worker_jobs_processed_total', help: 'Total jobs processed',
  labelNames: ['status', 'event_type'], registers: [register],
});

export const workerDlqSize = new Gauge({
  name: 'worker_dlq_jobs', help: 'Jobs in the dead-letter queue', registers: [register],
});

export const wsActiveConnections = new Gauge({
  name: 'ws_active_connections', help: 'Active WebSocket connections', registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route:  req.route?.path ?? req.path,
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, (Date.now() - start) / 1000);
  });
  next();
}