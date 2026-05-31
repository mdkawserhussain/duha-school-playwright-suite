import { Router } from 'express';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { sseManager } from '../sse/logStream';

export const controlRouter = Router();

let runningProcess: ChildProcess | null = null;

// Trigger extraction
controlRouter.post('/run', (req, res) => {
  if (runningProcess) {
    return res.status(409).json({ error: 'Extraction already running' });
  }

  const args = req.body.args || [];
  const runId = Date.now();

  const child = spawn('npx', ['tsx', 'src/cli.ts', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '../../..'),
    env: { ...process.env },
  });

  runningProcess = child;

  child.stdout?.on('data', (data) => {
    const msg = data.toString();
    sseManager.broadcast(runId, msg);
  });

  child.stderr?.on('data', (data) => {
    const msg = data.toString();
    sseManager.broadcast(runId, msg);
  });

  child.on('close', (code) => {
    sseManager.broadcast(runId, `\n[Process exited with code ${code}]\n`);
    sseManager.close(runId);
    runningProcess = null;
  });

  child.on('error', (err) => {
    sseManager.broadcast(runId, `\n[Process error: ${err.message}]\n`);
    sseManager.close(runId);
    runningProcess = null;
  });

  res.json({ runId, pid: child.pid });
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
