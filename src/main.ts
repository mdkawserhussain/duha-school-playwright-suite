// src/main.ts
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG, validateConfig } from './config';
import { log } from './utils/logger';
import { handleFatalError } from './utils/errorHandler';
import { authenticate } from './auth/authenticate';
import { extractAttendance } from './extractors/attendance';
import { extractAccountsReceivable, printAccountsRunSummary } from './extractors/accountsReceivable';
import { writeMetrics } from './utils/metricsCollector';
import { generateHtmlDashboard } from './reporters/htmlDashboard';
import { generateWhatsAppDashboard } from './reporters/whatsappReporter';
import { sendTelegramSummary } from './reporters/telegramNotifier';
import { BrowserContext, Page } from '@playwright/test';

// Setup process-level error listeners to prevent silent crashes (ERR-18)
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection:', reason as Error);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
  process.exit(1);
});

async function main(): Promise<void> {
  // Validate environment before touching the browser
  validateConfig();

  log.info('='.repeat(60));
  log.info('Starting School Portal Automation Suite');
  log.info('='.repeat(60));
  const runStartTime = Date.now();

  let browser: BrowserContext | null = null;
  let page: Page | null = null;
  let hasFailed = false;

  try {
    // ── 7.1.2.2  Authenticate (reuse session or login) ───────────────────
    ({ browser, page } = await authenticate());

    // ── 7.1.2.3  Attendance extraction ───────────────────────────────────
    if (CONFIG.extractors.attendance) {
      log.step('Running attendance extraction');
      await extractAttendance(page);
    } else {
      log.info('Skipping attendance extraction (disabled in config)');
    }

    // ── 7.1.2.4  Accounts receivable extraction ────────────────::::::::::
    let arCounts: { rawCount: number; dueCount: number } | undefined;
    if (CONFIG.extractors.accountsReceivable) {
      log.step('Running accounts receivable extraction');
      arCounts = await extractAccountsReceivable(page);
    } else {
      log.info('Skipping accounts receivable extraction (disabled in config)');
    }

    // ── 7.1.2.5  Done ─────────────────────────────────────────────────────
    log.info('='.repeat(60));
    log.info('All extractions completed successfully');
    log.info('='.repeat(60));

    // ── 7.1.2.6  Close browser before summary (keep summary as last output) ─
    log.info('Closing browser context cleanly...');
    if (browser) {
      await browser.close();
      browser = null;
    }

    // ── 7.1.2.7  Print run summary (last line of log) ──────────────────────
    if (arCounts) {
      printAccountsRunSummary(arCounts.rawCount, arCounts.dueCount);
    }

    // ── 7.1.2.8  Write execution metrics ────────────────────────────────
    writeMetrics();

    // ── 7.1.2.9  Generate HTML dashboard (if enabled) ───────────────────
    if (process.env.GENERATE_HTML_DASHBOARD === 'true' && arCounts) {
      try {
        const rawPath = path.join(CONFIG.directories.output, `accounts_receivable_raw_${new Date().toISOString().slice(0, 10)}.json`);
        if (fs.existsSync(rawPath)) {
          const data = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
          generateHtmlDashboard(data);
        }
      } catch (dashErr) {
        log.error('Failed to generate HTML dashboard:', dashErr);
      }
    }

    // ── 7.1.2.10  Generate WhatsApp dashboard (if enabled) ─────────────
    if (process.env.GENERATE_WHATSAPP_DASHBOARD === 'true') {
      try {
        const rawPath = path.join(CONFIG.directories.output, `accounts_receivable_raw_${new Date().toISOString().slice(0, 10)}.json`);
        const enrichedPath = path.join(CONFIG.directories.output, `accounts_receivable_dues_enriched_${new Date().toISOString().slice(0, 10)}.json`);
        const attendancePath = path.join(CONFIG.directories.output, `attendance_${new Date().toISOString().slice(0, 10)}.json`);

        const attendanceData = fs.existsSync(attendancePath) ? JSON.parse(fs.readFileSync(attendancePath, 'utf-8')) : [];
        const duesData = fs.existsSync(enrichedPath) ? JSON.parse(fs.readFileSync(enrichedPath, 'utf-8')) : [];

        generateWhatsAppDashboard(attendanceData, duesData);
      } catch (waErr) {
        log.error('Failed to generate WhatsApp dashboard:', waErr);
      }
    }

    // ── 7.1.2.11  Send Telegram notification (if enabled) ──────────────
    if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true' && arCounts) {
      const totalMs = Date.now() - runStartTime;
      await sendTelegramSummary({
        durationMs: totalMs,
        rawCount: arCounts.rawCount,
        dueCount: arCounts.dueCount,
      });
    }
  } catch (err) {
    hasFailed = true;
    // ── 7.1.2.8  Fatal error handler (captures screenshots and logs) ──────
    // Avoid double logging: authenticate() already ran handleFatalError.
    // Only run if extraction failed and page is active.
    if (page) {
      await handleFatalError(page, err as Error);
    } else {
      log.error(`Fatal orchestrator execution failure: ${(err as Error).message}`);
    }
  } finally {
    // ── 7.1.2.9  Ensure browser closed (safety net if not closed in try) ──
    if (browser) {
      log.info('Closing browser context cleanly...');
      await browser.close();
    }
    if (hasFailed) {
      log.error('Terminating process with exit code 1 due to execution failure.');
      process.exit(1);
    }
  }
}

// ── 7.1.3  Invoke at module level ─────────────────────────────────────────
main();
