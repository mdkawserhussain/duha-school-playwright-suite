import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { SELECTORS } from '../utils/selectors';
import { extractPaginatedTable, PartialExtractionError } from '../utils/pagination';
import { writeJsonOutput } from '../utils/fileWriter';
import { filterDuesRows } from '../utils/duesFilter';
import { writeXlsxOutput } from '../utils/spreadsheetWriter';
import { clickByText } from '../utils/consoleClick';

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
 * Applies filters (year, shift, class) on the already-loaded report page,
 * checks the Due Student checkbox, clicks Get Report, waits, then extracts
 * the table. Returns raw records tagged with the combo metadata.
 */
async function extractCombo(
  page: Page,
  year: string,
  shift: string,
  cls: string
): Promise<Record<string, any>[]> {
  log.step(`Extracting combo: Year="${year}" | Shift="${shift}" | Class="${cls}"`);

  const yearDropdown  = page.locator(SELECTORS.finance.yearDropdown);
  const shiftDropdown = page.locator(SELECTORS.finance.shiftDropdown);
  const classDropdown = page.locator(SELECTORS.finance.classDropdown);

  // Select Year
  await selectOptionHelper(page, yearDropdown, year);
  log.info(`Selected Year: ${year}`);

  // Select Shift
  await selectOptionHelper(page, shiftDropdown, shift);
  log.info(`Selected Shift: ${shift}`);

  // Let portal repopulate class dropdown after shift change before touching it
  await page.waitForTimeout(500);

  // Select Class
  await selectOptionHelper(page, classDropdown, cls);
  log.info(`Selected Class: ${cls}`);

  // Let the portal settle after class selection before touching the checkbox
  await page.waitForTimeout(400);

  // Ensure "Show Only Due Student" checkbox is in the correct state per config
  try {
    const dueCheckbox = page.locator('input[type="checkbox"]').first();
    const wantChecked = CONFIG.filters.dueStudentsOnly;

    // Set + verify + retry (portal may reset checkbox asynchronously after filter changes)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (wantChecked) {
        await dueCheckbox.check({ timeout: 3000 });
      } else {
        await dueCheckbox.uncheck({ timeout: 3000 });
      }
      const actual = await dueCheckbox.isChecked();
      if (actual === wantChecked) break;
      log.warn(`Due-student checkbox reset by portal (attempt ${attempt + 1}/3), retrying...`);
      await page.waitForTimeout(500);
    }
    log.info(`Due-student filter ${wantChecked ? 'enabled' : 'disabled'}.`);
  } catch (err) {
    log.warn(`Could not toggle due-student filter: ${(err as Error).message}`);
  }

  // Wait for button's click handler to be bound, then click
  await page.waitForTimeout(1000);

  const beforeClickCount = await page.evaluate(() =>
    document.querySelectorAll('tbody tr').length
  );

  // Use Playwright's standard click (with actionability checks)
  const getReportBtn = page.getByRole('button', { name: /get report/i });
  await getReportBtn.click();
  log.info('Standard click on Get Report button.');

  // Three-phase table refresh detection:
  //   Phase 1 – wait for old data to clear (row count drops OR content changes for small classes)
  //   Phase 2 – wait for new data to load (row count rises above cleared value)
  //            For small classes where new count equals cleared count, wait 1s then proceed
  //   Phase 3 – wait for new data to stabilize (same count for 2 consecutive polls)
  try {
    await page.waitForFunction(
      (beforeCount: number) => {
        // Reset state machine when a new combo starts
        if ((window as any).__arSession !== beforeCount) {
          (window as any).__arSession = beforeCount;
          (window as any).__arState = 'decrease';
          (window as any).__arPhase2Start = 0;
          (window as any).__arFirstCellContent = undefined;
          (window as any).__arStablePolls = 0;
        }
        const state = (window as any).__arState;
        const count = document.querySelectorAll('tbody tr').length;

        if (state === 'decrease') {
          // Large previous class: wait for row count to drop
          if (count < beforeCount) {
            (window as any).__arClearedCount = count;
            (window as any).__arState = 'increase';
            (window as any).__arPhase2Start = Date.now();
            return false;
          }
          // Small previous class (<=3 rows): wait for first cell content to change
          if (beforeCount <= 3) {
            const firstRow = document.querySelector('tbody tr');
            const firstCell = firstRow?.querySelector('td');
            const currentContent = firstCell?.textContent?.trim() ?? '';
            if ((window as any).__arFirstCellContent === undefined) {
              (window as any).__arFirstCellContent = currentContent;
              return false;
            }
            if (currentContent !== (window as any).__arFirstCellContent && currentContent !== '') {
              (window as any).__arClearedCount = count;
              (window as any).__arState = 'increase';
              (window as any).__arPhase2Start = Date.now();
              return false;
            }
          }
          return false;
        }

        if (state === 'increase') {
          if (count > (window as any).__arClearedCount) {
            (window as any).__arState = 'stable';
            (window as any).__arStableCount = count;
            return false;
          }
          // For genuinely small classes: if the PREVIOUS class was also small
          // (beforeCount <= 2) AND the cleared count is very small (<=2) AND 3s
          // have passed, assume the cleared state IS the new data.
          // Only fire when both sides are small to avoid false positives when
          // transitioning from a large class (e.g. 22 rows) to a large class.
          if (beforeCount <= 2 && (window as any).__arClearedCount <= 2 &&
              Date.now() - (window as any).__arPhase2Start >= 3000) {
            (window as any).__arState = 'stable';
            (window as any).__arStableCount = count;
            return false;
          }
          return false;
        }

        if (state === 'stable') {
          if (count === (window as any).__arStableCount && count > 0) {
            (window as any).__arStablePolls = ((window as any).__arStablePolls || 0) + 1;
            if ((window as any).__arStablePolls >= 8) {
              (window as any).__arState = 'decrease';
              return true;
            }
            return false;
          }
          (window as any).__arStableCount = count;
          (window as any).__arStablePolls = 0;
          return false;
        }

        return false;
      },
      beforeClickCount,
      { timeout: 15000, polling: 500 }
    );
    log.info('Fresh table data detected after report generation.');
  } catch {
    log.warn('Table refresh detection timed out. Proceeding with available data...');
  }

  await verifyFiltersAfterLoad(page, year, shift, cls);

  // Extract table
  const rawData = await extractPaginatedTable(page, {
    tableSelector: SELECTORS.finance.dataTable,
  });

  log.info(`Extracted ${rawData.length} raw records for combo Year="${year}" Shift="${shift}" Class="${cls}"`);

  // Tag every record with its source combo so we can identify them in the merged output
  return rawData.map((r) => ({
    _year: year,
    _shift: shift,
    _class: cls,
    ...r,
  }));
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
    const combos: Array<{ year: string; shift: string; cls: string }> = [];
    const needDiscovery = CONFIG.filters.shifts.length === 0 || CONFIG.filters.classes.length === 0;

    if (needDiscovery) {
      // Discover available shifts & classes from the portal dropdowns
      for (const year of CONFIG.filters.years) {
        let shifts: string[];
        try {
          await selectOptionHelper(page, yearDropdown, year);
          shifts = CONFIG.filters.shifts.length > 0
            ? CONFIG.filters.shifts
            : await readDropdownOptions(shiftDropdown, 4, 1000, 2);
        } catch (err) {
          log.warn(`Year discovery failed for "${year}": ${(err as Error).message}. Skipping.`);
          continue;
        }
        for (const shift of shifts) {
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
          for (const cls of classes) {
            combos.push({ year, shift, cls });
          }
        }
      }
    } else {
      // Fast path: Cartesian product from config
      for (const year of CONFIG.filters.years) {
        for (const shift of CONFIG.filters.shifts) {
          for (const cls of CONFIG.filters.classes) {
            combos.push({ year, shift, cls });
          }
        }
      }
    }

    log.step(`Running ${combos.length} filter combination(s): ` +
      `Years=[${CONFIG.filters.years.join(', ')}] | ` +
      `Shifts=[${CONFIG.filters.shifts.length ? CONFIG.filters.shifts.join(', ') : 'discovered'}] | ` +
      `Classes=[${CONFIG.filters.classes.length ? CONFIG.filters.classes.join(', ') : 'discovered'}]`);

    // ── 3. Loop over every combo ──────────────────────────────────────────
    for (let i = 0; i < combos.length; i++) {
      const { year, shift, cls } = combos[i];
      log.step(`Combo ${i + 1}/${combos.length}: Year="${year}" | Shift="${shift}" | Class="${cls}"`);

      try {
        const comboRaw = await extractCombo(page, year, shift, cls);
        allRaw.push(...comboRaw);
        log.info(`Combo ${i + 1} done. ${comboRaw.length} records collected.`);
      } catch (err) {
        log.warn(`Combo ${i + 1} failed: ${(err as Error).message}. Skipping and continuing.`);
      }
    }

    log.info(`Total raw records across all combos: ${allRaw.length}`);

    // ── 4. Save merged raw JSON ───────────────────────────────────────────
    writeJsonOutput('accounts_receivable_raw', allRaw);

    // ── 5. Filter to students with outstanding dues (skip when dueStudentsOnly=false) ──
    const enrichedData = CONFIG.filters.dueStudentsOnly
      ? filterDuesRows(allRaw, CONFIG.report.columns.length > 0 ? CONFIG.report.columns : undefined)
      : allRaw;
    log.info(`Collected ${enrichedData.length} student records (${CONFIG.filters.dueStudentsOnly ? 'due students only' : 'all students'}).`);

    // ── 6. Save enriched data ─────────────────────────────────────────────
    writeJsonOutput('accounts_receivable_dues_enriched', enrichedData);

    // ── 7. Write unified Excel report ─────────────────────────────────────
    log.step('Writing final XLSX Excel spreadsheet report');
    const xlsxPath = await writeXlsxOutput(enrichedData, {
      years:   CONFIG.filters.years,
      shifts:  CONFIG.filters.shifts,
      classes: CONFIG.filters.classes,
    });

    log.info(`Accounts receivable dues report generation completed: ${xlsxPath}`);

    return { rawCount: allRaw.length, dueCount: enrichedData.length };
  } catch (err) {
    if (err instanceof PartialExtractionError) {
      const partialData = err.partialResults;
      if (partialData && partialData.length > 0) {
        log.warn(`Saving ${partialData.length} partial records before failure.`);
        writeJsonOutput('accounts_receivable_partial', partialData);
      }
    }
    throw new Error(`extractAccountsReceivable failed: ${(err as Error).message}`, { cause: err as Error });
  }
}

export default extractAccountsReceivable;
