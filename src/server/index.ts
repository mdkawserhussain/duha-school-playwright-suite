/**
 * Express API Server — serves the web UI and REST API.
 *
 * Binds to localhost only. Runs alongside the CLI tool.
 * Usage: npx tsx src/server/index.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';

// Express 5 Router breaks with ESM `import` in tsx CJS mode.
// Using require() for route imports to avoid this.
const { dashboardRouter } = require('./routes/dashboard');
const { runsRouter } = require('./routes/runs');
const { duesRouter } = require('./routes/dues');
const { controlRouter } = require('./routes/control');
const { configRouter } = require('./routes/config');

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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Web UI running at http://localhost:${PORT}`);
});
