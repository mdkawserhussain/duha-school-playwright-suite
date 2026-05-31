/**
 * Selector Health Check — verifies portal CSS/ARIA selectors are still valid.
 *
 * Logs in, navigates to the finance report page, and checks that all
 * critical UI elements exist. Exits with code 0 if all pass, 1 if any fail.
 *
 * Usage:
 *   npx tsx src/selectorHealthCheck.ts
 */

import { authenticate } from './auth/authenticate';
import { log } from './utils/logger';
import { SELECTORS } from './utils/selectors';
import { clickByText } from './utils/consoleClick';
import { Page } from '@playwright/test';

interface CheckResult {
  name: string;
  selector: string;
  found: boolean;
  details?: string;
}

async function checkSelector(
  page: Page,
  name: string,
  selector: string | { role: string; name?: RegExp }
): Promise<CheckResult> {
  try {
    let count: number;
    if (typeof selector === 'string') {
      count = await page.locator(selector).count();
    } else {
      const role = selector.role as any;
      count = selector.name
        ? await page.getByRole(role, { name: selector.name }).count()
        : await page.getByRole(role).count();
    }
    return {
      name,
      selector: typeof selector === 'string' ? selector : `${selector.role}(${selector.name || '*'})`,
      found: count > 0,
      details: count > 0 ? `Found ${count} element(s)` : 'NOT FOUND',
    };
  } catch (err) {
    return {
      name,
      selector: typeof selector === 'string' ? selector : `${selector.role}(${selector.name || '*'})`,
      found: false,
      details: `Error: ${(err as Error).message}`,
    };
  }
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Selector Health Check');
  log.info('='.repeat(60));

  const results: CheckResult[] = [];
  let browser;

  try {
    // ── Step 1: Authenticate ─────────────────────────────────────────────
    log.step('Step 1: Authenticating...');
    const auth = await authenticate();
    browser = auth.browser;
    const page = auth.page;

    // ── Step 2: Check login page selectors ───────────────────────────────
    log.step('Step 2: Checking login page selectors...');
    // We're already past login, but we can still report these
    results.push({ name: 'Login username input', selector: 'usernameInput', found: true, details: 'Passed login (assumed working)' });
    results.push({ name: 'Login password input', selector: 'passwordInput', found: true, details: 'Passed login (assumed working)' });
    results.push({ name: 'Login submit button', selector: 'submitButton', found: true, details: 'Passed login (assumed working)' });

    // ── Step 3: Check dashboard selectors ────────────────────────────────
    log.step('Step 3: Checking dashboard selectors...');
    results.push(await checkSelector(page, 'Dashboard heading', SELECTORS.dashboard.heading));
    results.push(await checkSelector(page, 'User avatar', SELECTORS.dashboard.userAvatar));

    // ── Step 4: Navigate to finance report page ──────────────────────────
    log.step('Step 4: Navigating to finance report page...');
    try {
      const sidebarPath = SELECTORS.finance as any;
      const noop = async () => {};
      // Try clicking sidebar items
      await clickByText(page, 'Fee Management', noop);
      await page.waitForTimeout(500);
      await clickByText(page, 'Fee Report', noop);
      await page.waitForTimeout(500);
      await clickByText(page, 'Payment Report', noop);
      await page.waitForTimeout(500);
      await clickByText(page, 'Class & Student & Subhead Wise Collection Status', noop);
      await page.waitForTimeout(2000);
      log.info('Navigation to finance report page successful');
    } catch (err) {
      log.warn(`Navigation to finance page failed: ${(err as Error).message}`);
      log.warn('Finance selectors may not be testable without navigation');
    }

    // ── Step 5: Check finance page selectors ─────────────────────────────
    log.step('Step 5: Checking finance page selectors...');
    results.push(await checkSelector(page, 'Year dropdown', SELECTORS.finance.yearDropdown));
    results.push(await checkSelector(page, 'Shift dropdown', SELECTORS.finance.shiftDropdown));
    results.push(await checkSelector(page, 'Class dropdown', SELECTORS.finance.classDropdown));
    results.push(await checkSelector(page, 'Due-only checkbox', SELECTORS.finance.dueOnlyCheckbox));
    results.push(await checkSelector(page, 'Get Report button', SELECTORS.finance.getReportButton));

    // ── Step 6: Check attendance page selectors ──────────────────────────
    log.step('Step 6: Checking attendance page selectors...');
    results.push(await checkSelector(page, 'Month dropdown', SELECTORS.attendance.monthDropdown));
    results.push(await checkSelector(page, 'Date picker', SELECTORS.attendance.datePicker));
    results.push(await checkSelector(page, 'Data table', SELECTORS.attendance.dataTable));

    // ── Step 7: Check pagination selectors ───────────────────────────────
    log.step('Step 7: Checking pagination selectors...');
    results.push(await checkSelector(page, 'Next page button', SELECTORS.pagination.nextButton));

    // ── Summary ──────────────────────────────────────────────────────────
    const passed = results.filter(r => r.found).length;
    const failed = results.filter(r => !r.found).length;

    log.info('');
    log.info('='.repeat(60));
    log.info(`RESULTS: ${passed} passed, ${failed} failed (${results.length} total)`);
    log.info('='.repeat(60));

    for (const r of results) {
      const icon = r.found ? '✓' : '✗';
      log.info(`  ${icon} ${r.name}: ${r.details}`);
    }

    if (failed > 0) {
      log.warn('');
      log.warn(`${failed} selector(s) not found. The portal UI may have changed.`);
      log.warn('Review the selectors in src/utils/selectors.ts and update if needed.');
      process.exit(1);
    } else {
      log.info('');
      log.info('All selectors healthy!');
    }

    await browser.close();
  } catch (err) {
    log.error(`Health check failed: ${(err as Error).message}`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();
