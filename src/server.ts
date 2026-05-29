import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';

const server = http.createServer(app);

import { connectDB, disconnectDB } from './shared/db/pool.js';

// Connect to DB before accepting traffic
await connectDB();

server.listen(env.PORT, () => {
  console.log(`[server] running on port ${env.PORT} · env: ${env.NODE_ENV}`);
});

/* ── Graceful shutdown ──────────────────────────────────── */
// When Docker/K8s sends SIGTERM (deploy, restart, scale-down),
// we stop accepting new connections and wait for active ones.
const shutdown = (signal: string): void => {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close((): void => {
    console.log('[server] all connections closed — exiting');
    process.exit(0);
  });

  // Force exit if connections don't close in 10s
  setTimeout((): void => {
    console.error('[server] shutdown timeout — forcing exit');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', (): void => shutdown('SIGTERM'));
process.on('SIGINT',  (): void => shutdown('SIGINT'));   // Ctrl+C

/* ── Unhandled errors ────────────────────────────────────── */
// These should never happen in production — if they do, it's a bug.
// Log it, then crash — a crashed server is better than a corrupt one.
process.on('unhandledRejection', (reason: unknown): void => {
  console.error('[server] unhandledRejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err: Error): void => {
  console.error('[server] uncaughtException:', err);
  process.exit(1);
});