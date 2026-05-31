import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from './logger';

/**
 * Writes data arrays cleanly to Dated JSON output files.
 * Emits warnings for empty datasets to protect against silent extraction loss.
 */
export function writeJsonOutput(prefix: string, data: any[]): void {
  try {
    // Ensure the output directory exists
    if (!fs.existsSync(CONFIG.directories.output)) {
      fs.mkdirSync(CONFIG.directories.output, { recursive: true });
    }

    // Generate local timezone-accurate date string (YYYY-MM-DD)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const filename = `${prefix}_${dateString}.json`;
    const outputPath = path.join(CONFIG.directories.output, filename);

    // Backup existing file if it exists (ERR-15)
    let hasBackup = false;
    if (fs.existsSync(outputPath)) {
      const timestamp = Date.now();
      const backupFilename = `${prefix}_${dateString}_backup_${timestamp}.json`;
      const backupPath = path.join(CONFIG.directories.output, backupFilename);
      try {
        fs.renameSync(outputPath, backupPath);
        hasBackup = true;
        log.warn(`Existing file found at ${outputPath}. Renamed/backed up to: ${backupFilename}`);
      } catch (backupError) {
        log.error(`Failed to backup existing file before writing: ${(backupError as Error).message}`);
      }
    }

    // If data is empty and we just backed up a valid file, preserve the backup
    if (data.length === 0) {
      if (hasBackup) {
        log.error(`Empty extraction result for "${prefix}" — previous output preserved.`);
        return;
      }
      log.error(`Empty extraction result for "${prefix}" — no previous output to preserve. Writing empty array.`);
    }

    // Write file
    const serializedData = JSON.stringify(data, null, 2);
    fs.writeFileSync(outputPath, serializedData, 'utf-8');

    log.info(`Extracted data written successfully: [${data.length} records] -> ${outputPath}`);
  } catch (error) {
    log.error(`Failed to write JSON output for prefix "${prefix}":`, error);
    throw error;
  }
}

/**
 * Writes a run manifest JSON file with combo results, timing, and errors.
 */
export interface RunManifest {
  totalCombos: number;
  successfulCombos: number;
  failedCombos: Array<{ year: string; shift: string; cls: string; error: string }>;
  totalRawRecords: number;
  totalDueRecords: number;
  startTime: string;
  endTime: string;
  durationMs: number;
}

export function writeRunManifest(data: RunManifest): void {
  try {
    if (!fs.existsSync(CONFIG.directories.output)) {
      fs.mkdirSync(CONFIG.directories.output, { recursive: true });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const filename = `run_manifest_${dateString}.json`;
    const outputPath = path.join(CONFIG.directories.output, filename);

    const serializedData = JSON.stringify(data, null, 2);
    fs.writeFileSync(outputPath, serializedData, 'utf-8');

    if (data.failedCombos.length > 0) {
      log.warn(`Run manifest written with ${data.failedCombos.length} failed combo(s): ${outputPath}`);
    } else {
      log.info(`Run manifest written: ${outputPath}`);
    }
  } catch (error) {
    log.error('Failed to write run manifest:', error);
  }
}
