/**
 * Shared utilities for computing monthly totals, summary rows, and period filtering.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Get months up to and including the specified end month.
 * E.g., getMonthsUpTo('May') → ['January', 'February', 'March', 'April', 'May']
 */
export function getMonthsUpTo(endMonth: string): string[] {
  const idx = MONTHS.findIndex(m => m.toLowerCase() === endMonth.toLowerCase());
  if (idx === -1) return MONTHS;
  return MONTHS.slice(0, idx + 1);
}

/**
 * Get months within a list of selected months AND all months before the latest selected.
 * E.g., selectedMonths = ['April', 'May'] → returns January through May
 * This implements "period till that month" behavior.
 */
export function getPeriodMonths(selectedMonths: string[]): string[] {
  if (!selectedMonths || selectedMonths.length === 0) return MONTHS;

  // Find the latest month in the selection
  let latestIdx = 0;
  for (const m of selectedMonths) {
    const idx = MONTHS.findIndex(mm => mm.toLowerCase() === m.toLowerCase());
    if (idx > latestIdx) latestIdx = idx;
  }

  // Return all months up to and including the latest selected month
  return MONTHS.slice(0, latestIdx + 1);
}

/**
 * Parse the PAID amount from a monthly cell like "Paid : 3,300".
 */
export function parsePaidFromCell(value: any): number {
  if (typeof value === 'number') return 0;
  const s = String(value ?? '');
  const match = s.match(/paid\s*:\s*([\d,]+)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) || 0 : 0;
}

/**
 * Parse the DUE amount from a monthly cell like "Due : 3,300".
 */
export function parseDueFromCell(value: any): number {
  if (typeof value === 'number') return 0;
  const s = String(value ?? '');
  const match = s.match(/due\s*:\s*([\d,]+)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) || 0 : 0;
}

/**
 * Parse a monthly cell value (both Paid and Due combined).
 */
export function parseMonthlyCell(value: any): number {
  return parsePaidFromCell(value) + parseDueFromCell(value);
}

/**
 * Parse a generic value (Total Paid, Total Due, fee columns).
 */
export function parseGenericValue(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  // Handle "Paid : X  Due : Y" format (fee columns can have both)
  let total = 0;
  const paidMatch = s.match(/paid\s*:\s*([\d,]+)/i);
  if (paidMatch) total += parseFloat(paidMatch[1].replace(/,/g, '')) || 0;
  const dueMatch = s.match(/due\s*:\s*([\d,]+)/i);
  if (dueMatch) total += parseFloat(dueMatch[1].replace(/,/g, '')) || 0;
  if (total > 0) return total;
  // Fallback: plain number
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Compute the sum of monthly dues for specific months only.
 */
export function computeMonthlyTotal(row: Record<string, any>, months?: string[]): number {
  const m = months || MONTHS;
  return m.reduce((sum, month) => sum + parseMonthlyCell(row[month]), 0);
}

/**
 * Compute Grand Total = Total Due.
 */
export function computeGrandTotal(row: Record<string, any>): number {
  const val = row['Total Due'] || row.totalDue || 0;
  return parseGenericValue(val);
}

/**
 * Group rows by class, preserving original order.
 */
export function groupByClass(rows: Record<string, any>[]): Map<string, Record<string, any>[]> {
  const groups = new Map<string, Record<string, any>[]>();
  for (const row of rows) {
    const cls = row._class || row.Class || 'Unknown';
    if (!groups.has(cls)) groups.set(cls, []);
    groups.get(cls)!.push(row);
  }
  return groups;
}

/**
 * Check if a column is a fee column (not monthly, not identity).
 */
export function isFeeColumn(col: string): boolean {
  return !MONTHS.includes(col) && col !== 'Total Paid' && col !== 'Total Due';
}

/**
 * Compute period-filtered Due total for a student.
 * For monthly columns: only count Due amounts within the period.
 * For fee columns: always count Due amounts (fees are not time-bound per the user's decision).
 */
export function computePeriodDue(
  row: Record<string, any>,
  periodMonths: string[],
  allColumns: string[]
): number {
  let total = 0;

  // Sum Due amounts from monthly columns within period
  for (const m of periodMonths) {
    if (MONTHS.includes(m)) {
      total += parseDueFromCell(row[m]);
    }
  }

  // Sum Due amounts from fee columns (always included)
  for (const col of allColumns) {
    if (isFeeColumn(col) && col !== 'Std Name' && col !== 'User ID' && col !== '_class' && col !== '_shift' && col !== '_year' && col !== 'SL' && col !== 'Roll' && col !== 'Contact No') {
      const val = row[col];
      if (typeof val === 'string' && /due\s*:\s*[\d,]+/i.test(val)) {
        const match = val.match(/due\s*:\s*([\d,]+)/i);
        if (match) total += parseFloat(match[1].replace(/,/g, '')) || 0;
      }
    }
  }

  return total;
}
