/**
 * Attendance-to-Payroll Bridge
 *
 * Transforms portal attendance JSON (FlatAttendanceRecord[]) into the
 * temp/parsed.json format expected by js-agv8's payroll engine.
 *
 * @module attendanceToPayroll
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface FlatAttendanceRecord {
  'Employee ID': number | string;
  'Name': string;
  'Designation': string;
  'Contact': string;
  'Date': string;
  'Status': string;
  'In Time': string | null;
  'Out Time': string | null;
  'Hours': number;
  'Late': boolean;
}

export interface DailyLog {
  day: number;
  time: string;
}

export interface Baseline {
  pdays: number;
  leave: number;
  absent: number;
  absentDates: number[];
  leaveDates: number[];
  late: number;
  over20: number;
  lateMins: number[];
  lateDetails: string;
}

export interface PayrollInput {
  name: string;
  role: string;
  dailyLogs: DailyLog[];
  baseline: Baseline;
}

export interface PayrollConfig {
  year: number;
  month: number;
  holidays: number[];
  policies: {
    standardTiming: string;
    tiffinRate: number;
    over20Fine: number;
    latePenalties: Array<{ min: number; fine: number }>;
  };
  staff: Array<{ name: string; basic: number; allowance: number; role: string; bank: { acct: string; mob: string }; exceptions: Record<string, any> }>;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Convert 24h time string ("08:00" or "14:30") to 12h format ("08:00 AM", "02:30 PM").
 * Also handles "08:00 AM" input (returns as-is).
 */
export function timeTo12h(time24: string): string {
  if (!time24) return '';

  // Already in 12h format
  if (/\s*(AM|PM)$/i.test(time24)) return time24.trim();

  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;

  let hrs = parseInt(match[1]);
  const mins = match[2];
  const period = hrs >= 12 ? 'PM' : 'AM';

  if (hrs === 0) hrs = 12;
  else if (hrs > 12) hrs -= 12;

  return `${String(hrs).padStart(2, '0')}:${mins} ${period}`;
}

/**
 * Convert time string to minutes since midnight.
 * Handles both "08:00 AM" (12h) and "08:00" (24h) formats.
 */
export function timeToMins(timeStr: string): number {
  if (!timeStr) return 0;

  // 12h format: "08:00 AM"
  const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let hrs = parseInt(match12[1]);
    const mins = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hrs !== 12) hrs += 12;
    if (period === 'AM' && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  }

  // 24h format: "08:00"
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hrs = parseInt(match24[1]);
    const mins = parseInt(match24[2]);
    return hrs * 60 + mins;
  }

  return 0;
}

/**
 * Normalize a name for fuzzy matching: lowercase, strip non-alpha.
 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Group flat attendance records by employee.
 * Primary key: Employee ID. Fallback: Name.
 */
export function groupByEmployee(
  records: FlatAttendanceRecord[]
): Map<string, FlatAttendanceRecord[]> {
  const groups = new Map<string, FlatAttendanceRecord[]>();

  for (const record of records) {
    const key = String(record['Employee ID'] || record['Name'] || '');
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  return groups;
}

/**
 * Compute baseline metrics from an employee's daily records.
 */
export function computeBaseline(
  records: FlatAttendanceRecord[],
  holidays: number[] = [],
  threshold: string = '07:49 AM'
): Baseline {
  const holidaySet = new Set(holidays);

  let pdays = 0;
  let leave = 0;
  let absent = 0;
  let late = 0;
  let over20 = 0;
  const absentDates: number[] = [];
  const leaveDates: number[] = [];
  const lateMins: number[] = [];
  const lateDetailsArr: string[] = [];

  const thresholdMins = timeToMins(threshold);

  for (const record of records) {
    const dayNum = extractDay(record['Date']);
    if (dayNum <= 0) continue;

    // Skip holidays
    if (holidaySet.has(dayNum)) continue;

    const status = (record['Status'] || '').toLowerCase();

    if (status === 'present' || status === 'late') {
      pdays++;

      // Late calculation
      const inTime = record['In Time'] || '';
      if (inTime && thresholdMins > 0) {
        const arrivalMins = timeToMins(inTime);
        const diff = arrivalMins - thresholdMins;
        if (diff > 0) {
          late++;
          lateMins.push(diff);
          lateDetailsArr.push(`${dayNum}(${diff}m)`);
          if (diff > 20) over20++;
        }
      } else if (status === 'late') {
        // Status says late but no time data — count as late with unknown minutes
        late++;
        lateMins.push(0);
      }
    } else if (status === 'leave') {
      leave++;
      leaveDates.push(dayNum);
    } else {
      // Absent (or unknown status)
      absent++;
      absentDates.push(dayNum);
    }
  }

  return {
    pdays,
    leave,
    absent,
    absentDates: absentDates.sort((a, b) => a - b),
    leaveDates: leaveDates.sort((a, b) => a - b),
    late,
    over20,
    lateMins,
    lateDetails: lateDetailsArr.join(', '),
  };
}

/**
 * Extract day number from ISO date string "2026-06-01" → 1.
 */
function extractDay(dateStr: string): number {
  if (!dateStr) return 0;
  const match = dateStr.match(/-(\d{1,2})$/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Find staff config entry by name (fuzzy matching).
 * Mirrors js-agv8/utils.js:findStaffConfig logic.
 */
export function findStaffMatch(
  empName: string,
  staff: Array<{ name: string }>
): { name: string } | null {
  const norm = normalize(empName);

  // Manual map for known short/ambiguous names
  const manualMap: Record<string, string> = {
    'akter': 'Taslima Akter',
    'aziza': 'Aziza Sultana',
    'afroza': 'Afroza Akter',
    'jannaturrahman': 'Jannatur Rahman Eshita',
    'rimananny': 'Rabia Rima Nanny',
  };

  if (manualMap[norm]) {
    const target = normalize(manualMap[norm]);
    const found = staff.find(s => normalize(s.name) === target);
    if (found) return found;
  }

  // Exact match
  const exact = staff.find(s => normalize(s.name) === norm);
  if (exact) return exact;

  // Fuzzy substring match
  const fuzzy = staff.find(s => {
    const sNorm = normalize(s.name);
    return norm.includes(sNorm) || sNorm.includes(norm);
  });
  return fuzzy || null;
}

/**
 * Convert grouped attendance records to payroll input format.
 */
export function convertToPayrollInput(
  grouped: Map<string, FlatAttendanceRecord[]>,
  config: PayrollConfig
): PayrollInput[] {
  const results: PayrollInput[] = [];

  for (const [, records] of grouped) {
    if (records.length === 0) continue;

    const name = String(records[0]['Name'] || '');
    const role = String(records[0]['Designation'] || 'Teacher');

    // Build dailyLogs (only for Present/Late days)
    const dailyLogs: DailyLog[] = [];
    for (const r of records) {
      const status = (r['Status'] || '').toLowerCase();
      if (status === 'present' || status === 'late') {
        const dayNum = extractDay(r['Date']);
        const inTime = r['In Time'] || '';
        if (dayNum > 0 && inTime) {
          dailyLogs.push({
            day: dayNum,
            time: timeTo12h(inTime),
          });
        }
      }
    }

    // Sort dailyLogs by day
    dailyLogs.sort((a, b) => a.day - b.day);

    // Compute baseline
    const baseline = computeBaseline(
      records,
      config.holidays,
      config.policies.standardTiming
    );

    results.push({ name, role, dailyLogs, baseline });
  }

  // Sort by name
  results.sort((a, b) => a.name.localeCompare(b.name));

  return results;
}

/**
 * Write payroll input to temp/parsed.json.
 */
export function writePayrollInput(
  inputs: PayrollInput[],
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(inputs, null, 2), 'utf-8');
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Transform portal attendance JSON into js-agv8 temp/parsed.json format.
 *
 * @param attendancePath - Path to attendance_YYYY-MM-DD.json
 * @param jsAgv8Dir - Path to js-agv8 project directory
 * @returns Array of PayrollInput records written
 */
export function attendanceToPayroll(
  attendancePath: string,
  jsAgv8Dir: string
): PayrollInput[] {
  // 1. Read attendance data
  if (!fs.existsSync(attendancePath)) {
    throw new Error(`Attendance file not found: ${attendancePath}\nRun extraction first: npm start`);
  }

  const records: FlatAttendanceRecord[] = JSON.parse(
    fs.readFileSync(attendancePath, 'utf-8')
  );

  if (records.length === 0) {
    throw new Error('Attendance file is empty');
  }

  // 2. Read js-agv8 config
  const configPath = path.join(jsAgv8Dir, 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found: ${configPath}\nEnsure js-agv8 is at: ${jsAgv8Dir}`);
  }

  const config: PayrollConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  );

  // 3. Group by employee
  const grouped = groupByEmployee(records);

  // 4. Convert to payroll input
  const inputs = convertToPayrollInput(grouped, config);

  // 5. Write to temp/parsed.json
  const outputPath = path.join(jsAgv8Dir, 'temp', 'parsed.json');
  writePayrollInput(inputs, outputPath);

  // 6. Report unmatched employees
  const configStaff = config.staff || [];
  const portalNames = new Set(Array.from(grouped.values()).map(r => r[0]?.['Name'] || ''));
  const matchedPortal = new Set<string>();
  const unmatchedPortal: string[] = [];
  const unmatchedConfig: string[] = [];

  for (const name of portalNames) {
    const match = findStaffMatch(name, configStaff);
    if (match) {
      matchedPortal.add(name);
    } else {
      unmatchedPortal.push(name);
    }
  }

  for (const staff of configStaff) {
    const norm = normalize(staff.name);
    const found = Array.from(matchedPortal).some(n => {
      const nMatch = findStaffMatch(n, configStaff);
      return nMatch && normalize(nMatch.name) === norm;
    });
    if (!found) {
      // Check if they appear in attendance at all
      const inPortal = Array.from(portalNames).some(n => {
        const m = findStaffMatch(n, configStaff);
        return m && normalize(m.name) === norm;
      });
      if (!inPortal) unmatchedConfig.push(staff.name);
    }
  }

  if (unmatchedPortal.length > 0) {
    console.warn(`⚠️  Portal employees not in config.json: ${unmatchedPortal.join(', ')}`);
  }
  if (unmatchedConfig.length > 0) {
    console.warn(`⚠️  Config staff not in attendance: ${unmatchedConfig.join(', ')}`);
  }

  return inputs;
}

export default attendanceToPayroll;
