/**
 * Flattens attendance API responses into per-employee-per-day records.
 *
 * Supports two response formats:
 * 1. Paginated array (attendance-list-by-shift-date):
 *    [ { data: [{ id, full_name, contact_number, date, in_time, out_time, present, late_remark, early_exit, ... }] } ]
 *
 * 2. Nested employee_list (employee-date-wise-attendance-list):
 *    { employee_list: [{ id, full_name, designation, contact_number, date_list: [...] }] }
 */

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

interface DayEntry {
  date: string;
  attendance_status: boolean;
  in_time: string | null;
  out_time: string | null;
  hour: number;
  late_status: boolean;
  is_leave: boolean;
  is_holiday: boolean;
}

interface EmployeeEntry {
  id: number | string;
  full_name: string;
  designation: string;
  contact_number: string;
  date_list: DayEntry[];
}

interface NestedResponse {
  employee_list?: EmployeeEntry[];
}

interface PaginatedRecord {
  id?: number | string;
  username?: string;
  full_name?: string;
  contact_number?: string;
  date?: string;
  present_date?: string;
  present?: number;
  in_time?: string | null;
  out_time?: string | null;
  late_remark?: string | null;
  early_exit?: number;
  status_int?: number;
  in_leave?: number;
}

interface PaginatedPage {
  data?: PaginatedRecord[];
}

/**
 * Map a single day entry to a human-readable status string.
 */
function mapAttendanceStatus(day: DayEntry): string {
  if (day.is_holiday) return 'Holiday';
  if (day.is_leave) return 'Leave';
  if (day.attendance_status) return 'Present';
  return 'Absent';
}

/**
 * Flatten the paginated attendance API response (attendance-list-by-shift-date).
 * The response is an array where the first element is a Laravel paginator.
 */
export function flattenPaginatedResponse(responseBody: any[]): FlatAttendanceRecord[] {
  const paginator = responseBody[0];
  if (!paginator || !paginator.data) return [];

  const records: FlatAttendanceRecord[] = [];
  for (const item of paginator.data) {
    const present = item.present ?? 0;
    const inLeave = item.in_leave ?? 0;
    const lateRemark = item.late_remark;

    let status: string;
    if (inLeave === 1) status = 'Leave';
    else if (present === 1) status = 'Present';
    else status = 'Absent';

    records.push({
      'Employee ID': item.id ?? item.username ?? '',
      'Name': (item.full_name ?? '').trim(),
      'Designation': '',
      'Contact': item.contact_number ?? '',
      'Date': item.date ?? item.present_date ?? '',
      'Status': status,
      'In Time': item.in_time ?? null,
      'Out Time': item.out_time ?? null,
      'Hours': 0,
      'Late': !!(lateRemark && lateRemark.length > 0),
    });
  }
  return records;
}

/**
 * Flatten the nested employee_list attendance API response.
 */
export function flattenAttendanceResponse(responseBody: NestedResponse): FlatAttendanceRecord[] {
  const employees = responseBody.employee_list || [];
  const records: FlatAttendanceRecord[] = [];

  for (const emp of employees) {
    const base = {
      'Employee ID': emp.id,
      'Name': emp.full_name ?? '',
      'Designation': emp.designation ?? '',
      'Contact': emp.contact_number ?? '',
    };

    const days = emp.date_list || [];
    for (const day of days) {
      records.push({
        ...base,
        'Date': day.date ?? '',
        'Status': mapAttendanceStatus(day),
        'In Time': day.in_time ?? null,
        'Out Time': day.out_time ?? null,
        'Hours': day.hour ?? 0,
        'Late': day.late_status ?? false,
      });
    }
  }

  return records;
}
