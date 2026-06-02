/**
 * Shared utilities for computing monthly totals and summary rows.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Parse a monthly cell value like "Due : 3,300" or "Paid : 3,300" or "3300"
 * Returns the numeric value.
 */
export function parseMonthlyCell(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  // Match "Due : 3,300" or "Paid : 3,300" pattern
  const match = s.match(/(?:due|paid)\s*:\s*([\d,]+)/i);
  if (match) return parseFloat(match[1].replace(/,/g, '')) || 0;
  // Fallback: try parsing as number
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Compute the sum of all monthly dues (Jan-Dec) for a row.
 */
export function computeMonthlyTotal(row: Record<string, any>): number {
  return MONTHS.reduce((sum, m) => sum + parseMonthlyCell(row[m]), 0);
}

/**
 * Compute Grand Total = Total Due (all fees combined).
 */
export function computeGrandTotal(row: Record<string, any>): number {
  const val = row['Total Due'] || row.totalDue || 0;
  if (typeof val === 'number') return val;
  const s = String(val ?? '');
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Group rows by class (using _class field), preserving original order.
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
 * Compute summary totals for a group of rows.
 * Returns an object with per-month totals and grand total.
 */
export function computeGroupSummary(rows: Record<string, any>[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const m of MONTHS) {
    summary[m] = rows.reduce((sum, r) => sum + parseMonthlyCell(r[m]), 0);
  }
  summary['Total'] = MONTHS.reduce((sum, m) => sum + summary[m], 0);
  summary['Grand Total'] = rows.reduce((sum, r) => sum + computeGrandTotal(r), 0);
  return summary;
}
