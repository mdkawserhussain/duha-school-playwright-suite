// src/extractors/attendance.ts
import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { writeJsonOutput } from '../utils/fileWriter';
import { withRetry } from '../utils/retry';
import { flattenAttendanceResponse } from '../utils/attendanceFlattener';

/**
 * Navigates to the attendance module (establishes session), then makes
 * a direct API call to fetch all employee attendance records for the
 * configured date range. Flattens the nested employee_list[].date_list[]
 * into per-day records and writes the result to a dated JSON file.
 *
 * @param page Playwright Page instance (already authenticated).
 */
export async function extractAttendance(page: Page): Promise<void> {
  try {
    // ── 1. Navigate to attendance page (establishes session cookies) ────
    const attendanceUrl = `${CONFIG.baseUrl}/site/employee/attendance/master`;
    log.step('Navigating to attendance module');
    await withRetry(
      () => page.goto(attendanceUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeouts.navigation }),
      { label: 'Attendance page navigation' }
    );
    log.info('Navigated to attendance module');

    // ── 2. Resolve date range (env override → current month fallback) ──
    let startDate = CONFIG.attendance.startDate;
    let endDate = CONFIG.attendance.endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      startDate = startDate || `${y}-${m}-01`;
      endDate = endDate || `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      log.info(`Using current month as default: ${startDate} to ${endDate}`);
    } else {
      log.info(`Using env date range: ${startDate} to ${endDate}`);
    }

    // ── 3. Make direct API call (session cookies already set) ──────────
    log.step('Fetching attendance data via API');

    // Extract XSRF token from cookies (required by the portal)
    const xsrfToken = await page.evaluate(() => {
      const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    });

    const responseBody = await page.evaluate(async (args) => {
      const resp = await fetch(args.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': args.xsrfToken,
        },
        body: JSON.stringify({
          report_type: 2,
          month_id: null,
          user_id: null,
          year: null,
          is_teacher: args.isTeacher,
          date_range: {
            start: args.start,
            end: args.end,
            shortcut: 'month',
          },
          acc_shift_id: args.shiftId,
          employee_user_id: '',
        }),
      });
      return resp.json();
    }, {
      url: `${CONFIG.baseUrl}/site/employee/attendance/report/employee-date-wise-attendance-list`,
      start: startDate,
      end: endDate,
      shiftId: CONFIG.attendance.shiftId,
      isTeacher: CONFIG.attendance.isTeacher,
      xsrfToken,
    });

    // ── 4. Parse employee list from response ────────────────────────────
    const employeeList = responseBody.employee_list ?? [];
    const employeeCount = Array.isArray(employeeList) ? employeeList.length : 0;
    log.info(`API returned ${employeeCount} employees`);

    if (employeeCount > 0) {
      const first = employeeList[0];
      log.info(`First employee: ${first.full_name} (${first.date_list?.length ?? 0} date entries)`);
    } else {
      log.warn('No employees found in API response');
      log.info(`Response keys: ${Object.keys(responseBody).join(', ')}`);
    }

    // ── 5. Flatten nested data into per-day records ─────────────────────
    const flatRecords = flattenAttendanceResponse(responseBody);
    log.info(`Flattened into ${flatRecords.length} attendance records`);

    // ── 6. Write output ────────────────────────────────────────────────
    writeJsonOutput('attendance', flatRecords);
    log.info('Attendance data saved');
  } catch (err) {
    throw new Error(`extractAttendance failed: ${(err as Error).message}`, { cause: err as Error });
  }
}

export default extractAttendance;
