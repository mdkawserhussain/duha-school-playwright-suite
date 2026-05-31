/**
 * Waiver/Concession Extractor — fetches class-wide fee waivers.
 *
 * For each class/shift combo, calls the portal's waiver list API and flattens
 * the response into per-student waiver records. Can optionally enrich the
 * accounts receivable data with waiver columns.
 *
 * API endpoint: POST /site/fee/student-payment-report/get-site-class-base-waiver-list
 */

import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { writeJsonOutput } from '../utils/fileWriter';
import type { WaiverRecord } from '../types/WaiverRecord';

interface WaiverApiResponse {
  waiver_list?: Array<Record<string, any>>;
  data?: Array<Record<string, any>>;
}

/**
 * Extracts waivers for a single class/shift combo.
 */
async function extractClassWaivers(
  page: Page,
  yearId: string,
  classId: string,
  shiftId: string,
  year: string,
  cls: string,
): Promise<WaiverRecord[]> {
  const xsrfToken = await page.evaluate(() => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });

  const responseBody: WaiverApiResponse = await page.evaluate(async (args) => {
    const resp = await fetch(args.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': args.xsrfToken,
      },
      body: JSON.stringify({
        academic_version_id: 2,
        academic_year_id: Number(args.yearId),
        academic_class_id: Number(args.classId),
        academic_department_id: null,
        academic_section_id: null,
        academic_shift_id: Number(args.shiftId),
        academic_class_group_id: null,
        academic_class_group_present: false,
        academic_session_id: null,
        academic_student_category_id: null,
        academic_student_type_id: null,
        academic_student_admission_type_id: null,
        start_date: null,
        end_date: null,
        waiver_type_id: null,
        active_status: 1,
      }),
    });
    return resp.json();
  }, {
    url: `${CONFIG.baseUrl}/site/fee/student-payment-report/get-site-class-base-waiver-list`,
    yearId,
    classId,
    shiftId,
    xsrfToken,
  });

  const rawWaivers = responseBody.waiver_list || responseBody.data || [];
  const records: WaiverRecord[] = [];

  for (const w of rawWaivers) {
    const raw = w as Record<string, any>;
    records.push({
      studentId: String(raw.student_id || raw.user_name || ''),
      studentName: raw.student_name || raw.std_name || '',
      className: cls,
      waiverType: raw.waiver_type || raw.waiver_type_name || '',
      reason: raw.waiver_reason || raw.reason || '',
      amount: Number(raw.waiver_amount || raw.amount || 0),
      months: raw.waiver_months || raw.months || '',
      academicYear: year,
    });
  }

  return records;
}

/**
 * Main export — extracts waivers for all class/shift combos.
 */
export async function extractWaivers(
  page: Page,
  combos: Array<{ yearId: string; shiftId: string; classId: string; year: string; shift: string; cls: string }>,
): Promise<WaiverRecord[]> {
  log.step(`Extracting waivers for ${combos.length} combo(s)...`);

  const allWaivers: WaiverRecord[] = [];
  const failed: string[] = [];

  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i];
    try {
      const waivers = await extractClassWaivers(
        page, combo.yearId, combo.classId, combo.shiftId, combo.year, combo.cls,
      );
      allWaivers.push(...waivers);

      if ((i + 1) % 5 === 0 || i === combos.length - 1) {
        log.info(`Waiver progress: ${i + 1}/${combos.length} combos (${allWaivers.length} waiver records so far)`);
      }
    } catch (err) {
      failed.push(`${combo.year}/${combo.shift}/${combo.cls}`);
      log.warn(`Waiver extraction failed for ${combo.year}/${combo.shift}/${combo.cls}: ${(err as Error).message}`);
    }
  }

  log.info(`Waiver extraction complete: ${allWaivers.length} record(s), ${failed.length} failure(s)`);

  if (allWaivers.length > 0) {
    writeJsonOutput('waivers', allWaivers);
  }

  return allWaivers;
}

/**
 * Enriches accounts receivable records with waiver columns.
 * Returns a new array with added 'Waiver Amount' and 'Waiver Reason' fields.
 */
export function enrichWithWaivers(
  arRecords: Array<Record<string, any>>,
  waivers: WaiverRecord[],
): Array<Record<string, any>> {
  if (waivers.length === 0) return arRecords;

  // Build lookup: studentId → aggregated waiver info
  const waiverMap = new Map<string, { totalAmount: number; reasons: string[] }>();
  for (const w of waivers) {
    const key = w.studentId;
    const existing = waiverMap.get(key);
    if (existing) {
      existing.totalAmount += w.amount;
      if (w.reason && !existing.reasons.includes(w.reason)) {
        existing.reasons.push(w.reason);
      }
    } else {
      waiverMap.set(key, { totalAmount: w.amount, reasons: w.reason ? [w.reason] : [] });
    }
  }

  // Enrich AR records
  return arRecords.map(record => {
    const raw = record as Record<string, any>;
    const studentId = String(raw['Student ID'] || raw.student_id || raw.user_name || '');
    const waiverInfo = waiverMap.get(studentId);
    return {
      ...raw,
      'Waiver Amount': waiverInfo?.totalAmount || 0,
      'Waiver Reason': waiverInfo?.reasons.join(', ') || '',
    };
  });
}
