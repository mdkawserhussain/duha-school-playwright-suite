import { Page, Locator } from '@playwright/test';
import { log } from './logger';
import { SELECTORS } from './selectors';
import { CONFIG } from '../config';

export class PartialExtractionError extends Error {
  public partialResults: Record<string, any>[];
  public cause: Error;

  constructor(message: string, partialResults: Record<string, any>[], cause: Error) {
    super(message);
    this.name = 'PartialExtractionError';
    this.partialResults = partialResults;
    this.cause = cause;
  }
}

export interface ExtractTableOptions {
  tableSelector: string | { role: 'table' };
  rowProcessor?: (rowLocator: Locator, page: Page, recordIndex: number) => Promise<Record<string, any>>;
}

export async function extractPaginatedTable(
  page: Page,
  options: ExtractTableOptions
): Promise<Record<string, any>[]> {
  const { tableSelector, rowProcessor } = options;
  const results: Record<string, any>[] = [];

  try {
    log.info('Initiating paginated table parsing loop...');

    const tableLocator = typeof tableSelector === 'string' 
      ? page.locator(tableSelector)
      : page.getByRole('table');
    
    await tableLocator.first().waitFor({ state: 'visible', timeout: 15000 });

    let hasNextPage = true;
    let pageCount = 1;
    const MAX_PAGES = 100;
    const headers: string[] = [];

    while (hasNextPage && pageCount <= MAX_PAGES) {
      log.info(`Parsing active table page #${pageCount}...`);

      // 1. Header extraction (batched into one evaluate)
      if (pageCount === 1) {
        const headerTexts = await tableLocator.evaluate(table => {
          const cells = table.querySelectorAll('th, [role="columnheader"]');
          return Array.from(cells).map(c =>
            (c.textContent || '').replace(/\s+/g, ' ').trim()
          );
        });
        const seenHeaders: Record<string, number> = {};
        for (let i = 0; i < headerTexts.length; i++) {
          const text = headerTexts[i];
          let headerKey = text || `column_${i}`;
          if (seenHeaders[headerKey] !== undefined) {
            seenHeaders[headerKey]++;
            headerKey = `${headerKey}_${seenHeaders[headerKey]}`;
          } else {
            seenHeaders[headerKey] = 0;
          }
          headers.push(headerKey);
        }
        log.info(`Table columns identified: [ ${headers.join(' | ')} ]`);
      }

      // 2. Row extraction
      const rowLocator = tableLocator.locator('tbody tr');
      const rowCount = await rowLocator.count();
      log.info(`Found ${rowCount} rows on current page.`);

      // Capture first cell signature for pagination detection
      let firstCellSignatureBefore = '';
      if (rowCount > 0) {
        firstCellSignatureBefore = await rowLocator.first().evaluate(
          row => row.querySelector('td, [role="gridcell"]')?.textContent?.trim() || ''
        );
      }

      if (rowProcessor) {
        // Per-row approach (rowProcessor needs a per-row Locator)
        for (let i = 0; i < rowCount; i++) {
          const currentRow = rowLocator.nth(i);
          const isHeaderRow = await currentRow.locator('th').count() > 0;
          if (isHeaderRow) continue;
          const cellTexts = await currentRow.evaluate(row =>
            Array.from(row.querySelectorAll('td, [role="gridcell"]'))
              .map(c => c.textContent?.trim() || '')
          );
          const record: Record<string, any> = {};
          for (let j = 0; j < cellTexts.length; j++) {
            record[headers[j] || `cell_${j}`] = cellTexts[j];
          }
          try {
            const enrichedData = await rowProcessor(currentRow, page, results.length);
            Object.assign(record, enrichedData);
          } catch (processorError) {
            log.warn(`Row processor hook failed at row index ${i}: ${(processorError as Error).message}`);
          }
          results.push(record);
        }
      } else {
        // Batch all rows into one evaluate (single bridge crossing)
        if (rowCount > 0) {
          const rowsData = await tableLocator.evaluate((table, hdrs) => {
            const rows = table.querySelectorAll('tbody tr');
            return Array.from(rows).map(row => {
              const cells = row.querySelectorAll('td, [role="gridcell"]');
              if (cells.length === 0) return null;
              const record: Record<string, string> = {};
              cells.forEach((cell, j) => {
                record[hdrs[j] || `cell_${j}`] = cell.textContent?.trim() || '';
              });
              return record;
            }).filter(Boolean) as Array<Record<string, string>>;
          }, headers);
          results.push(...rowsData);
        }
      }

      // 3. Pagination navigation
      const nextButton = page.getByRole(SELECTORS.pagination.nextButton.role, {
        name: SELECTORS.pagination.nextButton.name,
      });

      const nextButtonExists = (await nextButton.count()) > 0;
      if (nextButtonExists) {
        const isVisible = await nextButton.isVisible();
        const isDisabled = await nextButton.getAttribute('disabled') !== null || 
                           await nextButton.getAttribute('aria-disabled') === 'true' ||
                           (await nextButton.getAttribute('class'))?.includes('disabled');

        if (isVisible && !isDisabled) {
          log.info('Advancing to next table page...');
          await nextButton.click();

          if (firstCellSignatureBefore) {
            try {
              const tableSearchBase = typeof tableSelector === 'string' ? tableSelector : 'table';
              await page.waitForFunction(
                (args) => {
                  const cell = document.querySelector(`${args.selector} tbody tr td`);
                  return cell && cell.textContent?.trim() !== args.previousValue;
                },
                { selector: tableSearchBase, previousValue: firstCellSignatureBefore },
                { timeout: 2000 }
              );
            } catch {
              log.warn('State signature change not detected. Proceeding using networkidle.');
            }
          }

          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            log.warn('Network did not settle to idle status after clicking next, continuing...');
          });
          
          pageCount++;
        } else {
          log.info('Pagination next button is disabled or inactive. Parsing complete.');
          hasNextPage = false;
        }
      } else {
        log.info('No pagination controls detected. Single page processing completed.');
        hasNextPage = false;
      }
    }

    if (pageCount > MAX_PAGES) {
      log.warn(`Pagination safety limit reached (${MAX_PAGES} pages). Returning ${results.length} records collected so far.`);
    }

    return results;
  } catch (error) {
    if (error instanceof PartialExtractionError) {
      throw error;
    }
    throw new PartialExtractionError(
      `Failed to extract paginated table structure: ${(error as Error).message}`,
      results,
      error as Error
    );
  }
}
