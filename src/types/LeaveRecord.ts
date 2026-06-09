/**
 * Leave Management Types — interfaces for leave data from portal API.
 *
 * API endpoint: /site/employee-leave/application-list
 * Response shape: paginated array with nested employee_history and leave type objects.
 */

export interface LeaveRecord {
  id: number;
  staffName: string;
  leaveType: string;
  leaveTypeShort: string;
  reason: string;
  fromDate: string;       // "YYYY-MM-DD"
  toDate: string;         // "YYYY-MM-DD"
  days: number;
  requestDate: string;    // "YYYY-MM-DD"
  approveDate: string | null;
  status: 'approved' | 'pending' | 'cancelled';
  remainingDays: number;
  totalAllocated: number; // leave_days from nested object
}

export interface LeaveSummary {
  staffName: string;
  leaveTypes: {
    [typeName: string]: {
      shortName: string;
      allotted: number;
      used: number;
      remaining: number;
    };
  };
}

export interface MonthlyBreakdown {
  staffName: string;
  months: {
    [month: string]: {                // "January", "February", etc.
      [leaveType: string]: number;    // days taken
    };
  };
  yearTotal: number;
}

export interface LeaveFetchResult {
  records: LeaveRecord[];
  totalFetched: number;
  newRecords: number;
  skippedDuplicates: number;
  fetchedAt: string;                  // ISO timestamp
}
