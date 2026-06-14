// scripts/run-financial.ts
// Quick script to run the financial extractor
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { authenticate } from '../src/auth/authenticate';
import { extractFinancialData } from '../src/extractors/financialExtractor';
import { generateExcelReport } from '../src/utils/financialReports';
import { log } from '../src/utils/logger';
import type { LedgerResponse, CashFlowStatement, FeeCollectionSummary } from '../src/types/FinancialReport';

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

async function runFinancial() {
  // Get date parameters from environment or use defaults
  const fromDate = process.env.FINANCIAL_FROM_DATE || '2026-01-01';
  const toDate = process.env.FINANCIAL_TO_DATE || '2026-01-31';
  const status = process.env.FINANCIAL_STATUS || 'approved';

  log.info(`Running financial extractor for ${fromDate} to ${toDate} (status: ${status})`);

  let browser = null;
  let page = null;

  try {
    // Authenticate
    const auth = await authenticate();
    browser = auth.browser;
    page = auth.page;

    // Run extractor
    const results = await extractFinancialData(page, {
      from_date: fromDate,
      to_date: toDate,
      status
    });

    log.info(`Financial extraction complete. ${results.length} ledger entries processed.`);

    // Generate Excel report
    log.info('Generating Excel report...');
    
    // Load the generated JSON files
    const cashFlowPath = path.join(OUTPUT_DIR, 'financial_cash_flow_*.json');
    const feeCollectionPath = path.join(OUTPUT_DIR, 'financial_fee_collection_*.json');
    
    // Find latest files
    const cashFlowFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('financial_cash_flow_')).sort().reverse();
    const feeCollectionFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('financial_fee_collection_')).sort().reverse();
    
    if (cashFlowFiles.length === 0 || feeCollectionFiles.length === 0) {
      log.warn('Could not find generated JSON files for Excel report');
      return;
    }
    
    const cashFlow: CashFlowStatement = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, cashFlowFiles[0]), 'utf-8'))[0];
    const feeCollection: FeeCollectionSummary[] = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, feeCollectionFiles[0]), 'utf-8'));
    
    const excelPath = await generateExcelReport(results, cashFlow, feeCollection);
    log.info(`Excel report saved to: ${excelPath}`);

  } catch (err) {
    log.error('Financial extraction failed:', err as Error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runFinancial();
