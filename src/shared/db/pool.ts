
import pg from 'pg';
import { env } from '../../config/env.js';

const { Pool } = pg;

// Pool = a cache of reusable DB connections.
// Without a pool, every query opens+closes a TCP connection.
// At 1000 req/s that would be catastrophic.
export const pool = new Pool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  database: env.DB_NAME,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,

  // Connection pool sizing — think about this carefully:
  // min: connections kept alive even when idle
  // max: hard limit — PostgreSQL default max is 100 connections
  // Rule of thumb: max = (num_cpu_cores * 2) + num_disks
  min: 2,
  max: 10,

  // Kill connections idle for 30s — prevents connection leaks
  idleTimeoutMillis: 30_000,

  // Fail fast if a connection can't be acquired in 3s
  connectionTimeoutMillis: 3_000,
});

// Test the connection on startup
export async function connectDB() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1'); // simplest possible health check
    console.log('[db] PostgreSQL connected ✓');
  } finally {
    client.release(); // ALWAYS release back to pool — never forget this
  }
}

// Graceful shutdown — drain pool before process exits
export async function disconnectDB() {
  await pool.end();
  console.log('[db] PostgreSQL pool closed');
}
