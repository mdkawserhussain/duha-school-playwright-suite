import { Router } from 'express';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const verifyRouter = Router();

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PAYROLL_DIR = path.join(PROJECT_ROOT, 'payroll');
const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

// GET /api/verify — Get latest audit report
verifyRouter.get('/', (_req, res) => {
  try {
    const reportPath = path.join(OUTPUT_DIR, 'audit-report.txt');
    const snapshotPath = path.join(OUTPUT_DIR, 'audit-snapshot-*.json');

    // Find latest snapshot
    const snapshots = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.startsWith('audit-snapshot-') && f.endsWith('.json'))
      .sort()
      .reverse();

    const latestSnapshot = snapshots.length > 0
      ? JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, snapshots[0]), 'utf-8'))
      : null;

    // Check if report exists
    if (!fs.existsSync(reportPath)) {
      return res.json({
        status: 'no_report',
        message: 'No audit report found. Run verification first.',
        report: null,
        snapshot: latestSnapshot
      });
    }

    const report = fs.readFileSync(reportPath, 'utf-8');

    // Extract status from report
    const statusMatch = report.match(/FINAL VERIFICATION STATUS: (\w+)/);
    const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

    res.json({
      status: status.toLowerCase(),
      report,
      snapshot: latestSnapshot,
      generatedAt: latestSnapshot?.generated || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/verify/run — Run verification
verifyRouter.post('/run', (req, res) => {
  try {
    const { isFinal } = req.body || {};

    // Check if verify.js exists
    const verifyPath = path.join(PAYROLL_DIR, 'verify.js');
    if (!fs.existsSync(verifyPath)) {
      return res.status(400).json({ error: 'verify.js not found in payroll directory' });
    }

    // Run verify.js
    console.log('[verify] Running verification...');
    const args = isFinal ? 'verify.js --final' : 'verify.js';
    const output = execSync(`node ${args}`, {
      cwd: PAYROLL_DIR,
      stdio: 'pipe',
      timeout: 60_000,
      encoding: 'utf-8'
    });

    // Read the generated report
    const reportPath = path.join(OUTPUT_DIR, 'audit-report.txt');
    let report = output;
    if (fs.existsSync(reportPath)) {
      report = fs.readFileSync(reportPath, 'utf-8');
    }

    // Extract status
    const statusMatch = report.match(/FINAL VERIFICATION STATUS: (\w+)/);
    const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

    console.log(`[verify] Completed: ${status}`);

    res.json({
      success: true,
      status: status.toLowerCase(),
      report,
      message: `Verification ${status.toLowerCase()}`
    });
  } catch (err: any) {
    console.error('[verify] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});
