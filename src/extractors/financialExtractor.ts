// src/extractors/financialExtractor.ts

import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { writeJsonOutput } from '../utils/fileWriter';
import type {
  FinancialReportParams,
  LedgerDataItem,
  LedgerResponse,
  StudentInfo,
  FeeCollectionSummary,
  CashFlowStatement
} from '../types/FinancialReport';

/**
 * Deduplicate ledger entries by id
 */
export function deduplicateEntries(items: LedgerDataItem[]): LedgerDataItem[] {
  const seen = new Set<number>();
  const unique: LedgerDataItem[] = [];

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }

  log.info(`Deduplication: ${items.length} → ${unique.length} entries (${items.length - unique.length} duplicates removed)`);
  return unique;
}

/**
 * Parse student info from transaction note
 */
export function parseStudentInfo(note: string): StudentInfo | null {
  if (!note) return null;

  const nameMatch = note.match(/Name:\s*([^,]+)/);
  if (!nameMatch) return null;

  const shiftMatch = note.match(/Shift:\s*([^,]+)/);
  const classMatch = note.match(/Class:\s*([^,]+)/);
  const slipMatch = note.match(/Payment Slip No:\s*(\d+)/);

  return {
    name: nameMatch[1].trim(),
    shift: shiftMatch ? shiftMatch[1].trim() : '',
    className: classMatch ? classMatch[1].trim() : '',
    paymentSlipNo: slipMatch ? slipMatch[1] : ''
  };
}

/**
 * Categorize ledger responses by root type
 */
export function categorizeByRoot(responses: LedgerResponse[]) {
  const result = {
    income: [] as LedgerResponse[],
    expense: [] as LedgerResponse[],
    asset: [] as LedgerResponse[]
  };

  for (const response of responses) {
    const root = response.ledger_account.root.toLowerCase();
    if (root === 'income') {
      result.income.push(response);
    } else if (root === 'expense') {
      result.expense.push(response);
    } else if (root === 'asset') {
      result.asset.push(response);
    }
  }

  return result;
}

/**
 * Calculate fee collection summary from income responses
 */
export function calculateFeeCollection(incomeResponses: LedgerResponse[]): FeeCollectionSummary[] {
  const summaries: FeeCollectionSummary[] = [];

  for (const response of incomeResponses) {
    const feeType = response.ledger_account.name;
    const totalCollected = response.total_credit;
    const transactionCount = response.data_list.length;

    // Calculate daily breakdown
    const dailyBreakdown: Record<string, number> = {};
    for (const item of response.data_list) {
      const date = item.acc_voucher_details?.transaction_date || item.created_date;
      if (date) {
        dailyBreakdown[date] = (dailyBreakdown[date] || 0) + item.credit_amount;
      }
    }

    summaries.push({
      feeType,
      totalCollected,
      transactionCount,
      dailyBreakdown
    });
  }

  return summaries;
}

/**
 * Calculate cash flow statement
 */
export function calculateCashFlow(
  responses: LedgerResponse[],
  fromDate: string,
  toDate: string
): CashFlowStatement {
  const categorized = categorizeByRoot(responses);

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeByType: Record<string, number> = {};
  const expenseByType: Record<string, number> = {};

  // Calculate income
  for (const response of categorized.income) {
    totalIncome += response.total_credit;
    incomeByType[response.ledger_account.name] = response.total_credit;
  }

  // Calculate expense
  for (const response of categorized.expense) {
    totalExpense += response.total_debit;
    expenseByType[response.ledger_account.name] = response.total_debit;
  }

  const netCashFlow = totalIncome - totalExpense;

  // Calculate opening and closing balances from asset accounts
  let openingBalance = 0;
  for (const response of categorized.asset) {
    openingBalance += response.opening_balance;
  }

  const closingBalance = openingBalance + netCashFlow;

  return {
    period: { from: fromDate, to: toDate },
    totalIncome,
    totalExpense,
    netCashFlow,
    openingBalance,
    closingBalance,
    incomeByType,
    expenseByType
  };
}

/**
 * Make API call to ledger-details-list endpoint
 */
async function fetchLedgerData(
  page: Page,
  params: FinancialReportParams
): Promise<LedgerResponse[]> {
  const xsrfToken = await page.evaluate(() => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });

  const responseBody: LedgerResponse[] = await page.evaluate(async (args) => {
    const resp = await fetch(args.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': args.xsrfToken,
      },
      body: JSON.stringify({
        from_date: args.fromDate,
        to_date: args.toDate,
        status: args.status
      }),
    });
    return resp.json();
  }, {
    url: `${CONFIG.baseUrl}/site/accounts/report/ledger-details-list`,
    fromDate: params.from_date,
    toDate: params.to_date,
    status: params.status,
    xsrfToken,
  });

  return responseBody;
}

/**
 * Main export function - extracts financial data
 */
export async function extractFinancialData(
  page: Page,
  params: FinancialReportParams
): Promise<LedgerResponse[]> {
  log.step(`Extracting financial data from ${params.from_date} to ${params.to_date}...`);

  // Fetch raw data from API
  const rawResponses = await fetchLedgerData(page, params);
  log.info(`API returned ${rawResponses.length} ledger entries`);

  // Deduplicate data_list items across all responses
  for (const response of rawResponses) {
    const originalCount = response.data_list.length;
    response.data_list = deduplicateEntries(response.data_list);
    if (originalCount !== response.data_list.length) {
      log.info(`Ledger "${response.ledger_account.name}": ${originalCount} → ${response.data_list.length} entries`);
    }
  }

  // Save raw data
  writeJsonOutput('financial_raw', rawResponses);

  // Calculate and save cash flow
  const cashFlow = calculateCashFlow(rawResponses, params.from_date, params.to_date);
  writeJsonOutput('financial_cash_flow', [cashFlow]);

  // Calculate and save fee collection
  const categorized = categorizeByRoot(rawResponses);
  const feeCollection = calculateFeeCollection(categorized.income);
  writeJsonOutput('financial_fee_collection', feeCollection);

  log.step('Financial data extraction complete');
  return rawResponses;
}
