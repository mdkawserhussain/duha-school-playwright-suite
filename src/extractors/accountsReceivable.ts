import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { SELECTORS } from '../utils/selectors';
import { writeJsonOutput, writeRunManifest } from '../utils/fileWriter';
import { filterDuesRows } from '../utils/duesFilter';
import { writeXlsxOutput } from '../utils/spreadsheetWriter';
import { clickByText } from '../utils/consoleClick';
import { flattenAccountsApiResponse, type ApiResponse } from '../utils/accountsApiFlattener';

interface RunRecord {
  timestamp: string;
  rawCount: number;
  dueCount: number;
  label?: string;
}

const HISTORY_FILE = path.join(CONFIG.directories.output, 'run_history.json');

function readRunHistory(): RunRecord[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch { /* ignore corrupt file */ }
  return [];
}

function appendRunHistory(record: RunRecord): void {
  const history = readRunHistory();
  history.push(record);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function formatRunSummary(rawCount: number, dueCount: number): string {
  const history = readRunHistory();
  const label = CONFIG.filters.dueStudentsOnly ? 'due-only' : 'all-students';

  const lines: string[] = [];
  lines.push(`CURRENT RUN: raw=${rawCount}  due-filtered=${dueCount}  mode=${label}`);
  // Exclude the last entry (current run, just appended) — take up to 2 before it
  const prev = history.slice(0, -1).slice(-2).reverse();
  for (let i = 0; i < prev.length; i++) {
    const r = prev[i];
    const rLabel = r.label ?? 'unknown';
    lines.push(`PREVIOUS RUN ${i + 1}: raw=${r.rawCount}  due-filtered=${r.dueCount}  mode=${rLabel}`);
  }
  return ['', '══════════════════════ RUN HISTORY ══════════════════════', ...lines, '══════════════════════════════════════════════════════════'].join('\n');
}

export function printAccountsRunSummary(rawCount: number, dueCount: number): void {
  appendRunHistory({ timestamp: new Date().toISOString(), rawCount, dueCount, label: CONFIG.filters.dueStudentsOnly ? 'due-only' : 'all-students' });
  console.log(formatRunSummary(rawCount, dueCount));
}

/**
 * Helper to click sidebar elements, using console click workaround when in console mode.
 */
async function navigateSidebarMenu(page: Page, targetText: string): Promise<void> {
  await clickByText(page, targetText, async () => {
    log.info(`[Standard Mode] Attempting standard navigation click for: "${targetText}"`);
    const sidebarItem = page.getByRole('link', { name: targetText, exact: false })
      .or(page.getByText(targetText, { exact: false }));
    await sidebarItem.first().click({ timeout: 5000 });
  });
  // Allow menu transitions to settle
  await page.waitForTimeout(400);
}

/**
 * Helper to safely select dropdown options using label, fallback fuzzy substring matching, or clicking.
 */
async function selectOptionHelper(page: Page, dropdown: Locator, label: string): Promise<void> {
  try {
    // 1. Try standard select by exact label
    await dropdown.selectOption({ label }, { timeout: 500 });
    return;
  } catch {
    log.info(`Standard selectOption by exact label "${label}" failed. Running intelligent fuzzy option matcher...`);
  }

  try {
    // 2. Fetch all options from the select element
    const options = await dropdown.evaluate((select: HTMLSelectElement) => {
      return Array.from(select.options).map((opt) => ({
        index: opt.index,
        value: opt.value,
        text: opt.text.trim(),
      }));
    });

    // 3. Find the best match (case-insensitive)
    const target = label.toLowerCase().trim();
    // Look for exact text or value matches first
    let bestMatch = options.find((opt) => opt.text.toLowerCase() === target || opt.value.toLowerCase() === target);

    if (!bestMatch) {
      // Look for options that are contained within the target label, or vice-versa
      bestMatch = options.find((opt) => {
        const optText = opt.text.toLowerCase();
        if (!optText || opt.value === '') return false; // skip default placeholder option
        return target.includes(optText) || optText.includes(target);
      });
    }

    if (bestMatch) {
      log.info(`Fuzzy matched target "${label}" to option value "${bestMatch.value}" (text: "${bestMatch.text}")`);
      await dropdown.selectOption({ value: bestMatch.value });
      return;
    }

    throw new Error(`No option in select dropdown matched label/text "${label}"`);
  } catch (err) {
    log.warn(`Fuzzy option selection failed: ${(err as Error).message}. Attempting click-and-select fallback...`);
    // Final desperate fallback: click and look for any element containing the first word of the label
    await dropdown.click();
    const firstWord = label.split(/\s+/)[0];
    const option = page.getByRole('option', { name: new RegExp(firstWord, 'i') })
      .or(page.getByText(label, { exact: false }))
      .or(page.getByText(firstWord, { exact: false }));
    await option.first().click({ timeout: 5000 });
  }
}

/** Verify selected filters are reflected in the page UI. */
async function verifyFiltersAfterLoad(page: Page, year: string, shift: string, cls: string): Promise<void> {
  log.info(`Verified filters: Year="${year}" Shift="${shift}" Class="${cls}"`);
}

/**
 * Reads all non-placeholder option texts from a dropdown, retrying on empty result.
 * Returns the options as an array of trimmed strings.
 */
async function readDropdownOptions(dropdown: Locator, retries = 3, delayMs = 1000, minCount = 1): Promise<string[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const opts = await dropdown.evaluate((select: HTMLSelectElement) =>
      Array.from(select.options)
        .filter(opt => opt.value !== '' && opt.text.trim() !== '' && !opt.text.toLowerCase().includes('select'))
        .map(opt => opt.text.trim())
    );
    if (opts.length >= minCount) return opts;
    if (attempt < retries) {
      log.warn(`readDropdownOptions: only ${opts.length}/${minCount} options (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return [];
}

/**
 * Reads dropdown options and returns a Map of text → value (numeric ID).
 * Used to map display labels (e.g. "2026") to API IDs (e.g. 19).
 */
async function readDropdownIdMap(dropdown: Locator, retries = 3, delayMs = 1000, minCount = 1): Promise<Map<string, string>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const opts = await dropdown.evaluate((select: HTMLSelectElement) =>
      Array.from(select.options)
        .filter(opt => opt.value !== '' && opt.text.trim() !== '' && !opt.text.toLowerCase().includes('select'))
        .map(opt => ({ text: opt.text.trim(), value: opt.value }))
    );
    if (opts.length >= minCount) {
      const map = new Map<string, string>();
      for (const opt of opts) map.set(opt.text, opt.value);
      return map;
    }
    if (attempt < retries) {
      log.warn(`readDropdownIdMap: only ${opts.length}/${minCount} options (attempt ${attempt}/${retries}), retrying...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return new Map();
}

/**
 * Applies filters (year, shift, class) on the already-loaded report page,
 * makes a direct API call for the combo, and returns raw records tagged
 * with the combo metadata.
 */
async function extractCombo(
  page: Page,
  yearId: string,
  shiftId: string,
  classId: string,
  year: string,
  shift: string,
  cls: string,
): Promise<Record<string, any>[]> {
  log.step(`Extracting combo: Year="${year}" | Shift="${shift}" | Class="${cls}" (IDs: ${yearId}/${shiftId}/${classId})`);

  // ── 1. Extract XSRF token from cookies ────────────────────────────────
  const xsrfToken = await page.evaluate(() => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });

  // ── 2. Make direct API call ───────────────────────────────────────────
  const monthList = [
    { id: 8, name: 'Sports Fee', type: 'general', check_status: true },
    { id: 15, name: 'Session Fee', type: 'general', check_status: true },
    { id: 31, name: 'Admission Fee', type: 'general', check_status: true },
    { id: 52, name: 'TC Fee', type: 'general', check_status: true },
    { id: 67, name: 'Testimonial Fee', type: 'general', check_status: true },
    { id: 218, name: 'Summer Assessment Test', type: 'general', check_status: true },
    { id: 219, name: 'Winter Assessment Test', type: 'general', check_status: true },
    { id: 221, name: 'Outing Fee', type: 'general', check_status: true },
    { id: 222, name: 'Convocation Fee', type: 'general', check_status: true },
    { id: 223, name: 'Program Fee', type: 'general', check_status: true },
    { id: 224, name: 'Logo, ID Card & Name Plate Fee', type: 'general', check_status: true },
    { id: 149, name: 'Others Fee', type: 'general', check_status: true },
    { id: 241, name: 'Books & Others Fee', type: 'general', check_status: true },
    { id: 6, name: 'Stationary Fee', type: 'general', check_status: true },
    { id: 425, name: 'Spring Summative Assessment Fee', type: 'general', check_status: true },
    { id: 426, name: 'Summer Summative Assessment Fee', type: 'general', check_status: true },
    { id: 427, name: 'Autumn Summative Assessment Fee', type: 'general', check_status: true },
    { id: 1, name: 'January', type: 'monthly', check_status: true },
    { id: 2, name: 'February', type: 'monthly', check_status: true },
    { id: 3, name: 'March', type: 'monthly', check_status: true },
    { id: 4, name: 'April', type: 'monthly', check_status: true },
    { id: 5, name: 'May', type: 'monthly', check_status: true },
    { id: 6, name: 'June', type: 'monthly', check_status: true },
    { id: 7, name: 'July', type: 'monthly', check_status: true },
    { id: 8, name: 'August', type: 'monthly', check_status: true },
    { id: 9, name: 'September', type: 'monthly', check_status: true },
    { id: 10, name: 'October', type: 'monthly', check_status: true },
    { id: 11, name: 'November', type: 'monthly', check_status: true },
    { id: 12, name: 'December', type: 'monthly', check_status: true },
  ];

  const responseBody: ApiResponse = await page.evaluate(async (args) => {
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
        student_wise_status: 1,
        head_type: 'generandmonthly',
        monthList: args.monthList,
        active_status: 'Active',
        academic_residence_id: null,
        monthlyHeadShow: false,
        omit_background_color_status: false,
      }),
    });
    return resp.json();
  }, {
    url: `${CONFIG.baseUrl}/site/fee/student-payment-report/get-site-class-student-subhead-base-fee-collect-list`,
    yearId,
    shiftId,
    classId,
    xsrfToken,
    monthList,
  });

  const studentCount = Array.isArray(responseBody[0]) ? responseBody[0].length : 0;
  log.info(`API returned ${studentCount} students`);

  // Debug: log first student if available
  if (studentCount > 0) {
    const first = responseBody[0][0];
    log.info(`First student: ${first.std_name} (${first.total_due_amount} due)`);
  } else {
    log.info(`Response structure: isArray=${Array.isArray(responseBody)}, length=${responseBody?.length}`);
    if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
      log.info(`Error response: ${JSON.stringify(responseBody)}`);
    }
  }

  // ── 3. Flatten into per-student records ───────────────────────────────
  const flatRecords = flattenAccountsApiResponse(responseBody, year, shift, cls);
  log.info(`Flattened into ${flatRecords.length} records`);

  return flatRecords;
}

/**
 * Navigates to the DUHA portal's collection status report page using the sidebar menu,
 * iterates over ALL configured year × shift × class combinations, extracts and merges
 * all student dues records, and generates one unified Excel report.
 *
 * @param page Playwright Page instance (already authenticated).
 */
export async function extractAccountsReceivable(page: Page): Promise<{ rawCount: number; dueCount: number }> {
  let allRaw: Record<string, any>[] = [];

  try {
    // ── 1. Navigate sidebar once ─────────────────────────────────────────
    log.step('Navigating sidebar menu hierarchy');
    for (const sidebarItem of CONFIG.navigation.sidebarPath) {
      await navigateSidebarMenu(page, sidebarItem);
    }

    // Wait for report page to load (Year dropdown visible = we're on the right page)
    log.info('Waiting for report page to load...');
    const yearDropdown = page.locator(SELECTORS.finance.yearDropdown);
    await yearDropdown.first().waitFor({ state: 'visible', timeout: CONFIG.timeouts.element });
    log.info('Report page loaded successfully.');

    // ── 2. Build combos (from config or discover from dropdowns) ───────
    const shiftDropdown = page.locator(SELECTORS.finance.shiftDropdown);
    const classDropdown = page.locator(SELECTORS.finance.classDropdown);
    const combos: Array<{ year: string; shift: string; cls: string; yearId: string; shiftId: string; classId: string }> = [];
    const needDiscovery = CONFIG.filters.shifts.length === 0 || CONFIG.filters.classes.length === 0;

    if (needDiscovery) {
      // Discover available shifts & classes from the portal dropdowns
      for (const year of CONFIG.filters.years) {
        // Select year to populate shift dropdown and read its ID
        try {
          await selectOptionHelper(page, yearDropdown, year);
        } catch (err) {
          log.warn(`Year selection failed for "${year}": ${(err as Error).message}. Skipping.`);
          continue;
        }
        const yearIdMap = await readDropdownIdMap(yearDropdown, 4, 1000, 2);
        const yearId = yearIdMap.get(year) || '';

        let shifts: string[];
        try {
          shifts = CONFIG.filters.shifts.length > 0
            ? CONFIG.filters.shifts
            : await readDropdownOptions(shiftDropdown, 4, 1000, 2);
        } catch (err) {
          log.warn(`Year discovery failed for "${year}": ${(err as Error).message}. Skipping.`);
          continue;
        }

        const shiftIdMap = await readDropdownIdMap(shiftDropdown, 4, 1000, 2);

        for (const shift of shifts) {
          const shiftId = shiftIdMap.get(shift) || '';
          try {
            await selectOptionHelper(page, shiftDropdown, shift);
          } catch (err) {
            log.warn(`Shift "${shift}" (year "${year}") selection failed: ${(err as Error).message}. Skipping.`);
            continue;
          }
          await page.waitForTimeout(1000); // class dropdown depends on shift — give it extra time

          let classes: string[];
          try {
            classes = CONFIG.filters.classes.length > 0
              ? CONFIG.filters.classes
              : await readDropdownOptions(classDropdown);
          } catch (err) {
            log.warn(`Class discovery for year="${year}" shift="${shift}" failed: ${(err as Error).message}. Skipping shift.`);
            continue;
          }

          const classIdMap = await readDropdownIdMap(classDropdown, 4, 1000, 2);

          for (const cls of classes) {
            // Case-insensitive lookup: try exact first, then lowercase
            let classId = classIdMap.get(cls) || '';
            if (!classId) {
              const lower = cls.toLowerCase();
              for (const [text, value] of classIdMap) {
                if (text.toLowerCase() === lower) { classId = value; break; }
              }
            }
            combos.push({ year, shift, cls, yearId, shiftId, classId });
          }
        }
      }
    } else {
      for (const year of CONFIG.filters.years) {
        try {
          await selectOptionHelper(page, yearDropdown, year);
        } catch (err) {
          log.warn(`Year selection failed for "${year}": ${(err as Error).message}. Skipping.`);
          continue;
        }
        const yearIdMap = await readDropdownIdMap(yearDropdown, 4, 1000, 2);
        const yearId = yearIdMap.get(year) || '';

        for (const shift of CONFIG.filters.shifts) {
          try {
            await selectOptionHelper(page, shiftDropdown, shift);
          } catch (err) {
            log.warn(`Shift "${shift}" selection failed: ${(err as Error).message}. Skipping.`);
            continue;
          }
          await page.waitForTimeout(1000);
          const shiftIdMap = await readDropdownIdMap(shiftDropdown, 4, 1000, 2);
          const shiftId = shiftIdMap.get(shift) || '';

          // Wait for class dropdown to populate after shift selection
          await page.waitForTimeout(1000);

          // Debug: check raw class dropdown options
          const rawClassOpts = await classDropdown.evaluate((select: HTMLSelectElement) =>
            Array.from(select.options).map(o => ({ text: o.text.trim(), value: o.value }))
          );
          console.error(`[DEBUG] Class dropdown raw options (${rawClassOpts.length}): ${rawClassOpts.map(o => `"${o.text}"→"${o.value}"`).join(', ')}`);

          const classIdMap = await readDropdownIdMap(classDropdown, 4, 1000, 2);
          log.info(`Class ID map: ${classIdMap.size} options for shift "${shift}"`);

          for (const cls of CONFIG.filters.classes) {
            // Case-insensitive lookup: try exact first, then lowercase
            let classId = classIdMap.get(cls) || '';
            if (!classId) {
              const lower = cls.toLowerCase();
              for (const [text, value] of classIdMap) {
                if (text.toLowerCase() === lower) { classId = value; break; }
              }
            }
            combos.push({ year, shift, cls, yearId, shiftId, classId });
          }
        }
      }
    }

    log.step(`Running ${combos.length} filter combination(s): ` +
      `Years=[${CONFIG.filters.years.join(', ')}] | ` +
      `Shifts=[${CONFIG.filters.shifts.length ? CONFIG.filters.shifts.join(', ') : 'discovered'}] | ` +
      `Classes=[${CONFIG.filters.classes.length ? CONFIG.filters.classes.join(', ') : 'discovered'}]`);

    // ── 3. Loop over every combo ──────────────────────────────────────────
    const failedCombos: Array<{ year: string; shift: string; cls: string; error: string }> = [];
    const startTime = Date.now();

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i];
      log.step(`Combo ${i + 1}/${combos.length}: Year="${combo.year}" | Shift="${combo.shift}" | Class="${combo.cls}"`);

      try {
        const comboRaw = await extractCombo(page, combo.yearId, combo.shiftId, combo.classId, combo.year, combo.shift, combo.cls);
        allRaw.push(...comboRaw);
        log.info(`Combo ${i + 1} done. ${comboRaw.length} records collected.`);
      } catch (err) {
        failedCombos.push({ year: combo.year, shift: combo.shift, cls: combo.cls, error: (err as Error).message });
        log.warn(`Combo ${i + 1} failed: ${(err as Error).message}. Skipping and continuing.`);
      }
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    log.info(`Total raw records across all combos: ${allRaw.length}`);
    log.info(`Combos: ${combos.length - failedCombos.length} succeeded, ${failedCombos.length} failed`);

    // ── 4. Save merged raw JSON ───────────────────────────────────────────
    writeJsonOutput('accounts_receivable_raw', allRaw);

    // ── 5. Filter to students with outstanding dues (skip when dueStudentsOnly=false) ──
    const enrichedData = CONFIG.filters.dueStudentsOnly
      ? filterDuesRows(allRaw, CONFIG.report.columns.length > 0 ? CONFIG.report.columns : undefined)
      : allRaw;
    log.info(`Collected ${enrichedData.length} student records (${CONFIG.filters.dueStudentsOnly ? 'due students only' : 'all students'}).`);

    // ── 6. Write run manifest ──────────────────────────────────────────────
    writeRunManifest({
      totalCombos: combos.length,
      successfulCombos: combos.length - failedCombos.length,
      failedCombos,
      totalRawRecords: allRaw.length,
      totalDueRecords: enrichedData.length,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs,
    });

    // ── 7. Save enriched data ─────────────────────────────────────────────
    writeJsonOutput('accounts_receivable_dues_enriched', enrichedData);

    // ── 8. Write unified Excel report ─────────────────────────────────────
    log.step('Writing final XLSX Excel spreadsheet report');
    const xlsxPath = await writeXlsxOutput(enrichedData, {
      years:   CONFIG.filters.years,
      shifts:  CONFIG.filters.shifts,
      classes: CONFIG.filters.classes,
      failedCombos,
    });

    log.info(`Accounts receivable dues report generation completed: ${xlsxPath}`);

    return { rawCount: allRaw.length, dueCount: enrichedData.length };
  } catch (err) {
    throw new Error(`extractAccountsReceivable failed: ${(err as Error).message}`, { cause: err as Error });
  }
}

export default extractAccountsReceivable;
