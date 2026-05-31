// src/auth/login.ts
import { Page } from "@playwright/test";
import { log } from "../utils/logger";
import { SELECTORS } from "../utils/selectors";
import { CONFIG } from "../config";
import { withRetry } from "../utils/retry";

/**
 * Performs user login using semantic selectors.
 *
 * @param page Playwright Page instance.
 * @param username Username credential.
 * @param password Password credential.
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  try {
    log.info("Attempting login…");

    // Navigate to the login page (avoid navigation if redirect already put us there)
    const loginUrl = CONFIG.paths.login 
      ? (CONFIG.paths.login.startsWith('http') ? CONFIG.paths.login : `${CONFIG.baseUrl}${CONFIG.paths.login}`)
      : `${CONFIG.baseUrl}/login`;
    const currentUrl = page.url();
    // Precise comparison to avoid false positives (e.g. base URL matching raw path)
    const isAlreadyOnLogin = currentUrl.endsWith('/login') || currentUrl === loginUrl;
 
    if (!isAlreadyOnLogin) {
      log.info(`Navigating to login page: ${loginUrl}`);
      await withRetry(
        () => page.goto(loginUrl, {
          waitUntil: "domcontentloaded",
          timeout: CONFIG.timeouts.navigation,
        }),
        { label: "Login page navigation" }
      );
    } else {
      log.info("Browser is already on the login page/redirect. Skipping redundant navigation step.");
    }

    // Fill credentials using robust selectors (placeholder, label, or input type)
    const usernameLocator = page.getByPlaceholder(SELECTORS.login.usernameInput.placeholder)
      .or(page.getByLabel(SELECTORS.login.usernameInput.name))
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[type="text"]'))
      .first();

    const passwordLocator = page.getByPlaceholder(SELECTORS.login.passwordInput.placeholder)
      .or(page.getByLabel(SELECTORS.login.passwordInput.name))
      .or(page.locator('input[type="password"]'))
      .first();

    await usernameLocator.fill(username);
    await passwordLocator.fill(password);

    // Click submit and wait for navigation to complete
    await Promise.all([
      page.waitForURL("**/dashboard**", { timeout: CONFIG.timeouts.navigation }),
      page.getByRole("button", { name: SELECTORS.login.submitButton.name }).click(),
    ]);

    // Verify successful login – check for breadcrumb element
    const dashboardIndicator = page.locator('.breadcrumb').first();
    await dashboardIndicator.waitFor({ timeout: CONFIG.timeouts.element });

    log.info("Login successful.");
  } catch (err) {
    const errMsg = (err as Error).message || '';

    if (errMsg.toLowerCase().includes('timeout') && page.url().includes('/login')) {
      log.error('Portal login page did not load. Check PORTAL_BASE_URL and network connectivity.');
    } else if (errMsg.toLowerCase().includes('timeout')) {
      log.error('Credentials may be incorrect. Check PORTAL_USERNAME and PORTAL_PASSWORD in .env.');
    } else if (errMsg.toLowerCase().includes('waiting for selector') || errMsg.toLowerCase().includes('no element found')) {
      log.error('Portal UI may have changed. Check selectors.ts for updated field labels.');
    } else {
      log.error('Login failed with unrecognized error:', err as Error);
    }
    throw err;
  }
}

export default login;
