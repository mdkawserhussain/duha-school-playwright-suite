import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from './logger';

const CLICKABLE_SELECTORS = ['a', 'li', 'span', 'div', 'p', 'button', 'label'];

export async function triggerConsoleClick(page: Page, text: string): Promise<void> {
  await page.evaluate(({ selectors, t }) => {
    const words = t.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      const el = elements.find(e => {
        const content = e.textContent?.trim().toLowerCase() || '';
        return words.every(word => content.includes(word));
      });
      if (el) {
        (el as HTMLElement).click();
        return;
      }
    }
    throw new Error(`Could not find any element containing text: ${t}`);
  }, { selectors: CLICKABLE_SELECTORS, t: text.toLowerCase() });
}

export async function clickByText(page: Page, text: string, fallback: () => Promise<void>): Promise<void> {
  if (CONFIG.navigation.consoleMode) {
    try {
      log.info(`[Console Mode] Clicking element by text: "${text}"`);
      await triggerConsoleClick(page, text);
      return;
    } catch {
      log.warn(`Console click for "${text}" failed, falling back to standard click`);
    }
  }
  await fallback();
}
