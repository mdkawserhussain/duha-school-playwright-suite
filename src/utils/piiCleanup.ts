/**
 * PII Auto-Cleanup — deletes output files older than MAX_OUTPUT_AGE_DAYS.
 *
 * Runs at the start of each extraction to prevent accumulation of student
 * names, fee data, and other personally identifiable information on disk.
 *
 * Files cleaned:
 *   - output/*.json (dated extraction files, backups, manifests)
 *   - user-data/dropdown_cache.json (stale dropdown ID maps)
 *
 * Files preserved:
 *   - user-data/ (browser auth state — login cookies, localStorage)
 *   - .env / .env.example (credentials)
 *   - run_history.json (append-only log, small footprint)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { log } from './logger';

const DEFAULT_MAX_AGE_DAYS = 30;

function getMaxAgeDays(): number {
  const val = parseInt(process.env.MAX_OUTPUT_AGE_DAYS || '', 10);
  return isNaN(val) ? DEFAULT_MAX_AGE_DAYS : Math.max(val, 1);
}

function deleteOldFiles(dir: string, maxAgeMs: number, dryRun: boolean): number {
  let deleted = 0;
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip directories (user-data/, backups of directories)
      if (entry.isDirectory()) continue;

      // Preserve run_history.json (small append-only log)
      if (entry.name === 'run_history.json') continue;

      // Check file age
      try {
        const stat = fs.statSync(fullPath);
        const age = now - stat.mtimeMs;
        if (age > maxAgeMs) {
          const ageDays = Math.round(age / 86400000);
          if (dryRun) {
            log.info(`[cleanup:dry-run] Would delete: ${entry.name} (${ageDays}d old)`);
          } else {
            fs.unlinkSync(fullPath);
            log.info(`[cleanup] Deleted: ${entry.name} (${ageDays}d old)`);
          }
          deleted++;
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch (err) {
    log.warn(`[cleanup] Error scanning ${dir}: ${(err as Error).message}`);
  }
  return deleted;
}

/**
 * Run PII auto-cleanup on output/ and user-data/dropdown_cache.json.
 * Call this at the start of each extraction run.
 */
export function runPiCleanup(): { outputDeleted: number; cacheDeleted: number } {
  const maxAgeDays = getMaxAgeDays();
  const maxAgeMs = maxAgeDays * 86400000;
  const dryRun = process.env.PREVIEW_MODE === 'true';

  log.info(`[cleanup] Scanning for files older than ${maxAgeDays} day(s)...${dryRun ? ' (dry-run)' : ''}`);

  // Clean output directory
  const outputDir = path.join(__dirname, '../../output');
  const outputDeleted = deleteOldFiles(outputDir, maxAgeMs, dryRun);

  // Clean stale dropdown cache
  let cacheDeleted = 0;
  const cacheFile = path.join(__dirname, '../../user-data/dropdown_cache.json');
  try {
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const age = Date.now() - stat.mtimeMs;
      if (age > maxAgeMs) {
        if (dryRun) {
          log.info(`[cleanup:dry-run] Would delete: dropdown_cache.json (${Math.round(age / 86400000)}d old)`);
        } else {
          fs.unlinkSync(cacheFile);
          log.info(`[cleanup] Deleted: dropdown_cache.json (${Math.round(age / 86400000)}d old)`);
        }
        cacheDeleted++;
      }
    }
  } catch {
    // Ignore
  }

  const total = outputDeleted + cacheDeleted;
  if (total === 0) {
    log.info('[cleanup] No stale files found');
  } else {
    log.info(`[cleanup] Cleaned ${total} file(s) (${outputDeleted} output, ${cacheDeleted} cache)`);
  }

  return { outputDeleted, cacheDeleted };
}
