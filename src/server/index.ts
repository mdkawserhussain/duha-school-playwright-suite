/**
 * Express API Server — serves the web UI and REST API.
 *
 * Binds to localhost only. Runs alongside the CLI tool.
 * Usage: npx tsx src/server/index.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { dashboardRouter } from './routes/dashboard';
import { runsRouter } from './routes/runs';
import { duesRouter } from './routes/dues';
import { controlRouter } from './routes/control';
import { configRouter } from './routes/config';

const app = express();
const PORT = parseInt(process.env.WEB_PORT || '3000', 10);

app.use(cors({ origin: /localhost/ }));
app.use(express.json());

// Health check
app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/runs', runsRouter);
app.use('/api/dues', duesRouter);
app.use('/api', controlRouter);
app.use('/api/config', configRouter);

// Serve static frontend in production
const webDist = path.resolve(process.cwd(), 'web/dist');
app.use(express.static(webDist));
// SPA fallback — only for non-API GET requests
app.use((_req, res, next) => {
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webDist, 'index.html'));
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Web UI running at http://localhost:${PORT}`);
});
