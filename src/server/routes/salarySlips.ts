import { Router } from 'express';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const salarySlipsRouter = Router();

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PAYROLL_DIR = path.join(PROJECT_ROOT, 'js-agv8');
const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

// ─── Find latest wa-data file ──────────────────────────────────────────────
function findLatestWaDataFile(): string | null {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('wa-data-') && f.endsWith('.js'))
    .sort()
    .reverse();
  return files.length > 0 ? path.join(OUTPUT_DIR, files[0]) : null;
}

// ─── Parse wa-data file ────────────────────────────────────────────────────
function parseWaDataFile(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  const monthMatch = content.match(/window\.monthName\s*=\s*"([^"]+)"/);
  const schoolMatch = content.match(/window\.schoolName\s*=\s*"([^"]+)"/);

  const dataMatch = content.match(/window\.waData\s*=\s*\[([\s\S]*)\];/);
  if (!dataMatch) return null;

  const entries: any[] = [];
  const entryRegex = /\{[\s\S]*?\}/g;
  let match;
  while ((match = entryRegex.exec(dataMatch[1])) !== null) {
    const entry = match[0];
    const nameMatch = entry.match(/name:\s*"([^"]*?)"/);
    const phoneMatch = entry.match(/phone:\s*"([^"]*?)"/);
    const netMatch = entry.match(/net:\s*"([^"]*?)"/);
    const noteMatch = entry.match(/note:\s*"([^"]*?)"/);
    const msgMatch = entry.match(/message:\s*`([\s\S]*?)`/);

    if (nameMatch) {
      entries.push({
        name: nameMatch[1],
        phone: phoneMatch ? phoneMatch[1] : '',
        net: netMatch ? netMatch[1] : '',
        note: noteMatch ? noteMatch[1] : '',
        message: msgMatch ? msgMatch[1] : ''
      });
    }
  }

  return {
    monthName: monthMatch ? monthMatch[1] : null,
    schoolName: schoolMatch ? schoolMatch[1] : null,
    entries,
    filename: path.basename(filePath)
  };
}

// ─── Find latest Monthly-All report ────────────────────────────────────────
function findLatestMonthlyReport(): string | null {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('Monthly-All-') && f.endsWith('.docx'))
    .sort()
    .reverse();
  return files.length > 0 ? files[0] : null;
}

// GET /api/salary-slips — Get current status and data
salarySlipsRouter.get('/', (_req, res) => {
  try {
    const waDataFile = findLatestWaDataFile();
    const monthlyReport = findLatestMonthlyReport();

    if (!waDataFile) {
      return res.json({
        status: 'no_data',
        message: 'No salary slip data found. Run "Generate" first.',
        hasDataFile: false,
        hasReport: !!monthlyReport,
        reportFile: monthlyReport,
        entries: []
      });
    }

    const data = parseWaDataFile(waDataFile);
    if (!data) {
      return res.json({
        status: 'error',
        message: 'Failed to parse wa-data file.',
        hasDataFile: true,
        entries: []
      });
    }

    res.json({
      status: 'ready',
      hasDataFile: true,
      hasReport: !!monthlyReport,
      reportFile: monthlyReport,
      monthName: data.monthName,
      schoolName: data.schoolName,
      filename: data.filename,
      entries: data.entries
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/salary-slips/generate — Generate wa-data file from Monthly-All report
salarySlipsRouter.post('/generate', (req, res) => {
  try {
    // Check if wa3.js exists
    const wa3Path = path.join(PAYROLL_DIR, 'wa3.js');
    if (!fs.existsSync(wa3Path)) {
      return res.status(400).json({ error: 'wa3.js not found in payroll directory' });
    }

    // Check if Monthly-All report exists
    const monthlyReport = findLatestMonthlyReport();
    if (!monthlyReport) {
      return res.status(400).json({ error: 'No Monthly-All report found in output/ folder' });
    }

    // Run wa3.js generate
    console.log('[salary-slips] Running wa3.js generate...');
    execSync('node wa3.js generate', {
      cwd: PAYROLL_DIR,
      stdio: 'pipe',
      timeout: 120_000
    });

    // Return updated data
    const waDataFile = findLatestWaDataFile();
    if (!waDataFile) {
      return res.status(500).json({ error: 'Generation completed but no wa-data file created' });
    }

    const data = parseWaDataFile(waDataFile);
    console.log(`[salary-slips] Generated: ${data?.entries?.length || 0} entries`);

    res.json({
      success: true,
      message: `Generated ${data?.entries?.length || 0} salary slip entries`,
      monthName: data?.monthName,
      schoolName: data?.schoolName,
      filename: data?.filename,
      entries: data?.entries || []
    });
  } catch (err: any) {
    console.error('[salary-slips] Generate failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/salary-slips/send — Send all WhatsApp messages
salarySlipsRouter.post('/send', async (req, res) => {
  try {
    const waDataFile = findLatestWaDataFile();
    if (!waDataFile) {
      return res.status(400).json({ error: 'No wa-data file found. Run "Generate" first.' });
    }

    // Check if wa3.js exists
    const wa3Path = path.join(PAYROLL_DIR, 'wa3.js');
    if (!fs.existsSync(wa3Path)) {
      return res.status(400).json({ error: 'wa3.js not found in payroll directory' });
    }

    console.log('[salary-slips] Starting WhatsApp send...');

    // Run wa3.js send in background (don't wait for completion)
    const { spawn } = require('child_process');
    const child = spawn('node', ['wa3.js', 'send'], {
      cwd: PAYROLL_DIR,
      stdio: 'pipe',
      detached: true
    });

    child.stdout?.on('data', (data: Buffer) => {
      console.log(`[wa3-send] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      console.error(`[wa3-send] ${data.toString().trim()}`);
    });

    child.unref();

    res.json({
      success: true,
      message: 'WhatsApp send started in background. Check server logs for progress.',
      pid: child.pid
    });
  } catch (err: any) {
    console.error('[salary-slips] Send failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});
