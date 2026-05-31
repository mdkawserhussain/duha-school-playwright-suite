/**
 * Nightly scheduler — runs the extraction on a cron schedule.
 *
 * Usage:
 *   npx tsx src/scheduler.ts                    # default: daily at 23:00
 *   SCHEDULE="0 2 * * *" npx tsx src/scheduler.ts  # custom cron
 *
 * The scheduler forks a child process for each run so the main process
 * stays alive and handles restarts/crashes gracefully.
 */

import * as cron from 'node-cron';
import { spawn } from 'node:child_process';
import { log } from './utils/logger';

const DEFAULT_SCHEDULE = '0 23 * * *'; // 11 PM daily

function getSchedule(): string {
  const schedule = process.env.SCHEDULE || DEFAULT_SCHEDULE;
  if (!cron.validate(schedule)) {
    log.error(`Invalid cron schedule: "${schedule}". Using default "${DEFAULT_SCHEDULE}"`);
    return DEFAULT_SCHEDULE;
  }
  return schedule;
}

function runExtraction(): void {
  const timestamp = new Date().toISOString();
  log.info(`[scheduler] Starting scheduled extraction at ${timestamp}`);

  const child = spawn('npx', ['tsx', 'src/cli.ts'], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('close', (code) => {
    if (code === 0) {
      log.info('[scheduler] Extraction completed successfully');
    } else {
      log.error(`[scheduler] Extraction failed with exit code ${code}`);
    }
  });

  child.on('error', (err) => {
    log.error(`[scheduler] Failed to start extraction: ${err.message}`);
  });
}

export function startScheduler(): void {
  const schedule = getSchedule();
  log.info(`[scheduler] Starting scheduler with cron: "${schedule}"`);
  log.info('[scheduler] Press Ctrl+C to stop');

  const task = cron.schedule(schedule, () => {
    runExtraction();
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.info('[scheduler] Shutting down...');
    task.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log.info('[scheduler] Received SIGTERM, shutting down...');
    task.stop();
    process.exit(0);
  });
}

// If run directly (not imported)
if (require.main === module) {
  startScheduler();
}
