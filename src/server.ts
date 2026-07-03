// ─────────────────────────────────────────────────────────────
// WHAT CHANGED FROM PHASE 1
//
// Added connectRedis() on startup and disconnectRedis() on shutdown.
// The API server needs Redis for the cache-aside pattern in getUserEvents.
// ─────────────────────────────────────────────────────────────

import http from 'node:http';
import app  from './app.js';
import { env }                       from './config/env.js';
import { connectDB, disconnectDB }   from './shared/db/pool.js';
import { connectRedis, disconnectRedis } from './shared/redis/client.js';

const server = http.createServer(app);

// Connect to both dependencies before listening for requests.
// If either fails, the process crashes here with a clear error.
// You never want an API server running that can't reach its database.
await connectDB();
await connectRedis();

server.listen(env.PORT, (): void => {
  console.log(`[server] :${env.PORT}  env=${env.NODE_ENV}`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[server] ${signal} — graceful shutdown`);
  server.close(async (): Promise<void> => {
    await disconnectDB();
    await disconnectRedis();
    process.exit(0);
  });
  setTimeout((): void => { process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason): void => {
  console.error('[server] unhandledRejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err: Error): void => {
  console.error('[server] uncaughtException:', err.message);
  process.exit(1);
});