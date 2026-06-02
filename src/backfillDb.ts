/**
 * Backfill script — populates the SQLite history database from existing JSON output files.
 * Run once: npx tsx src/backfillDb.ts
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Set the env var so historyDb functions don't no-op
process.env.ENABLE_HISTORY_DB = 'true';

import { getDb, closeHistoryDb } from './utils/historyDb';

const OUTPUT_DIR = path.join(__dirname, '../output');

function backfill() {
  const db = getDb();

  // 1. Read run history
  const historyPath = path.join(OUTPUT_DIR, 'run_history.json');
  if (!fs.existsSync(historyPath)) {
    console.log('No run_history.json found. Nothing to backfill.');
    return;
  }

  const runs: Array<{ timestamp: string; rawCount: number; dueCount: number; label?: string }> =
    JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

  console.log(`Found ${runs.length} runs in history.`);

  // Check how many already exist
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM runs').get() as { cnt: number };
  console.log(`Database already has ${existing.cnt} runs.`);

  if (existing.cnt >= runs.length) {
    console.log('Database is up to date. Nothing to backfill.');
    return;
  }

  // 2. Insert runs
  const insertRun = db.prepare(
    'INSERT INTO runs (timestamp, duration_ms, raw_count, due_count, failed_combos) VALUES (?, ?, ?, ?, ?)'
  );

  const insertDues = db.prepare(
    'INSERT INTO dues_history (run_id, student_id, student_name, class_name, shift, total_due) VALUES (?, ?, ?, ?, ?, ?)'
  );

  // Find existing timestamps to avoid duplicates
  const existingTimestamps = new Set(
    (db.prepare('SELECT timestamp FROM runs').all() as Array<{ timestamp: string }>).map(r => r.timestamp)
  );

  // Try to find the most recent enriched JSON for dues data
  const enrichedFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('accounts_receivable_dues_enriched_') && f.endsWith('.json'))
    .sort()
    .reverse();

  let enrichedData: Array<Record<string, any>> = [];
  if (enrichedFiles.length > 0) {
    enrichedData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, enrichedFiles[0]), 'utf-8'));
    console.log(`Loaded ${enrichedData.length} student records from ${enrichedFiles[0]}`);
  }

  const insertAll = db.transaction(() => {
    let inserted = 0;
    for (const run of runs) {
      if (existingTimestamps.has(run.timestamp)) continue;

      // Estimate duration from run_manifest if available
      let durationMs = 0;
      try {
        const manifestPath = path.join(OUTPUT_DIR, `run_manifest_${run.timestamp.slice(0, 10)}.json`);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          durationMs = manifest.durationMs || 0;
        }
      } catch { /* ignore */ }

      const result = insertRun.run(
        run.timestamp,
        durationMs,
        run.rawCount,
        run.dueCount,
        0,
      );
      const runId = Number(result.lastInsertRowid);

      // Insert dues records for the latest run only (we only have today's data)
      if (enrichedData.length > 0 && run.timestamp.startsWith(new Date().toISOString().slice(0, 10))) {
        for (const row of enrichedData) {
          const rawDue = String(row['Total Due'] || '0').replace(/,/g, '');
          insertDues.run(
            runId,
            String(row['User ID'] || row['Student ID'] || ''),
            row['Std Name'] || row['Name'] || '',
            row['_class'] || row['Class'] || '',
            row['_shift'] || row['Shift'] || '',
            Number(rawDue) || 0,
          );
        }
        console.log(`  Run ${runId}: ${run.timestamp} — inserted ${enrichedData.length} dues records`);
      } else {
        console.log(`  Run ${runId}: ${run.timestamp} — no dues data available`);
      }
      inserted++;
    }
    return inserted;
  });

  const inserted = insertAll();
  console.log(`\nBackfill complete. Inserted ${inserted} runs.`);

  // Verify
  const totalRuns = (db.prepare('SELECT COUNT(*) as cnt FROM runs').get() as { cnt: number }).cnt;
  const totalDues = (db.prepare('SELECT COUNT(*) as cnt FROM dues_history').get() as { cnt: number }).cnt;
  console.log(`Database now has ${totalRuns} runs and ${totalDues} dues records.`);

  closeHistoryDb();
}

backfill();
