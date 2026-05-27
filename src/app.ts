import express from 'express';
import { env } from './config/env.js';


const app = express();

/* ── Middleware ─────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));


/* ── Health endpoint ────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok i am working fine',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/* ── 404 handler ────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});




export default app;