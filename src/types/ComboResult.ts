import type { DuesRecord } from './DuesRecord';

/**
 * Result of extracting a single year × shift × class combination.
 */
export interface ComboResult {
  year: string;
  shift: string;
  cls: string;
  records: DuesRecord[];
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Summary of a completed extraction run across all combos.
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
