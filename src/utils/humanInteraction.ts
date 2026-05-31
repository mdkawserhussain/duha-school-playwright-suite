/**
 * Human-like Interaction — wraps Playwright actions with organic mouse movements.
 *
 * Uses ghost-cursor-playwright to emulate human cursor navigation,
 * preventing Cloudflare/WAF detection on the portal.
 *
 * Only active when ENABLE_GHOST_CURSOR=true.
 */

import { Page, Locator } from '@playwright/test';
import { log } from './logger';

let ghostCursorModule: any = null;

async function getGhostCursor(page: Page) {
  if (process.env.ENABLE_GHOST_CURSOR !== 'true') return null;

  if (!ghostCursorModule) {
    try {
      ghostCursorModule = await import('ghost-cursor-playwright');
    } catch {
      log.warn('ghost-cursor-playwright not available, falling back to standard clicks');
      return null;
    }
  }

  try {
    return ghostCursorModule.createCursor(page);
  } catch {
    return null;
  }
}

/**
 * Clicks a locator with human-like mouse movement.
 */
export async function humanClick(page: Page, locator: Locator): Promise<void> {
  const cursor = await getGhostCursor(page);
  if (cursor) {
    try {
      await cursor.click(locator);
      return;
    } catch {
      // Fall through to standard click
    }
  }
  await locator.click();
}

/**
 * Types text with human-like delays between keystrokes.
 */
export async function humanType(page: Page, locator: Locator, text: string): Promise<void> {
  const cursor = await getGhostCursor(page);
  if (cursor) {
    try {
      await cursor.click(locator);
      await locator.type(text, { delay: 50 + Math.random() * 100 });
      return;
    } catch {
      // Fall through
    }
  }
  await locator.click();
  await locator.type(text, { delay: 50 + Math.random() * 100 });
}
