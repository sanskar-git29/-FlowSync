import http                             from 'node:http';
import app                             from './app.js';
import { env }                         from './config/env.js';
import { logger }                      from './shared/logger.js';
import { register }                    from './shared/metrics.js';
import { connectDB, disconnectDB }     from './shared/db/pool.js';
import { connectRedis, disconnectRedis } from './shared/redis/client.js';

const server = http.createServer(app);

// Prometheus metrics server — separate port, never exposed to internet
const metricsServer = http.createServer(async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

await connectDB();
await connectRedis();

server.listen(env.PORT, () =>
  logger.info(`[server] :${env.PORT}`, { env: env.NODE_ENV })
);
metricsServer.listen(env.METRICS_PORT, () =>
  logger.info(`[server] metrics :${env.METRICS_PORT}`)
);

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`[server] ${signal} — shutdown`);
  server.close(async () => {
    metricsServer.close();
    await disconnectDB();
    await disconnectRedis();
    process.exit(0);
  });
  setTimeout(() => { process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('unhandledRejection', (r) => { logger.error('unhandledRejection', { r }); process.exit(1); });