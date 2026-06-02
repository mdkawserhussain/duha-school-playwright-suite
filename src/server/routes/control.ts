import { Router } from 'express';
import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sseManager } from '../sse/logStream';

export const controlRouter = Router();

let runningProcess: ChildProcess | null = null;

const ENV_PATH = path.join(process.cwd(), '.env');
const LOGS_DIR = path.join(process.cwd(), 'user-data', 'logs');
const ERRORS_DIR = path.join(process.cwd(), 'errors');
const OUTPUT_DIR = path.join(process.cwd(), 'output');

function saveFiltersToEnv(filters: {
  dueOnly?: boolean;
  minDue?: number;
  classFilter?: string;
  periodMonths?: string[];
}): void {
  let content = '';
  try {
    if (fs.existsSync(ENV_PATH)) content = fs.readFileSync(ENV_PATH, 'utf-8');
  } catch {}

  // PORTAL_COLUMNS is the master list — never overwrite here.
  // columnFilter is UI-only — not saved to .env.
  const updates: Record<string, string> = {};
  if (filters.dueOnly !== undefined) updates.PORTAL_DUE_ONLY = String(filters.dueOnly);
  if (filters.minDue !== undefined) updates.PORTAL_MIN_DUE = String(filters.minDue);
  if (filters.classFilter !== undefined) updates.PORTAL_CLASS_FILTER = filters.classFilter;
  if (filters.periodMonths !== undefined) updates.PORTAL_PERIOD_MONTHS = filters.periodMonths.join(',');

  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}="${val}"`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }

  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
}

// Trigger extraction
controlRouter.post('/run', (req, res) => {
  if (runningProcess) {
    return res.status(409).json({ error: 'Extraction already running' });
  }

  const { args = [], filters } = req.body;

  // Save filter config to .env before running
  if (filters) saveFiltersToEnv(filters);

  const runId = Date.now();
  const timestamp = new Date(runId).toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOGS_DIR, `extraction_${timestamp}.log`);

  // Ensure logs directory exists
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  // Filter out PORTAL_* vars so child's dotenv loads fresh values from updated .env
  // (dotenv doesn't override existing process.env values)
  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('PORTAL_') && !k.startsWith('MIN_DUE_'))
  );

  const child = spawn('npx', ['tsx', 'src/cli.ts', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '../../..'),
    env: childEnv,
  });

  runningProcess = child;

  // Persist logs to file
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  child.stdout?.on('data', (data) => {
    const msg = data.toString();
    sseManager.broadcast(runId, msg);
    logStream.write(`[${new Date().toISOString()}] ${msg}`);
  });

  child.stderr?.on('data', (data) => {
    const msg = data.toString();
    sseManager.broadcast(runId, msg);
    logStream.write(`[${new Date().toISOString()}] [STDERR] ${msg}`);
  });

  child.on('close', (code) => {
    const exitMsg = `\n[Process exited with code ${code}]\n`;
    sseManager.broadcast(runId, exitMsg);
    logStream.write(`[${new Date().toISOString()}] ${exitMsg}`);
    logStream.end();
    sseManager.close(runId);
    runningProcess = null;
  });

  child.on('error', (err) => {
    const errMsg = `\n[Process error: ${err.message}]\n`;
    sseManager.broadcast(runId, errMsg);
    logStream.write(`[${new Date().toISOString()}] ${errMsg}`);
    logStream.end();
    sseManager.close(runId);
    runningProcess = null;
  });

  res.json({ runId, pid: child.pid, logFile });
});

// SSE log stream for a run
controlRouter.get('/run/:runId/logs', (req, res) => {
  const runId = parseInt(req.params.runId, 10);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const unsubscribe = sseManager.subscribe(runId, (msg) => {
    res.write(`data: ${JSON.stringify({ message: msg })}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Get running status
controlRouter.get('/status', (_req, res) => {
  res.json({ running: !!runningProcess, pid: runningProcess?.pid || null });
});
