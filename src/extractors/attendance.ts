// src/extractors/attendance.ts
import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { SELECTORS } from '../utils/selectors';
import { extractPaginatedTable, PartialExtractionError } from '../utils/pagination';
import { writeJsonOutput } from '../utils/fileWriter';
import { withRetry } from '../utils/retry';
import { clickByText } from '../utils/consoleClick';

/**
 * Navigates to the attendance module, selects the current month,
 * optionally sets a date picker, extracts all paginated rows, and
 * writes the result to a dated JSON file.
 *
 * @param page Playwright Page instance (already authenticated).
 */
export async function extractAttendance(page: Page): Promise<void> {
  let data: Record<string, any>[] = [];
  try {
    // ── 5.1.2.1  Navigate to attendance page ──────────────────────────────
    const attendanceUrl = `${CONFIG.baseUrl}${CONFIG.paths.attendance}`;
    log.step('Navigating to attendance module');
    await withRetry(
      () => page.goto(attendanceUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeouts.navigation }),
      { label: 'Attendance page navigation' }
    );

    // Wait for the page heading to confirm we landed correctly
    await page
      .getByRole('heading', { name: /attendance/i })
      .first()
      .waitFor({ timeout: CONFIG.timeouts.element });

    log.info('Navigated to attendance module');

    // ── 5.1.2.2  Select current month ─────────────────────────────────────
    const now = new Date();
    // Build month names array so we can derive the label dynamically
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const currentMonthName = monthNames[now.getMonth()];
    const currentMonthValue = String(now.getMonth() + 1).padStart(2, '0'); // "01"–"12"

    // Locate the month dropdown (combobox / select)
    const monthDropdown = page.getByRole(
      SELECTORS.attendance.monthDropdown.role,
      { name: SELECTORS.attendance.monthDropdown.name },
    );

    const dropdownExists = (await monthDropdown.count()) > 0;
    if (dropdownExists) {
      try {
        // Try selecting by visible label first, fall back to numeric value
        try {
          await monthDropdown.selectOption({ label: currentMonthName });
        } catch {
          await monthDropdown.selectOption({ value: currentMonthValue });
        }
      } catch {
        log.info('Standard dropdown selection failed. Attempting fallback click-and-select strategy for custom combobox.');
        await clickByText(page, 'select month', async () => {
          await monthDropdown.click();
        });
        const optionItem = page.getByRole('option', { name: new RegExp(currentMonthName, 'i') })
          .or(page.getByText(currentMonthName, { exact: false }));
        await clickByText(page, currentMonthName, async () => {
          await optionItem.first().click();
        });
      }
      // Wait for the table to reload after selection
      await page
        .waitForLoadState('networkidle', { timeout: CONFIG.timeouts.networkIdle })
        .catch(() => log.warn('networkidle timed out after month selection – continuing'));

      log.info(`Selected month: ${currentMonthName}`);
    } else {
      log.warn('Month dropdown not found – skipping month selection');
    }

    // ── 5.1.2.3  Handle optional date picker ──────────────────────────────
    const datePicker = page.getByRole(SELECTORS.attendance.datePicker.role, { name: SELECTORS.attendance.datePicker.name });
    const datePickerExists = (await datePicker.count()) > 0;

    if (datePickerExists) {
      log.info('Date picker detected – setting date range for current month');

      // First day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      // Last day of current month
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const toInputValue = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Attempt to fill one or two date inputs
      const dateInputs = datePicker;
      const inputCount = await dateInputs.count();

      if (inputCount >= 2) {
        await dateInputs.nth(0).evaluate((el) => el.removeAttribute('readonly'));
        await dateInputs.nth(0).fill(toInputValue(firstDay));
        await dateInputs.nth(1).evaluate((el) => el.removeAttribute('readonly'));
        await dateInputs.nth(1).fill(toInputValue(lastDay));
      } else if (inputCount === 1) {
        await dateInputs.first().evaluate((el) => el.removeAttribute('readonly'));
        await dateInputs.first().fill(toInputValue(firstDay));
      }

      // Wait for table reload
      await page
        .waitForLoadState('networkidle', { timeout: CONFIG.timeouts.networkIdle })
        .catch(() => log.warn('networkidle timed out after date picker update – continuing'));
    }

    // ── 5.1.2.4  Extract table data ───────────────────────────────────────
    log.step('Extracting attendance table data');
    data = await extractPaginatedTable(page, {
      tableSelector: SELECTORS.attendance.dataTable,
    });

    log.info(`Extracted ${data.length} attendance records`);

    // ── 5.1.2.5  Write output ─────────────────────────────────────────────
    writeJsonOutput('attendance', data);
    log.info('Attendance data saved');
  } catch (err) {
    if (err instanceof PartialExtractionError) {
      const partialData = err.partialResults;
      if (partialData && partialData.length > 0) {
        log.warn(`Saving ${partialData.length} partial attendance records before failure.`);
        writeJsonOutput('attendance_partial', partialData);
      }
    }
    // Re-throw with context preserving the original cause
    throw new Error(`extractAttendance failed: ${(err as Error).message}`, { cause: err as Error });
  }
}

export default extractAttendance;
