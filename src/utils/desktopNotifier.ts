/**
 * Desktop Notifier — sends OS notification on run completion.
 *
 * Uses node-notifier to display a native notification bubble with
 * run summary (duration, records extracted, failures).
 */

import * as notifier from 'node-notifier';
import { log } from './logger';
import { formatDuration } from './formatHelpers';

interface NotifyOptions {
  durationMs: number;
  rawCount: number;
  dueCount: number;
  failedCombos: number;
}

/**
 * Sends a desktop notification with run summary.
 */
export function sendDesktopNotification(opts: NotifyOptions): void {
  if (process.env.ENABLE_DESKTOP_NOTIFICATIONS !== 'true') return;

  try {
    const title = opts.failedCombos > 0
      ? 'School Portal Scraper (partial)'
      : 'School Portal Scraper';

    const message = [
      `Duration: ${formatDuration(opts.durationMs)}`,
      `Raw records: ${opts.rawCount}`,
      `Due students: ${opts.dueCount}`,
      opts.failedCombos > 0 ? `Failed combos: ${opts.failedCombos}` : '',
    ].filter(Boolean).join('\n');

    notifier.notify({
      title,
      message,
      sound: opts.failedCombos > 0,
      wait: false,
    });

    log.info('Desktop notification sent');
  } catch (err) {
    log.warn(`Desktop notification failed: ${(err as Error).message}`);
  }
}
