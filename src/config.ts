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
    username: process.env.PORTAL_USERNAME || 'e232290012',
    password: process.env.PORTAL_PASSWORD || '01889534420',
  },
  paths: {
    dashboard: '/dashboard',
    login: process.env.LOGIN_URL || '',
    attendance: '/attendance/monitoring',
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
    dueStudentsOnly: process.env.PORTAL_DUE_STUDENTS_ONLY !== 'false',
  },
  extractors: {
    attendance: process.env.EXTRACT_ATTENDANCE === 'true',
    accountsReceivable: process.env.EXTRACT_ACCOUNTS_RECEIVABLE !== 'false',
  },
  report: {
    // Comma-separated list of column name substrings to include in the spreadsheet.
    // Matching is case-insensitive and partial (e.g. "session,january" matches "Session Fee", "January Due", etc.)
    // Leave empty to include ALL columns from the portal table.
    columns: (process.env.REPORT_COLUMNS || '')
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
  directories: {
    userData: path.join(projectRoot, 'user-data'),
    output: path.join(projectRoot, 'output'),
    errors: path.join(projectRoot, 'errors'),
  },
};

// Startup validation
export function validateConfig(): void {
  const missingVars: string[] = [];

  // Since we have defaults, we don't strictly crash if variables are not provided,
  // but if username/password are empty we alert.
  if (!CONFIG.credentials.username) {
    missingVars.push('PORTAL_USERNAME');
  }
  if (!CONFIG.credentials.password) {
    missingVars.push('PORTAL_PASSWORD');
  }

  if (missingVars.length > 0) {
    console.error(`\x1b[31m[FATAL] Configuration validation failed. Missing credentials.\x1b[0m`);
    process.exit(1);
  }
}
