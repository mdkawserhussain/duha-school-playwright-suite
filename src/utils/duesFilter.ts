import { log } from './logger';

/**
 * Safely parse a numeric string, removing currency symbols, commas, and whitespace.
 */
export function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Determines if a row is a junk row (e.g., subtotal, grand total, section header, spacer, etc.).
 */
export function isJunkRow(row: Record<string, string>): boolean {
  // Find key for Student ID or Name
  const studentIdKey = Object.keys(row).find(
    (k) => k.toLowerCase().includes('student id') || k.toLowerCase().includes('id')
  );
  const studentId = studentIdKey ? row[studentIdKey]?.trim() : '';

  // If Student ID is empty or contains "total" or similar, skip
  if (!studentId || /total|grand|subtotal|sub\s+total/i.test(studentId)) {
    return true;
  }

  const nameKey = Object.keys(row).find((k) => k.toLowerCase().includes('name'));
  const name = nameKey ? row[nameKey]?.trim() : '';
  if (name && /total|grand|subtotal|sub\s+total/i.test(name)) {
    return true;
  }

  // If all fields are empty or only one is non-empty, skip
  const nonEmpValues = Object.values(row).filter((v) => v.trim() !== '');
  if (nonEmpValues.length <= 1) {
    return true;
  }

  return false;
}

/**
 * Extract the "Due" amount from a cell value like "Due : 3,300" or "Paid : 3,300 Due : 1,000".
 * Returns the maximum "Due" value found in the string, or 0 if none.
 */
function parseDueFromCell(value: string): number {
  // Match patterns like "Due : 3,300" or "Due: 3300"
  const dueMatches = value.match(/due\s*:\s*([\d,]+)/gi);
  if (!dueMatches) return 0;
  let maxDue = 0;
  for (const m of dueMatches) {
    const num = parseNumeric(m.replace(/due\s*:\s*/i, ''));
    if (num > maxDue) maxDue = num;
  }
  return maxDue;
}

/**
 * Column-scoped check: does the row have dues in any of the specified columns?
 * Column names are matched case-insensitively by partial substring.
 */
function hasDueInColumns(row: Record<string, string>, checkColumns: string[]): boolean {
  const lowerFilters = checkColumns.map((c) => c.toLowerCase());
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('_')) continue; // skip metadata
    const lowerKey = key.toLowerCase();
    if (!lowerFilters.some((f) => lowerKey.includes(f))) continue;
    if (parseDueFromCell(value) > 0) return true;
  }
  return false;
}

/**
 * Legacy check: scan all columns for due/balance/receivable patterns.
 */
function hasDueAcrossAllColumns(row: Record<string, string>): boolean {
  let dueAmount = 0;
  let paidAmount = 0;
  let receivableAmount = 0;
  let hasDueColumn = false;
  let hasReceivableOrPaid = false;

  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    const numVal = parseNumeric(value);

    if (lowerKey.includes('due') || lowerKey.includes('balance') || lowerKey.includes('remaining')) {
      dueAmount = Math.max(dueAmount, numVal);
      hasDueColumn = true;
    }
    if (lowerKey.includes('paid') || lowerKey.includes('collection') || lowerKey.includes('received')) {
      paidAmount = numVal;
      hasReceivableOrPaid = true;
    }
    if (lowerKey.includes('receivable') || lowerKey.includes('assessed') || lowerKey.includes('payable') || lowerKey.includes('demand')) {
      receivableAmount = numVal;
      hasReceivableOrPaid = true;
    }
  }

  // Strategy 1: Explicit due column is > 0
  if (hasDueColumn && dueAmount > 0) return true;

  // Strategy 2: Paid is less than receivable/assessed/payable
  if (hasReceivableOrPaid && receivableAmount > paidAmount) return true;

  // Strategy 3: Status check
  const statusKey = Object.keys(row).find(
    (k) => k.toLowerCase().includes('status') || k.toLowerCase().includes('payment')
  );
  if (statusKey) {
    const statusVal = row[statusKey].toLowerCase();
    if (statusVal.includes('partial') || statusVal.includes('pending') || statusVal.includes('unpaid') || statusVal.includes('due')) {
      return true;
    }
  }

  return false;
}

/**
 * Filters rows to only keep students with outstanding dues.
 *
 * When `checkColumns` is provided (e.g. ["january","session"]), only those
 * specific columns are scanned for "Due : X" patterns.  This makes the
 * filter respect the REPORT_COLUMNS env var — e.g. REPORT_COLUMNS="january"
 * means only students with dues in the January column are kept.
 *
 * When `checkColumns` is empty/undefined the legacy behaviour applies:
 * check Total Due / balance across all columns.
 */
export function filterDuesRows(
  rows: Record<string, string>[],
  checkColumns?: string[],
): Record<string, string>[] {
  return rows.filter((row) => {
    if (isJunkRow(row)) {
      return false;
    }

    // ── Column-scoped mode (REPORT_COLUMNS is set) ──────────────────────
    if (checkColumns && checkColumns.length > 0) {
      return hasDueInColumns(row, checkColumns);
    }

    // ── Legacy mode: scan all columns for due/balance/receivable ────────
    return hasDueAcrossAllColumns(row);
  });
}
