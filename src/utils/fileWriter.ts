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

    // Verify empty arrays to alert on possible extraction logic breakages
    if (data.length === 0) {
      log.warn(`Warning: The extracted dataset for "${prefix}" is completely empty. Overwriting target JSON with empty array.`);
    }

    // Backup existing file if it exists (ERR-15)
    if (fs.existsSync(outputPath)) {
      const timestamp = Date.now();
      const backupFilename = `${prefix}_${dateString}_backup_${timestamp}.json`;
      const backupPath = path.join(CONFIG.directories.output, backupFilename);
      try {
        fs.renameSync(outputPath, backupPath);
        log.warn(`Existing file found at ${outputPath}. Renamed/backed up to: ${backupFilename}`);
      } catch (backupError) {
        log.error(`Failed to backup existing file before writing: ${(backupError as Error).message}`);
      }
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
