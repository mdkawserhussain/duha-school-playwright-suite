/**
 * Payroll Proxy Routes
 *
 * Thin proxy layer to js-agv8's server.js (port 3000).
 * Adds value: enriched preview computation, name matching, SSE bridging.
 *
 * @module routes/payroll
 */

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { computePayrollPreview } from '../../utils/payrollCompute';

export const payrollRouter = Router();

const JS_AGV8_BASE = 'http://localhost:3000';
const JS_AGV8_DIR = path.join(process.cwd(), 'js-agv8');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function jsAgv8Fetch(endpoint: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${JS_AGV8_BASE}${endpoint}`, options);
  if (!res.ok) throw new Error(`js-agv8 ${endpoint}: ${res.status} ${res.statusText}`);
  return res;
}

function readFileJson(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// ─── GET /api/payroll/status ────────────────────────────────────────────────

payrollRouter.get('/status', async (_req, res) => {
  try {
    // Check js-agv8 connectivity
    let jsAgv8Connected = false;
    try {
      await fetch(`${JS_AGV8_BASE}/api/config`);
      jsAgv8Connected = true;
    } catch {
      jsAgv8Connected = false;
    }

    // Read local state
    const config = readFileJson(path.join(JS_AGV8_DIR, 'config.json'));
    const parsedJson = readFileJson(path.join(JS_AGV8_DIR, 'temp', 'parsed.json'));

    // Check audit status
    let lastAuditStatus = 'unknown';
    let lastAuditDate = null;
    const auditDir = path.join(JS_AGV8_DIR, 'output');
    if (fs.existsSync(auditDir)) {
      const files = fs.readdirSync(auditDir).filter(f => f.startsWith('audit-report'));
      if (files.length > 0) {
        const latest = files.sort().pop()!;
        const content = fs.readFileSync(path.join(auditDir, latest), 'utf-8');
        lastAuditStatus = content.includes('PASS') ? 'passed' : 'failed';
        const stat = fs.statSync(path.join(auditDir, latest));
        lastAuditDate = stat.mtime.toISOString();
      }
    }

    res.json({
      jsAgv8Connected,
      jsAgv8Url: JS_AGV8_BASE,
      hasConfig: !!config,
      hasParsedJson: !!parsedJson,
      staffCount: config?.staff?.length || 0,
      month: config?.month || 0,
      year: config?.year || 0,
      locked: config?.locked || false,
      lastAuditStatus,
      lastAuditDate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/payroll/run ──────────────────────────────────────────────────

payrollRouter.post('/run', async (req, res) => {
  try {
    const phases = req.body.phases || [1, 3, 5, 8];
    const flags = req.body.flags || {};
    const results: Array<{ phase: number; status: string; error?: string }> = [];

    for (const phase of phases) {
      try {
        let endpoint = '';
        if (phase === 1) endpoint = '/api/run/parse';
        else if (phase === 3) endpoint = '/api/run/all';
        else if (phase === 5) endpoint = `/api/run/verify${flags.final ? '?final=true' : ''}`;
        else if (phase === 8) endpoint = '/api/run/whatsapp';
        else {
          results.push({ phase, status: 'skipped', error: `Unknown phase ${phase}` });
          continue;
        }

        const body: Record<string, any> = {};
        if (flags.dryRun) body.dryRun = true;

        await fetch(`${JS_AGV8_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        results.push({ phase, status: 'completed' });
      } catch (err: any) {
        results.push({ phase, status: 'failed', error: err.message });
      }
    }

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/payroll/preview ───────────────────────────────────────────────

payrollRouter.get('/preview', async (_req, res) => {
  try {
    const preview = computePayrollPreview(JS_AGV8_DIR);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/payroll/verify ────────────────────────────────────────────────

payrollRouter.get('/verify', async (_req, res) => {
  try {
    let connected = false;
    let reportText = '';
    let snapshot = null;
    let overallStatus = 'unknown';
    const mathErrors: Array<{ name: string; calcNet: number; reportNet: number; status: string }> = [];

    // Check connectivity
    try {
      const auditRes = await fetch(`${JS_AGV8_BASE}/api/audit`);
      if (auditRes.ok) {
        connected = true;
        reportText = await auditRes.text();
        overallStatus = reportText.includes('PASS') ? 'passed' : 'failed';
      }
    } catch {
      connected = false;
    }

    // Read snapshot from filesystem
    const outputDir = path.join(JS_AGV8_DIR, 'output');
    if (fs.existsSync(outputDir)) {
      const snapshots = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('audit-snapshot') && f.endsWith('.json'))
        .sort();
      if (snapshots.length > 0) {
        snapshot = readFileJson(path.join(outputDir, snapshots.pop()!));
      }
    }

    // Parse math errors from report
    if (snapshot?.mathErrors) {
      for (const err of snapshot.mathErrors) {
        mathErrors.push(err);
      }
    }

    res.json({
      connected,
      reportText,
      snapshot,
      overallStatus,
      mathErrors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/payroll/config ────────────────────────────────────────────────

payrollRouter.get('/config', async (_req, res) => {
  try {
    const response = await fetch(`${JS_AGV8_BASE}/api/config`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    // Fallback to filesystem
    const config = readFileJson(path.join(JS_AGV8_DIR, 'config.json'));
    if (config) {
      res.json(config);
    } else {
      res.status(500).json({ error: `js-agv8 not reachable and no local config: ${err.message}` });
    }
  }
});

// ─── PUT /api/payroll/config ────────────────────────────────────────────────

payrollRouter.put('/config', async (req, res) => {
  try {
    const response = await fetch(`${JS_AGV8_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `js-agv8 not reachable: ${err.message}` });
  }
});

// ─── GET /api/payroll/files ─────────────────────────────────────────────────

payrollRouter.get('/files', async (_req, res) => {
  try {
    const response = await fetch(`${JS_AGV8_BASE}/api/outputs`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    // Fallback to filesystem
    const outputDir = path.join(JS_AGV8_DIR, 'output');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir)
        .filter(f => !f.startsWith('.'))
        .map(f => {
          const stat = fs.statSync(path.join(outputDir, f));
          return { name: f, size: stat.size, date: stat.mtime.toISOString() };
        });
      res.json(files);
    } else {
      res.json([]);
    }
  }
});

// ─── GET /api/payroll/files/:filename ───────────────────────────────────────

payrollRouter.get('/files/:filename', async (req, res) => {
  try {
    const response = await fetch(`${JS_AGV8_BASE}/api/download/${req.params.filename}`);
    if (!response.ok) {
      res.status(response.status).json({ error: 'File not found' });
      return;
    }
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    // Fallback to filesystem
    const filePath = path.join(JS_AGV8_DIR, 'output', req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ─── GET /api/payroll/logs (SSE bridge) ────────────────────────────────────

payrollRouter.get('/logs', async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch(`${JS_AGV8_BASE}/api/logs`);
    if (!response.body) {
      res.write('data: {"error": "No stream from js-agv8"}\n\n');
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
  } catch (err: any) {
    res.write(`data: {"error": "${err.message}"}\n\n`);
  } finally {
    res.end();
  }
});

// ─── GET /api/payroll/names ─────────────────────────────────────────────────

payrollRouter.get('/names', async (_req, res) => {
  try {
    // Read portal attendance
    const outputDir = path.resolve(process.cwd(), 'output');
    const attFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('attendance') && f.endsWith('.json'))
      .sort();

    if (attFiles.length === 0) {
      res.json({ matched: [], unmatchedPortal: [], unmatchedConfig: [], error: 'No attendance data' });
      return;
    }

    const attData = JSON.parse(fs.readFileSync(path.join(outputDir, attFiles.pop()!), 'utf-8'));
    const portalNames: string[] = [...new Set(attData.map((r: any) => r['Name'] || ''))].filter(Boolean) as string[];

    // Read config staff
    const config = readFileJson(path.join(JS_AGV8_DIR, 'config.json'));
    if (!config?.staff) {
      res.json({ matched: [], unmatchedPortal: portalNames, unmatchedConfig: [], error: 'No config' });
      return;
    }

    // Simple name matching (same as bridge module)
    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z]/g, '').trim();
    const manualMap: Record<string, string> = {
      'akter': 'Taslima Akter',
      'aziza': 'Aziza Sultana',
      'afroza': 'Afroza Akter',
      'jannaturrahman': 'Jannatur Rahman Eshita',
      'rimananny': 'Rabia Rima Nanny',
    };

    const findMatch = (name: string) => {
      const norm = normalize(name);
      if (manualMap[norm]) {
        const target = normalize(manualMap[norm]);
        const found = config.staff.find((s: any) => normalize(s.name) === target);
        if (found) return found.name;
      }
      const exact = config.staff.find((s: any) => normalize(s.name) === norm);
      if (exact) return exact.name;
      const fuzzy = config.staff.find((s: any) => {
        const sNorm = normalize(s.name);
        return norm.includes(sNorm) || sNorm.includes(norm);
      });
      return fuzzy?.name || null;
    };

    const matched: Array<{ portal: string; config: string }> = [];
    const unmatchedPortal: string[] = [];

    for (const name of portalNames) {
      const found = findMatch(name);
      if (found) {
        matched.push({ portal: name, config: found });
      } else {
        unmatchedPortal.push(name);
      }
    }

    const matchedConfigNames = new Set(matched.map(m => normalize(m.config)));
    const unmatchedConfig = config.staff
      .filter((s: any) => !matchedConfigNames.has(normalize(s.name)))
      .map((s: any) => s.name);

    res.json({ matched, unmatchedPortal, unmatchedConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
