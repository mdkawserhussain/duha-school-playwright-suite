/**
 * Leave History Database — SQLite storage for leave records.
 *
 * Stores fetched leave data for historical tracking and balance computation.
 * Creates the leave_history table on first run.
 *
 * Database location: user-data/history.db (shared with runs/dues/attendance)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { log } from './logger';
import type { LeaveRecord, LeaveSummary, MonthlyBreakdown } from '../types/LeaveRecord';

const DB_PATH = path.join(__dirname, '../../user-data/history.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER,
      staff_name TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      leave_type_short TEXT,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      days INTEGER DEFAULT 1,
      status TEXT NOT NULL,
      reason TEXT,
      request_date TEXT,
      approve_date TEXT,
      remaining_days INTEGER,
      total_allocated INTEGER,
      raw_json TEXT,
      fetched_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leave_staff ON leave_history(staff_name);
    CREATE INDEX IF NOT EXISTS idx_leave_type ON leave_history(leave_type);
    CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_history(status);
    CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_history(from_date, to_date);
  `);

  return db;
}

/**
 * Initializes the leave_history table. Called on server startup.
 */
export function initLeaveHistoryTable(): void {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return;
  try {
    getDb();
    log.info('Leave history table initialized');
  } catch (err) {
    log.warn(`Leave history DB init failed: ${(err as Error).message}`);
  }
}

/**
 * Stores leave records, skipping duplicates.
 * Dedup key: staff_name + leave_type + from_date + to_date
 */
export function storeLeaveRecords(records: LeaveRecord[]): { newRecords: number; skipped: number } {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return { newRecords: 0, skipped: records.length };

  try {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO leave_history
        (api_id, staff_name, leave_type, leave_type_short, from_date, to_date,
         days, status, reason, request_date, approve_date,
         remaining_days, total_allocated, raw_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let newRecords = 0;
    let skipped = 0;

    const insertAll = database.transaction((rows: LeaveRecord[]) => {
      for (const r of rows) {
        const result = stmt.run(
          r.id, r.staffName, r.leaveType, r.leaveTypeShort,
          r.fromDate, r.toDate, r.days, r.status, r.reason,
          r.requestDate, r.approveDate, r.remainingDays, r.totalAllocated,
          JSON.stringify(r), now,
        );
        if (result.changes > 0) newRecords++;
        else skipped++;
      }
    });

    insertAll(records);
    log.info(`Leave DB: ${newRecords} new, ${skipped} skipped (dedup)`);
    return { newRecords, skipped };
  } catch (err) {
    log.warn(`Leave DB store failed: ${(err as Error).message}`);
    return { newRecords: 0, skipped: records.length };
  }
}

/**
 * Queries leave records with optional filters.
 */
export function getLeaveRecords(filters?: {
  staff?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  year?: number;
}): LeaveRecord[] {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return [];

  try {
    const database = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.staff) {
      conditions.push('staff_name LIKE ?');
      params.push(`%${filters.staff}%`);
    }
    if (filters?.type) {
      conditions.push('leave_type = ?');
      params.push(filters.type);
    }
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.from) {
      conditions.push('from_date >= ?');
      params.push(filters.from);
    }
    if (filters?.to) {
      conditions.push('to_date <= ?');
      params.push(filters.to);
    }
    if (filters?.year) {
      conditions.push("strftime('%Y', from_date) = ?");
      params.push(String(filters.year));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM leave_history ${where} ORDER BY from_date DESC, staff_name ASC`;
    const rows = database.prepare(sql).all(...params) as any[];

    return rows.map(rowToLeaveRecord);
  } catch (err) {
    log.warn(`Leave DB query failed: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Computes per-staff leave balance summary.
 */
export function getLeaveSummary(year: number): LeaveSummary[] {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return [];

  try {
    const database = getDb();
    const rows = database.prepare(`
      SELECT
        staff_name,
        leave_type,
        leave_type_short,
        SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END) as used,
        total_allocated
      FROM leave_history
      WHERE strftime('%Y', from_date) = ?
      GROUP BY staff_name, leave_type
      ORDER BY staff_name, leave_type
    `).all(String(year)) as any[];

    const summaryMap = new Map<string, LeaveSummary>();

    for (const row of rows) {
      if (!summaryMap.has(row.staff_name)) {
        summaryMap.set(row.staff_name, { staffName: row.staff_name, leaveTypes: {} });
      }
      const summary = summaryMap.get(row.staff_name)!;
      summary.leaveTypes[row.leave_type] = {
        shortName: row.leave_type_short || '',
        allotted: row.total_allocated || 0,
        used: row.used || 0,
        remaining: (row.total_allocated || 0) - (row.used || 0),
      };
    }

    return Array.from(summaryMap.values());
  } catch (err) {
    log.warn(`Leave DB summary failed: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Computes month-wise leave breakdown per staff member.
 */
export function getMonthlyBreakdown(year: number): MonthlyBreakdown[] {
  if (process.env.ENABLE_HISTORY_DB !== 'true') return [];

  try {
    const database = getDb();
    const rows = database.prepare(`
      SELECT
        staff_name,
        strftime('%m', from_date) as month_num,
        leave_type,
        SUM(days) as total_days
      FROM leave_history
      WHERE strftime('%Y', from_date) = ? AND status = 'approved'
      GROUP BY staff_name, month_num, leave_type
      ORDER BY staff_name, month_num
    `).all(String(year)) as any[];

    const MONTH_NAMES = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const breakdownMap = new Map<string, MonthlyBreakdown>();

    for (const row of rows) {
      if (!breakdownMap.has(row.staff_name)) {
        breakdownMap.set(row.staff_name, {
          staffName: row.staff_name,
          months: {},
          yearTotal: 0,
        });
      }
      const breakdown = breakdownMap.get(row.staff_name)!;
      const monthName = MONTH_NAMES[parseInt(row.month_num, 10)];
      if (!breakdown.months[monthName]) {
        breakdown.months[monthName] = {};
      }
      breakdown.months[monthName][row.leave_type] = row.total_days || 0;
      breakdown.yearTotal += row.total_days || 0;
    }

    return Array.from(breakdownMap.values());
  } catch (err) {
    log.warn(`Leave DB monthly breakdown failed: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Returns aggregate status counts and last fetch time.
 */
export function getLeaveStatus(): {
  totalRecords: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  lastFetched: string | null;
  staffCount: number;
} {
  const empty = { totalRecords: 0, byStatus: {}, byType: {}, lastFetched: null, staffCount: 0 };
  if (process.env.ENABLE_HISTORY_DB !== 'true') return empty;

  try {
    const database = getDb();

    const total = database.prepare('SELECT COUNT(*) as cnt FROM leave_history').get() as any;
    const byStatus = database.prepare(
      'SELECT status, COUNT(*) as cnt FROM leave_history GROUP BY status'
    ).all() as any[];
    const byType = database.prepare(
      'SELECT leave_type, COUNT(*) as cnt FROM leave_history GROUP BY leave_type'
    ).all() as any[];
    const lastFetch = database.prepare(
      'SELECT MAX(fetched_at) as ts FROM leave_history'
    ).get() as any;
    const staffCount = database.prepare(
      'SELECT COUNT(DISTINCT staff_name) as cnt FROM leave_history'
    ).get() as any;

    return {
      totalRecords: total?.cnt || 0,
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.cnt])),
      byType: Object.fromEntries(byType.map(r => [r.leave_type, r.cnt])),
      lastFetched: lastFetch?.ts || null,
      staffCount: staffCount?.cnt || 0,
    };
  } catch (err) {
    log.warn(`Leave DB status query failed: ${(err as Error).message}`);
    return empty;
  }
}

function rowToLeaveRecord(row: any): LeaveRecord {
  return {
    id: row.api_id || row.id,
    staffName: row.staff_name,
    leaveType: row.leave_type,
    leaveTypeShort: row.leave_type_short || '',
    reason: row.reason || '',
    fromDate: row.from_date,
    toDate: row.to_date,
    days: row.days || 1,
    requestDate: row.request_date || row.from_date,
    approveDate: row.approve_date,
    status: row.status,
    remainingDays: row.remaining_days || 0,
    totalAllocated: row.total_allocated || 0,
  };
}
