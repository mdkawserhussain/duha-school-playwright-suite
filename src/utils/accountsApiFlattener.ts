/**
 * Flattens the portal's class-student-subhead-base-fee-collect-list API
 * response into per-student records matching the current DOM-scraped format.
 *
 * API response shape (from curl reference):
 *   [0] → Array of student objects
 *   [1] → Array of subhead metadata
 *   [2] → total student count
 *   [3] → total paid amount
 *   [4] → total due amount
 *   [5] → Per-subhead total amounts
 *
 * Each student in [0]:
 *   { std_name, reg_no, contact_no, roll_number,
 *     data: { "0": { subhead_name, payment_status, paid_amount, dues_amount }, ... },
 *     total_paid_amount, total_due_amount }
 *
 * Output shape per record (matches current DOM-scraped format):
 *   { _year, _shift, _class, SL, Std Name, User ID, Roll, Contact No,
 *     Sports Fee, Session Fee, ..., January, ..., December, Total Paid, Total Due }
 */

export interface ApiStudentEntry {
  std_name: string;
  reg_no: string;
  contact_no: string;
  roll_number: string | number;
  data: Record<string, {
    subhead_name: string;
    subhead_id: number;
    payment_status: string;
    paid_amount: number | string;
    dues_amount: number | string;
    monthly_headwise_data?: Array<{ subhead_name: string; paid_amount: string; due_amount: number }>;
  }>;
  total_paid_amount: number;
  total_due_amount: number;
}

export type ApiResponse = [
  ApiStudentEntry[],           // [0] students
  unknown[],                   // [1] subhead metadata
  number,                      // [2] total count
  number,                      // [3] total paid
  number,                      // [4] total due
  unknown[],                   // [5] per-subhead totals
];

/**
 * Format a fee cell value from the API response.
 * - paid > 0, dues === 0 → "Paid : X"
 * - paid === 0, dues > 0  → "Due : X"
 * - paid > 0, dues > 0   → "Paid : X  Due : Y"
 * - both 0                → ""
 */
function formatFeeCell(paid: number | string, dues: number | string): string {
  const p = Number(paid) || 0;
  const d = Number(dues) || 0;
  const parts: string[] = [];
  if (p > 0) parts.push(`Paid : ${Math.round(p).toLocaleString()}`);
  if (d > 0) parts.push(`Due : ${Math.round(d).toLocaleString()}`);
  return parts.join('  ');
}

/**
 * Flatten the API response into per-student records matching the DOM-scraped format.
 */
export function flattenAccountsApiResponse(
  apiResponse: ApiResponse,
  year: string,
  shift: string,
  cls: string,
): Record<string, any>[] {
  const students = apiResponse[0] || [];
  const results: Record<string, any>[] = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const record: Record<string, any> = {
      _year: year,
      _shift: shift,
      _class: cls,
      'SL': i + 1,
      'Std Name': s.std_name?.trim() ?? '',
      'User ID': s.reg_no ?? '',
      'Roll': s.roll_number ?? '',
      'Contact No': s.contact_no ?? '',
    };

    // Flatten each subhead entry into a named column
    for (const [_idx, entry] of Object.entries(s.data)) {
      const colName = entry.subhead_name;
      if (colName && colName !== '') {
        record[colName] = formatFeeCell(entry.paid_amount, entry.dues_amount);
      }
    }

    record['Total Paid'] = Math.round(s.total_paid_amount || 0).toLocaleString();
    record['Total Due'] = Math.round(s.total_due_amount || 0).toLocaleString();

    results.push(record);
  }

  return results;
}
