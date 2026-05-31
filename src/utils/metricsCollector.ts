import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from './logger';

const moduleStart = Date.now();
const comboTimings: Array<{ combo: string; durationMs: number; recordCount: number }> = [];
const errors: string[] = [];

export function recordComboTiming(combo: string, durationMs: number, recordCount: number): void {
  comboTimings.push({ combo, durationMs, recordCount });
}

export function recordError(message: string): void {
  errors.push(message);
}

export function writeMetrics(): void {
  try {
    if (!fs.existsSync(CONFIG.directories.output)) {
      fs.mkdirSync(CONFIG.directories.output, { recursive: true });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const filename = `run_metrics_${dateString}.json`;
    const outputPath = path.join(CONFIG.directories.output, filename);

    const metrics = {
      startTime: new Date(moduleStart).toISOString(),
      endTime: now.toISOString(),
      durationMs: Date.now() - moduleStart,
      comboTimings,
      errors,
      systemInfo: {
        nodeVersion: process.version,
        playwrightVersion: '1.60.0',
        os: os.platform(),
        arch: os.arch(),
      },
    };

    const serializedData = JSON.stringify(metrics, null, 2);
    fs.writeFileSync(outputPath, serializedData, 'utf-8');

    log.info(`Metrics written: ${outputPath}`);
  } catch (error) {
    log.error('Failed to write metrics:', error);
  }
}
