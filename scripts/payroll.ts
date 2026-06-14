/**
 * Payroll CLI — runs attendance-to-payroll bridge + payroll pipeline.
 *
 * Usage:
 *   npx tsx scripts/payroll.ts                     # auto-find latest attendance
 *   npx tsx scripts/payroll.ts --attendance path    # specific attendance file
 *   npx tsx scripts/payroll.ts --dry-run            # bridge only, no reports
 *   npx tsx scripts/payroll.ts --skip-verify        # skip audit step
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { attendanceToPayroll } from '../src/utils/attendanceToPayroll';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PAYROLL_DIR = path.join(PROJECT_ROOT, 'payroll');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

// ─── Arg Parsing ─────────────────────────────────────────────────────────────

function parseArgs(): {
  attendancePath: string | null;
  dryRun: boolean;
  skipVerify: boolean;
} {
  const args = process.argv.slice(2);
  let attendancePath: string | null = null;
  let dryRun = false;
  let skipVerify = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--attendance' && args[i + 1]) {
      attendancePath = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--skip-verify') {
      skipVerify = true;
    }
  }

  return { attendancePath, dryRun, skipVerify };
}

// ─── Find Latest Attendance ──────────────────────────────────────────────────

function findLatestAttendance(): string | null {
  if (!fs.existsSync(OUTPUT_DIR)) return null;

  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('attendance_') && f.endsWith('.json'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(OUTPUT_DIR, files[0]) : null;
}

// ─── Run Payroll Script ─────────────────────────────────────────────────────

function runScript(scriptName: string, label: string): boolean {
  const scriptPath = path.join(PAYROLL_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.warn(`⚠️  ${label}: ${scriptName} not found, skipping`);
    return false;
  }

  try {
    console.log(`\n▶ Running ${label}...`);
    execSync(`node ${scriptName}`, {
      cwd: PAYROLL_DIR,
      stdio: 'inherit',
      timeout: 120_000,
    });
    console.log(`✅ ${label} completed`);
    return true;
  } catch (err) {
    console.error(`❌ ${label} failed: ${(err as Error).message}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const { attendancePath: argPath, dryRun, skipVerify } = parseArgs();

  console.log('═══════════════════════════════════════════════');
  console.log('  DUHA Payroll — Attendance Bridge');
  console.log('═══════════════════════════════════════════════\n');

  // Check payroll exists
  if (!fs.existsSync(PAYROLL_DIR)) {
    console.error(`❌ payroll project not found at: ${PAYROLL_DIR}`);
    console.error('   Ensure the payroll directory is a sibling of the playwright project.');
    process.exit(1);
  }

  // Find attendance file
  const attendancePath = argPath || findLatestAttendance();
  if (!attendancePath) {
    console.error('❌ No attendance file found.');
    console.error('   Run extraction first: npm start');
    console.error('   Or specify: --attendance output/attendance_YYYY-MM-DD.json');
    process.exit(1);
  }

  console.log(`📄 Attendance: ${path.basename(attendancePath)}`);
  console.log(`📁 Payroll project: ${PAYROLL_DIR}`);
  if (dryRun) console.log('🔍 Dry run mode — bridge only, no reports');
  console.log('');

  // Run bridge
  console.log('▶ Step 1: Converting attendance → payroll format...');
  try {
    const inputs = attendanceToPayroll(attendancePath, PAYROLL_DIR);
    console.log(`✅ Bridge complete: ${inputs.length} employees processed`);
    console.log(`   Output: ${path.join(PAYROLL_DIR, 'temp', 'parsed.json')}`);
  } catch (err) {
    console.error(`❌ Bridge failed: ${(err as Error).message}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n🔍 Dry run complete. Check temp/parsed.json for output.');
    process.exit(0);
  }

  // Run payroll pipeline
  console.log('\n▶ Step 2: Running payroll pipeline...');
  runScript('all.js', 'Payroll computation');

  if (!skipVerify) {
    console.log('\n▶ Step 3: Running audit verification...');
    runScript('verify.js', 'Audit verification');
  }

  // Report generated files
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Generated Files');
  console.log('═══════════════════════════════════════════════\n');

  const outputDir = path.join(PAYROLL_DIR, 'output');
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir)
      .filter(f => !f.startsWith('.'))
      .sort()
      .reverse()
      .slice(0, 15);

    for (const f of files) {
      const stat = fs.statSync(path.join(outputDir, f));
      const size = stat.size > 1024 ? `${Math.round(stat.size / 1024)}KB` : `${stat.size}B`;
      console.log(`  ${f} (${size})`);
    }
  }

  // Run WhatsApp if available
  console.log('\n▶ Step 4: Generating WhatsApp salary slips...');
  runScript('wa.js', 'WhatsApp dashboard');

  console.log('\n✅ Payroll complete!');
}

main();
