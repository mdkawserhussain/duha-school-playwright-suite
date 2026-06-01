/**
 * Represents a flattened per-employee-per-day attendance record.
 * Matches the output of flattenAttendanceResponse() and flattenPaginatedResponse().
 */
export interface AttendanceRecord {
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
