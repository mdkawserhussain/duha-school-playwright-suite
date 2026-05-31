// src/auth/authenticate.ts
import * as fs from 'fs';
import { chromium, BrowserContext, Page } from "@playwright/test";
import { CONFIG } from "../config";
import { log } from "../utils/logger";
import { handleFatalError } from "../utils/errorHandler";
import { SELECTORS } from "../utils/selectors";
import { login } from "./login";

/**
 * Launches a persistent Playwright browser context, re‑uses an existing session if possible,
 * otherwise performs a fresh login.
 *
 * @returns An object containing the browser context and the active page.
 */
export async function authenticate(): Promise<{ browser: BrowserContext; page: Page }> {
  const headless = process.env.HEADED !== "true"; // default to headless unless HEADED=true
  const launchOptions = {
    headless,
    viewport: { width: 1280, height: 720 },
  };

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    log.info("Launching persistent browser context…");
    context = await chromium.launchPersistentContext(CONFIG.directories.userData, launchOptions);

    // Restrict user-data directory permissions to owner-only (0700)
    try {
      fs.chmodSync(CONFIG.directories.userData, 0o700);
    } catch { /* best-effort; directory may not exist yet */ }

    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();

    // Helper to verify an existing authenticated session.
    const isSessionValid = async (activePage: Page, performNavigation = true): Promise<boolean> => {
      try {
        if (performNavigation) {
          const dashboardUrl = `${CONFIG.baseUrl}${CONFIG.paths.dashboard}`;
          await activePage.goto(dashboardUrl, {
            waitUntil: "domcontentloaded",
            timeout: CONFIG.timeouts.navigation,
          });
          // Brief pause for Vue router to settle.
          await activePage.waitForTimeout(CONFIG.timeouts.settleDelay);
        }
        // Check URL still contains dashboard path.
        const url = activePage.url();
        if (!url.includes("/dashboard")) {
          return false;
        }
        // Look for a known dashboard element.
        const dashboardIndicator = activePage.locator('.breadcrumb').first();
        await dashboardIndicator.waitFor({ timeout: 3000 });
        return true;
      } catch (sessionError) {
        log.warn(`Session validation check failed: ${(sessionError as Error).message}`);
        return false;
      }
    };

    if (await isSessionValid(page, true)) {
      log.info("Existing session detected – reusing.");
      return { browser: context, page };
    }

    log.info("Session invalid or absent – performing login.");
    // Ensure login credentials are present.
    if (!CONFIG.credentials.username || !CONFIG.credentials.password) {
      throw new Error("Missing portal credentials in environment variables.");
    }
    await login(page, CONFIG.credentials.username, CONFIG.credentials.password);

    // Verify login succeeded without performing a redundant navigation to dashboard
    if (!(await isSessionValid(page, false))) {
      throw new Error("Login appeared to succeed but dashboard verification failed.");
    }

    log.info("Authentication flow completed successfully.");
    return { browser: context, page };
  } catch (err) {
    log.error("Authentication failure:", err as Error);
    await handleFatalError(page, err as Error);
    if (context) {
      try {
        await context.close();
      } catch { /* swallow close errors during failure cleanup */ }
    }
    throw err;
  }
}

export default authenticate;
