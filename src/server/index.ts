/**
 * Express API Server — serves the web UI and REST API.
 *
 * Binds to localhost only. Runs alongside the CLI tool.
 * Usage: npx tsx src/server/index.ts
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { dashboardRouter } from './routes/dashboard';
import { runsRouter } from './routes/runs';
import { duesRouter } from './routes/dues';
import { controlRouter } from './routes/control';
import { configRouter } from './routes/config';
import { whatsappRouter } from './routes/whatsapp';
import { exportRouter } from './routes/export';
import { logsRouter } from './routes/logs';
import { payrollRouter } from './routes/payroll';
import { leaveRouter } from './routes/leave';
import { initLeaveHistoryTable } from '../utils/leaveHistoryDb';

const app = express();
const PORT = parseInt(process.env.WEB_PORT || process.env.PORT || '3001', 10);
const outputDir = path.resolve(process.cwd(), 'output');

app.use(cors({ origin: /localhost/ }));
app.use(express.json());

// Health check
app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// List output files
app.get('/api/output/files', (_req, res) => {
  try {
    const files = fs.readdirSync(outputDir).filter(f => !f.startsWith('.'));
    res.json(files);
  } catch {
    res.json([]);
  }
});

// API routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/runs', runsRouter);
app.use('/api/dues', duesRouter);
app.use('/api', controlRouter);
app.use('/api/config', configRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/export', exportRouter);
app.use('/api/logs', logsRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/leave', leaveRouter);

// Initialize leave history table on startup
initLeaveHistoryTable();

// Serve output files (JSON, XLSX) for download
app.use('/output', express.static(outputDir));

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

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] ERROR: Port ${PORT} is already in use. Another process (e.g. hermes-agent) is occupying it. Set WEB_PORT env var to use a different port.`);
  } else {
    console.error(`[server] ERROR: ${err.message}`);
  }
  process.exit(1);
});
