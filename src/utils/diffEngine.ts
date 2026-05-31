import { log } from '../utils/logger';
import { parseNumeric } from './duesFilter';

export interface DiffEntry {
  studentId: string;
  name: string;
  previousAmount: number;
  currentAmount: number;
}

export interface DiffResult {
  newDefaulters: Record<string, string>[];
  clearedDues: Record<string, string>[];
  duesIncreased: DiffEntry[];
  duesDecreased: DiffEntry[];
}

function getStudentId(row: Record<string, string>): string {
  return row['User ID'] || row['student_id'] || row['Roll'] || row['Name'] || '';
}

function getDueAmount(row: Record<string, string>): number {
  const val = row['Total Due'] || row.totalDue || '0';
  return parseNumeric(val);
}

export function diffSnapshot(
  previous: Record<string, string>[],
  current: Record<string, string>[]
): DiffResult {
  const prevMap = new Map<string, Record<string, string>>();
  for (const row of previous) {
    const id = getStudentId(row);
    if (id) prevMap.set(id, row);
  }

  const newDefaulters: Record<string, string>[] = [];
  const clearedDues: Record<string, string>[] = [];
  const duesIncreased: DiffEntry[] = [];
  const duesDecreased: DiffEntry[] = [];

  for (const row of current) {
    const id = getStudentId(row);
    if (!id) continue;

    const currentDue = getDueAmount(row);
    const prevRow = prevMap.get(id);

    if (!prevRow) {
      // New student not in previous snapshot
      if (currentDue > 0) {
        newDefaulters.push(row);
      }
      continue;
    }

    const prevDue = getDueAmount(prevRow);

    if (currentDue === 0 && prevDue > 0) {
      clearedDues.push(row);
    } else if (currentDue > prevDue) {
      duesIncreased.push({ studentId: id, name: row['Std Name'] || row['Name'] || '', previousAmount: prevDue, currentAmount: currentDue });
    } else if (currentDue < prevDue && currentDue > 0) {
      duesDecreased.push({ studentId: id, name: row['Std Name'] || row['Name'] || '', previousAmount: prevDue, currentAmount: currentDue });
    }
  }

  return { newDefaulters, clearedDues, duesIncreased, duesDecreased };
}

export function logDiffResult(result: DiffResult): void {
  if (result.newDefaulters.length > 0) {
    log.warn(`⚠ ${result.newDefaulters.length} new defaulter(s) detected`);
  }
  if (result.clearedDues.length > 0) {
    log.info(`${result.clearedDues.length} student(s) cleared their dues`);
  }
  if (result.duesIncreased.length > 0) {
    log.warn(`⚠ ${result.duesIncreased.length} student(s) with increased dues`);
  }
  if (result.duesDecreased.length > 0) {
    log.info(`${result.duesDecreased.length} student(s) with decreased dues`);
  }
}
