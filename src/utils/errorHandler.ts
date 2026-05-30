import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from './logger';

/**
 * Captures diagnostic screenshots on failure.
 * Does NOT call process.exit(1), allowing the main orchestrator to clean up browser resources cleanly first.
 */
export async function handleFatalError(page: Page | null, error: Error): Promise<void> {
  // Prevent any credentials from being logged accidentally
  let cleanErrorMessage = error.message;
  if (CONFIG.credentials.username) {
    cleanErrorMessage = cleanErrorMessage.replaceAll(CONFIG.credentials.username, '[REDACTED_USERNAME]');
  }
  if (CONFIG.credentials.password) {
    cleanErrorMessage = cleanErrorMessage.replaceAll(CONFIG.credentials.password, '[REDACTED_PASSWORD]');
  }

  log.error(`Fatal execution failure: ${cleanErrorMessage}`);

  if (page) {
    try {
      // Clear any filled credential fields to prevent screenshot exposure (NFR-1.3)
      try {
        await page.evaluate(() => {
          document.querySelectorAll('input[type="password"], input[type="email"], input[name*="user"], input[name*="pass"]')
            .forEach((el: any) => { el.value = ''; });
        });
      } catch { /* page may not be navigable or fully loaded — best-effort */ }

      // Ensure the errors directory exists
      if (!fs.existsSync(CONFIG.directories.errors)) {
        fs.mkdirSync(CONFIG.directories.errors, { recursive: true });
      }

      // Generate a clean safe timestamp (avoiding colons which break on some OS filesystems)
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const screenshotFilename = `error_${timestamp}.png`;
      const screenshotPath = path.join(CONFIG.directories.errors, screenshotFilename);

      log.info(`Attempting to capture emergency error screenshot to: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 5000 });
      log.info(`Emergency screenshot successfully saved.`);
    } catch (screenshotError) {
      log.error('Failed to capture error screenshot:', screenshotError);
    }
  }
}
