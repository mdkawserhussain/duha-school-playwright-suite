// src/extractors/leaveExtractor.ts
/**
 * Leave Extractor — fetches employee leave applications from the portal API.
 *
 * Uses the same Playwright session as attendance/dues extraction.
 * API interception pattern: page.evaluate(fetch(...)) inherits session cookies.
 *
 * API: GET /site/employee-leave/application-list?paginate=100
 */

import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { writeJsonOutput } from '../utils/fileWriter';
import { storeLeaveRecords, getLeaveStatus } from '../utils/leaveHistoryDb';
import type { LeaveRecord, LeaveFetchResult } from '../types/LeaveRecord';

function parseApiRecord(r: any): LeaveRecord {
  return {
    id: r.id,
    staffName: r.employee_history?.user?.first_name || 'Unknown',
    leaveType: r.site_employee_leave_generate?.academic_leave_type?.name || 'Unknown',
    leaveTypeShort: r.site_employee_leave_generate?.academic_leave_type?.short_name || '',
    reason: r.reason || '',
    fromDate: r.from_date,
    toDate: r.to_date,
    days: r.spend_leave_days || 1,
    requestDate: r.request_date || r.from_date,
    approveDate: r.approve_date,
    status: r.leave_status,
    remainingDays: r.remaining_days || 0,
    totalAllocated: r.site_employee_leave_generate?.leave_days || 0,
  };
}

/**
 * Fetches all leave applications from the portal API.
 *
 * @param page Playwright Page instance (already authenticated).
 * @returns Fetch result with parsed records and dedup stats.
 */
export async function fetchLeaveApplications(page: Page): Promise<LeaveFetchResult> {
  try {
    // ── 1. Navigate to leave page (establishes session cookies) ────────
    const leaveUrl = `${CONFIG.baseUrl}/site/employee-leave/application-list`;
    log.step('Navigating to leave module');
    await page.goto(leaveUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeouts.navigation });
    log.info('Navigated to leave module');

    // ── 2. Extract XSRF token from cookies ─────────────────────────────
    const xsrfToken = await page.evaluate(() => {
      const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    });

    // ── 3. Fetch all pages via API (runs in browser context) ───────────
    log.step('Fetching leave applications via API');

    const rawRecords = await page.evaluate(async (args) => {
      const allRecords: any[] = [];
      let pageNum = 1;
      let hasMore = true;

      while (hasMore) {
        const url = `/site/employee-leave/application-list?search_leave_type=&search_text=&search_date=&search_leave_status=&paginate=100&page=${pageNum}`;

        const resp = await fetch(url, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': args.xsrfToken,
          },
        });

        if (!resp.ok) break;

        const data = await resp.json();

        if (Array.isArray(data)) {
          // Array of pages
          for (const pageData of data) {
            if (pageData.data && Array.isArray(pageData.data)) {
              allRecords.push(...pageData.data);
            }
          }
          hasMore = false;
        } else if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          allRecords.push(...data.data);
          pageNum++;
          hasMore = data.current_page < (data.last_page || data.current_page);
        } else {
          hasMore = false;
        }
      }

      return allRecords;
    }, { xsrfToken });

    log.info(`API returned ${rawRecords.length} raw leave records`);

    // ── 4. Parse API records into LeaveRecord[] ────────────────────────
    const records = rawRecords.map(parseApiRecord);
    log.info(`Parsed ${records.length} leave records`);

    if (records.length > 0) {
      const sample = records[0];
      log.info(`Sample: ${sample.staffName} - ${sample.leaveType} (${sample.status}) ${sample.fromDate} to ${sample.toDate}`);
    }

    // ── 5. Write JSON output ───────────────────────────────────────────
    writeJsonOutput('employee_leaves', records);
    log.info('Leave JSON saved');

    // ── 6. Store in SQLite ─────────────────────────────────────────────
    const { newRecords, skipped } = storeLeaveRecords(records);

    const result: LeaveFetchResult = {
      records,
      totalFetched: records.length,
      newRecords,
      skippedDuplicates: skipped,
      fetchedAt: new Date().toISOString(),
    };

    log.info(`Leave fetch complete: ${newRecords} new, ${skipped} skipped (dedup)`);
    return result;
  } catch (err) {
    throw new Error(`fetchLeaveApplications failed: ${(err as Error).message}`, { cause: err as Error });
  }
}

export default fetchLeaveApplications;
