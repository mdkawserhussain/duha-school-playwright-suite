/**
 * Historical Data Ledger — SQLite database for longitudinal data storage.
 *
 * Stores every extraction run's data for trend analysis and historical queries.
 * Creates tables on first run and appends data on subsequent runs.
 *
 * Database location: user-data/history.db
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { log } from './logger';

const DB_PATH = path.join(__dirname, '../../user-data/history.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      duration_ms INTEGER,
      raw_count INTEGER,
      due_count INTEGER,
      failed_combos INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dues_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      student_id TEXT,
      student_name TEXT,
      class_name TEXT,
      shift TEXT,
      total_due REAL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      employee_id TEXT,
      employee_name TEXT,
      date TEXT,
      status TEXT,
      hours REAL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );
  `);

  return db;
}

/**
 * Records a run and returns its ID.
 */
export function recordRun(opts: {
  durationMs: number;
  rawCount: number;
  dueCount: number;
  failedCombos: number;
}): number {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return 0;

  try {
    const database = getDb();
    const stmt = database.prepare(
      'INSERT INTO runs (timestamp, duration_ms, raw_count, due_count, failed_combos) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      new Date().toISOString(),
      opts.durationMs,
      opts.rawCount,
      opts.dueCount,
      opts.failedCombos,
    );
    return Number(result.lastInsertRowid);
  } catch (err) {
    log.warn(`History DB: failed to record run: ${(err as Error).message}`);
    return 0;
  }
}

/**
 * Appends dues records for a run.
 */
export function appendDuesHistory(runId: number, records: Array<Record<string, any>>): void {
  if (process.env.ENABLE_HISTORY_DB !== 'true' || runId === 0) return;

  try {
    const database = getDb();
    const stmt = database.prepare(
      'INSERT INTO dues_history (run_id, student_id, student_name, class_name, shift, total_due) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertMany = database.transaction((rows: Array<Record<string, any>>) => {
      for (const row of rows) {
        stmt.run(
          runId,
          String(row['Student ID'] || row.student_id || ''),
          row['Name'] || row.student_name || '',
          row['Class'] || row.class_name || '',
          row['Shift'] || row.shift || '',
          Number(row['Total Due'] || row.total_due || 0),
        );
      }
    });

    insertMany(records);
    log.info(`History DB: appended ${records.length} dues records for run ${runId}`);
  } catch (err) {
    log.warn(`History DB: failed to append dues: ${(err as Error).message}`);
  }
}

/**
 * Queries historical dues for a specific student.
 */
export function queryStudentDues(studentId: string): Array<{
  timestamp: string;
  totalDue: number;
}> {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return [];

  try {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT r.timestamp, d.total_due as totalDue
      FROM dues_history d
      JOIN runs r ON d.run_id = r.id
      WHERE d.student_id = ?
      ORDER BY r.timestamp DESC
      LIMIT 30
    `);
    return stmt.all(studentId) as Array<{ timestamp: string; totalDue: number }>;
  } catch {
    return [];
  }
}

/**
 * Closes the database connection.
 */
export function closeHistoryDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
