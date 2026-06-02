import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const logsRouter = Router();

const LOGS_DIR = path.join(process.cwd(), 'user-data', 'logs');
const ERRORS_DIR = path.join(process.cwd(), 'errors');
const OUTPUT_DIR = path.join(process.cwd(), 'output');
const ERROR_LOG = path.join(LOGS_DIR, 'error.log');

// Get system info for debugging
function getSystemInfo() {
  return {
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    cpus: os.cpus().length,
    hostname: os.hostname(),
    uptime: Math.round(os.uptime()),
  };
}

// Get file paths for manual inspection
function getFilePaths() {
  return {
    logsDir: LOGS_DIR,
    errorsDir: ERRORS_DIR,
    outputDir: OUTPUT_DIR,
    envFile: path.join(process.cwd(), '.env'),
    historyDb: path.join(process.cwd(), 'user-data', 'history.db'),
  };
}

// Get list of error screenshots
function getErrorScreenshots() {
  try {
    if (!fs.existsSync(ERRORS_DIR)) return [];
    
    return fs.readdirSync(ERRORS_DIR)
      .filter(f => f.startsWith('error_') && f.endsWith('.png'))
      .map(f => ({
        filename: f,
        timestamp: f.replace('error_', '').replace('.png', '').replace(/-/g, (m, offset) => {
          // Convert back to ISO format: error_2026-06-02T19-30-42.png → 2026-06-02T19:30:42
          return offset === 15 ? ':' : offset === 18 ? ':' : m;
        }),
        path: path.join(ERRORS_DIR, f),
        sizeKB: Math.round(fs.statSync(path.join(ERRORS_DIR, f)).size / 1024),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

// Get list of extraction logs
function getExtractionLogs() {
  try {
    if (!fs.existsSync(LOGS_DIR)) return [];
    
    return fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith('extraction_') && f.endsWith('.log'))
      .map(f => ({
        filename: f,
        path: path.join(LOGS_DIR, f),
        sizeKB: Math.round(fs.statSync(path.join(LOGS_DIR, f)).size / 1024),
        lines: countLines(path.join(LOGS_DIR, f)),
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename));
  } catch {
    return [];
  }
}

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

// Read log file content (last N lines)
function readLogFile(filePath: string, tailLines: number = 500): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(-tailLines).join('\n');
  } catch {
    return 'Error reading log file';
  }
}

// GET /api/logs — Return all log-related info
logsRouter.get('/', (_req, res) => {
  res.json({
    system: getSystemInfo(),
    paths: getFilePaths(),
    errors: getErrorScreenshots(),
    logs: getExtractionLogs(),
    errorLog: getErrorLog(),
  });
});

// GET /api/logs/error-log — Return error.log content
function getErrorLog() {
  try {
    if (!fs.existsSync(ERROR_LOG)) return { content: '', lines: 0, sizeKB: 0 };
    const content = fs.readFileSync(ERROR_LOG, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).length;
    const sizeKB = Math.round(fs.statSync(ERROR_LOG).size / 1024);
    // Return last 200 lines
    const tail = content.split('\n').slice(-200).join('\n');
    return { content: tail, lines, sizeKB };
  } catch {
    return { content: '', lines: 0, sizeKB: 0 };
  }
}

logsRouter.get('/error-log', (_req, res) => {
  res.json(getErrorLog());
});

// GET /api/logs/content/:filename — Read specific log file
logsRouter.get('/content/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Security: prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = path.join(LOGS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  
  const tailLines = parseInt(req.query.tail as string) || 500;
  const content = readLogFile(filePath, tailLines);
  
  res.json({
    filename,
    content,
    lines: countLines(filePath),
    tailLines,
  });
});

// GET /api/logs/errors/:filename — Serve error screenshot
logsRouter.get('/errors/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Security: prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = path.join(ERRORS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Error screenshot not found' });
  }
  
  res.sendFile(filePath);
});

// DELETE /api/logs/:filename — Delete specific log file
logsRouter.delete('/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Security: prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = path.join(LOGS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete log file' });
  }
});
