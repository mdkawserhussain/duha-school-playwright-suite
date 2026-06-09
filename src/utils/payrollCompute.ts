/**
 * Salary Computation Module
 *
 * TypeScript port of js-agv8/all.js computePayroll() for the web preview endpoint.
 * Reads directly from filesystem (no HTTP needed).
 *
 * @module payrollCompute
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface PayrollPolicy {
  standardTiming: string;
  tiffinRate: number;
  over20Fine: number;
  latePenalties: Array<{ min: number; fine: number }>;
}

export interface StaffBank {
  acct: string;
  mob: string;
}

export interface StaffExceptions {
  ot?: number;
  increment?: number;
  bonus?: number;
  pfDeduction?: number;
  pfReturn?: number;
  note?: string;
  skipLateCheck?: boolean;
  skipAbsentDeduction?: boolean;
  overridePdays?: number | null;
  overrideAbsent?: number | null;
}

export interface StaffConfig {
  name: string;
  basic: number;
  allowance: number;
  bank: StaffBank;
  email?: string;
  role?: string;
  customTiming?: string | null;
  exceptions?: StaffExceptions;
}

export interface JsAgv8Config {
  schoolName: string;
  year: number;
  month: number;
  policies: PayrollPolicy;
  holidays: number[];
  tiffinExclusionDays: number[];
  noAbsentDays: number[];
  daySpecificTimings: Record<number, string>;
  locked: boolean;
  staff: StaffConfig[];
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

export interface PayrollEntry {
  name: string;
  role: string;
  dailyLogs: DailyLog[];
  baseline: Baseline;
}

export interface StaffSalary {
  name: string;
  role: string;
  basic: number;
  allowance: number;
  customTiming: string | null;
  pdays: number;
  absent: number;
  leave: number;
  late: number;
  over20: number;
  lateMins: number[];
  lateDetails: string;
  perDay: number;
  gross: number;
  tiffin: number;
  absDed: number;
  lateDed: number;
  totalDed: number;
  ot: number;
  increment: number;
  bonus: number;
  pfDeduction: number;
  pfReturn: number;
  net: number;
  markings: string;
  dailyLogs: DailyLog[];
  exceptions: StaffExceptions;
  absentDates: number[];
  leaveDates: number[];
  lateInfo: string[];
  calculationNote: string;
  acct: string;
  mob: string;
  excNote: string;
}

export interface PayrollPreview {
  year: number;
  month: number;
  schoolName: string;
  policies: PayrollPolicy;
  staff: StaffSalary[];
  summary: {
    totalStaff: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    totalTiffin: number;
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

function timeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
  if (!match) return 0;
  let hrs = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const period = match[3] || 'AM';
  if (period.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
  if (period.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
  return hrs * 60 + mins;
}

/**
 * Find staff config entry by name (fuzzy matching).
 * Mirrors js-agv8/utils.js:findStaffConfig logic.
 */
function findStaffConfig(empName: string, staff: StaffConfig[]): StaffConfig | null {
  const norm = normalize(empName);

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

  const exact = staff.find(s => normalize(s.name) === norm);
  if (exact) return exact;

  const fuzzy = staff.find(s => {
    const sNorm = normalize(s.name);
    return norm.includes(sNorm) || sNorm.includes(norm);
  });
  return fuzzy || null;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get Saturday dates for a given month/year.
 */
export function getSaturdayDates(year: number, month: number): number[] {
  const saturdays: number[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 6) saturdays.push(date.getDate());
    date.setDate(date.getDate() + 1);
  }
  return saturdays;
}

/**
 * Compute salary for a single staff member.
 * Direct port of all.js computePayroll().
 */
export function computeStaffSalary(
  emp: PayrollEntry,
  staffCfg: StaffConfig | null,
  config: JsAgv8Config,
  calculatedSaturdays: number[],
  allHolidays: number[],
  attCols: number,
  manualOverride?: Partial<Baseline>
): StaffSalary {
  // Zero-data fallback when staff config is missing (all.js lines 289-311)
  if (!staffCfg) {
    return {
      name: emp.name,
      role: emp.role || 'Teacher',
      basic: 0,
      allowance: 0,
      customTiming: null,
      pdays: 0,
      absent: 0,
      leave: 0,
      late: 0,
      over20: 0,
      lateMins: [],
      lateDetails: '',
      perDay: 0,
      gross: 0,
      tiffin: 0,
      absDed: 0,
      lateDed: 0,
      totalDed: 0,
      net: 0,
      ot: 0,
      increment: 0,
      bonus: 0,
      pfDeduction: 0,
      pfReturn: 0,
      markings: 'No attendance data found.',
      dailyLogs: emp.dailyLogs || [],
      exceptions: {},
      absentDates: [],
      leaveDates: [],
      lateInfo: [],
      calculationNote: `${emp.name} -> No attendance data found. Basic salary applied.`,
      acct: '',
      mob: '',
      excNote: '',
    };
  }

  const exc = staffCfg.exceptions || {};
  const basic = staffCfg.basic || 0;
  const genAllow = staffCfg.allowance || 0;
  const perDay = basic > 0 ? Math.round(basic / 25) : 0;

  let autoLate = 0, autoOver20 = 0, autoLateMins: number[] = [], excludedDaysPresent = 0;

  // Re-compute late from dailyLogs (all.js lines 154-180)
  for (const log of emp.dailyLogs || []) {
    if (config.holidays.includes(log.day)) continue;

    let thresholdStr = config.policies.standardTiming;
    const isSaturday = calculatedSaturdays.includes(log.day);

    if (config.daySpecificTimings[log.day]) {
      thresholdStr = config.daySpecificTimings[log.day];
    } else if (isSaturday) {
      thresholdStr = null as any; // No lateness check for Saturdays
    } else if (staffCfg?.customTiming) {
      thresholdStr = staffCfg.customTiming;
    }

    if (thresholdStr) {
      const thresholdMins = timeToMins(thresholdStr);
      const arrivalMins = timeToMins(log.time);
      const diff = arrivalMins - thresholdMins;

      if (diff > 0) {
        autoLate++;
        autoLateMins.push(diff);
        if (diff > 20) autoOver20++;
      }
    }
    if (config.tiffinExclusionDays.includes(log.day) || calculatedSaturdays.includes(log.day)) {
      excludedDaysPresent++;
    }
  }

  // Determine if manual overrides apply (all.js lines 182-189)
  const baseline = emp.baseline;
  const isOverride = (field: keyof Baseline) =>
    manualOverride && manualOverride[field] !== undefined &&
    manualOverride[field] !== (baseline ? baseline[field] : 0);

  let finalLate = isOverride('late') ? (manualOverride!.late || 0) : autoLate;
  let finalOver20 = isOverride('over20') ? (manualOverride!.over20 || 0) : autoOver20;
  let finalPdays = isOverride('pdays') ? (manualOverride!.pdays || 0) : (baseline?.pdays || 0);
  let finalAbsent = isOverride('absent') ? (manualOverride!.absent || 0) : (baseline?.absent || 0);
  const finalLeave = isOverride('leave') ? (manualOverride!.leave || 0) : (baseline?.leave || 0);
  let finalLateMins = isOverride('late') ? (manualOverride!.lateMins || []) : autoLateMins;

  // Apply exception overrides (all.js lines 192-194)
  if (exc.overridePdays !== null && exc.overridePdays !== undefined) finalPdays = exc.overridePdays;
  if (exc.overrideAbsent !== null && exc.overrideAbsent !== undefined) finalAbsent = exc.overrideAbsent;
  if (exc.skipLateCheck) { finalLate = 0; finalOver20 = 0; finalLateMins = []; }

  // Tiffin (all.js lines 196-197)
  const tiffinEligibleDays = Math.max(0, finalPdays - excludedDaysPresent);
  const tiffin = tiffinEligibleDays * config.policies.tiffinRate;

  // Gross (all.js line 198)
  const gross = basic + genAllow;

  // Absent deduction (all.js lines 199-200)
  let absDed = finalAbsent * perDay;
  if (exc.skipAbsentDeduction) absDed = 0;

  // Late deductions (all.js lines 202-214)
  let lateDed = 0;
  if (!exc.skipLateCheck) {
    lateDed += finalOver20 * config.policies.over20Fine;
    if (finalLate >= 3) lateDed += perDay;
    if (finalLate >= 4) {
      const nonOver20 = finalLateMins.filter(m => m <= 20).sort((a, b) => b - a);
      const toFine = nonOver20.slice(Math.max(0, 3 - finalOver20));
      for (const m of toFine) {
        const rule = config.policies.latePenalties.find(r => m >= r.min);
        if (rule) lateDed += rule.fine;
      }
    }
  }

  // Exception additions (all.js lines 217-221)
  const ot = exc.ot || 0;
  const increment = exc.increment || 0;
  const bonus = exc.bonus || 0;
  const pfDeduction = exc.pfDeduction || 0;
  const pfReturn = exc.pfReturn || 0;

  // Net (all.js lines 223-224)
  const totalDed = absDed + lateDed;
  const net = Math.max(0, gross - totalDed) + tiffin + ot + increment + bonus - pfDeduction + pfReturn;

  // Absent dates (all.js lines 227-237)
  const absentDates: number[] = [];
  const leaveDates = baseline?.leaveDates || [];
  const noAbsentDays = config.noAbsentDays || [];
  for (let d = 1; d <= attCols; d++) {
    if (allHolidays.includes(d)) continue;
    if (noAbsentDays.includes(d)) continue;
    if (leaveDates.includes(d)) continue;
    if (!(emp.dailyLogs || []).some(log => log.day === d)) {
      absentDates.push(d);
    }
  }

  // Late info (all.js lines 240-250)
  const lateInfo: string[] = [];
  for (const log of emp.dailyLogs || []) {
    if (allHolidays.includes(log.day)) continue;
    let thresholdStr = config.policies.standardTiming;
    if (config.daySpecificTimings[log.day]) thresholdStr = config.daySpecificTimings[log.day];
    else if (calculatedSaturdays.includes(log.day)) continue;
    else if (staffCfg?.customTiming) thresholdStr = staffCfg.customTiming;

    if (!thresholdStr) continue;
    const diff = timeToMins(log.time) - timeToMins(thresholdStr);
    if (diff > 0) lateInfo.push(`${log.day}(${diff}m)`);
  }

  // Markings (all.js lines 253-257)
  const markings = [
    absentDates.length ? `Ab:${absentDates.join(',')}` : '',
    lateInfo.length ? `Lt:${lateInfo.join(',')}` : '',
    leaveDates.length ? `Lv:${leaveDates.join(',')}` : '',
  ].filter(Boolean).join(' ');

  // Calculation note (all.js lines 259-263)
  const calculationNote = `${emp.name} -> Basic:${basic} + Allow:${genAllow} + Tiffin:${tiffin}` +
    (ot ? ` + OT:${ot}` : '') + (increment ? ` + Incr:${increment}` : '') + (bonus ? ` + Bonus:${bonus}` : '') +
    ` - AbsDed:${absDed} - LateDed:${lateDed}` +
    (pfDeduction ? ` - PF:${pfDeduction}` : '') + (pfReturn ? ` + PFRet:${pfReturn}` : '') +
    ` = Net:${net}`;

  return {
    name: emp.name,
    role: staffCfg?.role || emp.role || 'Teacher',
    basic,
    allowance: genAllow,
    customTiming: staffCfg?.customTiming || null,
    pdays: finalPdays,
    absent: finalAbsent,
    leave: finalLeave,
    late: finalLate,
    over20: finalOver20,
    lateMins: finalLateMins,
    lateDetails: lateInfo.join(', '),
    perDay,
    gross,
    tiffin,
    absDed,
    lateDed,
    totalDed,
    net,
    ot,
    increment,
    bonus,
    pfDeduction,
    pfReturn,
    markings,
    dailyLogs: emp.dailyLogs || [],
    exceptions: exc,
    absentDates,
    leaveDates,
    lateInfo,
    calculationNote,
    acct: staffCfg?.bank?.acct || '',
    mob: staffCfg?.bank?.mob || '',
    excNote: exc.note || '',
  };
}

/**
 * Compute payroll preview for all staff.
 * Reads parsed.json + config.json from js-agv8 directory.
 */
export function computePayrollPreview(jsAgv8Dir: string): PayrollPreview {
  const configPath = path.join(jsAgv8Dir, 'config.json');
  const parsedPath = path.join(jsAgv8Dir, 'temp', 'parsed.json');

  if (!fs.existsSync(configPath)) throw new Error(`config.json not found: ${configPath}`);
  if (!fs.existsSync(parsedPath)) throw new Error(`parsed.json not found: ${parsedPath}`);

  const config: JsAgv8Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const parsedRaw: PayrollEntry[] = JSON.parse(fs.readFileSync(parsedPath, 'utf-8'));
  const attendanceData = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw as any).employees;

  const daysInMonth = new Date(config.year, config.month, 0).getDate();

  // Auto-holidays: Fridays (all.js lines 87-93)
  const autoHolidays: number[] = [];
  const calculatedSaturdays = getSaturdayDates(config.year, config.month);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(config.year, config.month - 1, d).getDay();
    if (dayOfWeek === 5) autoHolidays.push(d); // Fridays
  }
  const allHolidays = [...new Set([...config.holidays, ...autoHolidays])];

  const attCols = (attendanceData[0] && attendanceData[0].dailyColsCount) || daysInMonth;

  // Map EVERYONE from config.staff (all.js lines 276-312)
  const staff: StaffSalary[] = config.staff.map(s => {
    const norm = normalize(s.name);
    const emp = attendanceData.find((a: PayrollEntry) => {
      return normalize(a.name) === norm;
    });

    if (emp) {
      return computeStaffSalary(emp, s, config, calculatedSaturdays, allHolidays, attCols);
    } else {
      // Zero-data fallback (all.js lines 289-311)
      const basic = s.basic || 0;
      const genAllow = s.allowance || 0;
      const exc = s.exceptions || {};
      const ot = exc.ot || 0;
      const increment = exc.increment || 0;
      const bonus = exc.bonus || 0;
      const pfDeduction = exc.pfDeduction || 0;
      const pfReturn = exc.pfReturn || 0;
      const gross = basic + genAllow;
      const perDay = Math.round(basic / 25);
      const net = gross + ot + increment + bonus - pfDeduction + pfReturn;

      return {
        name: s.name,
        role: s.role || 'Teacher',
        basic,
        allowance: genAllow,
        customTiming: s.customTiming || null,
        pdays: 0,
        absent: 0,
        leave: 0,
        late: 0,
        over20: 0,
        lateMins: [],
        lateDetails: '',
        perDay,
        gross,
        tiffin: 0,
        absDed: 0,
        lateDed: 0,
        totalDed: 0,
        net,
        ot,
        increment,
        bonus,
        pfDeduction,
        pfReturn,
        markings: 'No attendance data found.',
        dailyLogs: [],
        exceptions: exc,
        absentDates: [],
        leaveDates: [],
        lateInfo: [],
        calculationNote: `${s.name} -> No attendance data found. Basic salary applied.`,
        acct: s.bank?.acct || '',
        mob: s.bank?.mob || '',
        excNote: exc.note || '',
      };
    }
  });

  // Summary
  const totalGross = staff.reduce((sum, s) => sum + s.gross, 0);
  const totalNet = staff.reduce((sum, s) => sum + s.net, 0);
  const totalDeductions = staff.reduce((sum, s) => sum + s.totalDed, 0);
  const totalTiffin = staff.reduce((sum, s) => sum + s.tiffin, 0);

  return {
    year: config.year,
    month: config.month,
    schoolName: config.schoolName,
    policies: config.policies,
    staff,
    summary: {
      totalStaff: staff.length,
      totalGross,
      totalNet,
      totalDeductions,
      totalTiffin,
    },
  };
}

export default computePayrollPreview;
