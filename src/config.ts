import 'dotenv/config';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..');
const rawBaseUrl = process.env.PORTAL_BASE_URL || 'https://duhais.eduexpert24.com';

/** Splits a comma-separated env string into a trimmed, non-empty array. */
function parseList(val: string | undefined, fallback: string): string[] {
  const src = val || fallback;
  return src.split(',').map((s) => s.trim()).filter(Boolean);
}

export const CONFIG = {
  baseUrl: rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl,
  credentials: {
    username: process.env.PORTAL_USERNAME || '',
    password: process.env.PORTAL_PASSWORD || '',
  },
  paths: {
    dashboard: '/dashboard',
    login: process.env.LOGIN_URL || '',
    attendance: '/site/employee/attendance/master',
    finance: '/finance/due-payments', // Note: Sidebar navigation will be used instead
  },
  navigation: {
    consoleMode: process.env.NAVIGATE_CONSOLE_MODE === 'true',
    sidebarPath: [
      'Fee Management',
      'Fee Report',
      'Payment Report',
      'Class & Student & Subhead Wise Collection Status'
    ]
  },
  filters: {
    years:   parseList(process.env.PORTAL_YEAR,  '2026'),
    shifts:  parseList(process.env.PORTAL_SHIFT, ''),
    classes: parseList(process.env.PORTAL_CLASS, ''),
    dueStudentsOnly: (process.env.PORTAL_DUE_STUDENTS_ONLY || process.env.PORTAL_DUE_ONLY) !== 'false',
    minDue: parseFloat(process.env.MIN_DUE_AMOUNT || process.env.PORTAL_MIN_DUE || '0'),
    classFilter: (process.env.PORTAL_CLASS_FILTER || '').trim(),
    columnFilter: (process.env.PORTAL_COLUMN_FILTER || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    periodMonths: parseList(process.env.PORTAL_PERIOD_MONTHS, ''),
  },
  attendance: {
    startDate: process.env.ATTENDANCE_START_DATE || '',
    endDate: process.env.ATTENDANCE_END_DATE || '',
    shiftId: Number(process.env.ATTENDANCE_SHIFT_ID) || 1,
    isTeacher: Number(process.env.ATTENDANCE_IS_TEACHER) || 3,
  },
  extractors: {
    attendance: process.env.EXTRACT_ATTENDANCE === 'true',
    accountsReceivable: process.env.EXTRACT_ACCOUNTS_RECEIVABLE !== 'false',
  },
  report: {
    // Comma-separated column names for export filtering.
    // PORTAL_COLUMNS is the single source of truth (web UI + CLI).
    // Falls back to REPORT_COLUMNS for backward compatibility.
    // Leave empty to include ALL columns from the portal table.
    columns: (process.env.PORTAL_COLUMNS || process.env.REPORT_COLUMNS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  timeouts: {
    navigation: 30000,
    element: 15000,
    networkIdle: 10000,
    settleDelay: 500,
    profileTimeout: 10000,
  },
  maxTotalRuntimeMs: Number(process.env.MAX_TOTAL_RUNTIME_MS) || 600000,
  directories: {
    userData: path.join(projectRoot, 'user-data'),
    output: path.join(projectRoot, 'output'),
    errors: path.join(projectRoot, 'errors'),
  },
};

// Startup validation
export function validateConfig(): void {
  const missingVars: string[] = [];

  // Credentials are required — exit immediately if either is empty.
  if (!CONFIG.credentials.username) {
    missingVars.push('PORTAL_USERNAME');
  }
  if (!CONFIG.credentials.password) {
    missingVars.push('PORTAL_PASSWORD');
  }

  if (missingVars.length > 0) {
    console.error(`\x1b[31m[FATAL] Configuration validation failed. Missing: ${missingVars.join(', ')}. Set them in .env\x1b[0m`);
    process.exit(1);
  }
}
