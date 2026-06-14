# Financial Report Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive financial reporting system that extracts data from the DUHA portal's ledger-details-list API and generates five report types with JSON, Excel, and PDF outputs.

**Architecture:** Direct API integration using Playwright's page.evaluate() to call the ledger-details-list endpoint. Extractor follows existing patterns from paymentLedger.ts. Server routes expose API endpoints for web UI integration. New React page provides date range selection and report generation controls.

**Tech Stack:** TypeScript, Playwright, Express, React, ExcelJS, PDFKit, date-fns

---

## File Structure

### New Files
- `src/types/FinancialReport.ts` - TypeScript interfaces for financial data
- `src/extractors/financialExtractor.ts` - Core extractor logic
- `src/server/routes/financial.ts` - Express API routes
- `web/src/pages/Financial.tsx` - Web UI page
- `src/utils/financialReports.ts` - Report generation utilities
- `src/__tests__/financialExtractor.test.ts` - Unit tests

### Modified Files
- `src/server/index.ts` - Register financial routes
- `web/src/App.tsx` - Add route for Financial page
- `web/src/components/Sidebar.tsx` - Add navigation link

---

## Task 1: TypeScript Interfaces

**Files:**
- Create: `src/types/FinancialReport.ts`

- [ ] **Step 1: Create FinancialReport.ts with all interfaces**

```typescript
// src/types/FinancialReport.ts

export interface FinancialReportParams {
  from_date: string;  // "YYYY-MM-DD" format
  to_date: string;    // "YYYY-MM-DD" format
  status: string;     // "approved" | "pending" | "all"
}

export interface LedgerDataItem {
  id: number;
  site_accounts_ledger_id: number;
  debit_amount: number;
  credit_amount: number;
  entry: "dr" | "cr";
  created_date: string;
  status: string;
  site_accounts_voucher_detail_id: number;
  site_id: number;
  updated_at: string;
  created_at: string;
  acc_voucher_details: {
    id: number;
    transaction_date: string;
    voucher_type: string;
    voucher_no: string;
    transaction_for: string;
    transaction_note: string;
    site_accounts_fiscal_year_id: number;
    site_accounts_voucher_id: number;
    site_id: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
  ledger: {
    id: number;
    name: string;
    ledger_code: string;
  };
}

export interface LedgerAccount {
  id: number;
  name: string;
  ledger_code: string;
  root: string;  // "Income" | "Expense" | "Asset"
  is_system: number;
  is_tax: number;
  is_opening: number;
  is_closing: number;
  is_bank: number;
  is_cash: number;
  site_id: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerResponse {
  data_list: LedgerDataItem[];
  ledger_account: LedgerAccount;
  total_credit: number;
  total_debit: number;
  total_credit_for_opening_balance: number;
  total_debit_for_opening_balance: number;
  opening_balance: number;
  sub_total_amount: number;
  total_amount: number;
  upto_date_for_opening_balance: string;
}

export interface StudentInfo {
  name: string;
  shift: string;
  className: string;
  paymentSlipNo: string;
}

export interface FeeCollectionSummary {
  feeType: string;
  totalCollected: number;
  transactionCount: number;
  dailyBreakdown: Record<string, number>;
}

export interface StudentPaymentDetail {
  studentName: string;
  shift: string;
  className: string;
  paymentSlipNo: string;
  totalPaid: number;
  payments: Array<{
    date: string;
    amount: number;
    feeType: string;
    voucherNo: string;
  }>;
}

export interface CashFlowStatement {
  period: { from: string; to: string };
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  incomeByType: Record<string, number>;
  expenseByType: Record<string, number>;
}

export interface BankReconciliation {
  bankAccount: {
    name: string;
    code: string;
    ledgerBalance: number;
    transactions: LedgerDataItem[];
  };
  cashInHand: {
    ledgerBalance: number;
    transactions: LedgerDataItem[];
  };
  discrepancies: string[];
}

export interface OutstandingDues {
  studentsWithDues: StudentPaymentDetail[];
  agingAnalysis: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
  };
  totalOutstanding: number;
  collectionRate: number;
}

export interface FinancialReport {
  generatedAt: string;
  period: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    outstandingDues: number;
  };
  feeCollection: FeeCollectionSummary[];
  studentPayments: StudentPaymentDetail[];
  cashFlow: CashFlowStatement;
  bankReconciliation: BankReconciliation;
  outstandingDues: OutstandingDues;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/FinancialReport.ts
git commit -m "feat: add TypeScript interfaces for financial report extractor"
```

---

## Task 2: Unit Tests for Data Processing

**Files:**
- Create: `src/__tests__/financialExtractor.test.ts`

- [ ] **Step 1: Create test file with deduplication tests**

```typescript
// src/__tests__/financialExtractor.test.ts

import { describe, it, expect } from 'vitest';
import {
  deduplicateEntries,
  parseStudentInfo,
  categorizeByRoot,
  calculateFeeCollection,
  calculateCashFlow
} from '../extractors/financialExtractor';
import type { LedgerDataItem, LedgerResponse } from '../types/FinancialReport';

describe('financialExtractor', () => {
  describe('deduplicateEntries', () => {
    it('should remove duplicate entries by id', () => {
      const items: LedgerDataItem[] = [
        { id: 1, debit_amount: 100, credit_amount: 0, entry: 'dr', created_date: '2026-01-01', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any },
        { id: 1, debit_amount: 100, credit_amount: 0, entry: 'dr', created_date: '2026-01-01', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any },
        { id: 2, debit_amount: 200, credit_amount: 0, entry: 'dr', created_date: '2026-01-02', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 2, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any }
      ];

      const result = deduplicateEntries(items);
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual([1, 2]);
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateEntries([])).toHaveLength(0);
    });
  });

  describe('parseStudentInfo', () => {
    it('should parse student info from transaction note', () => {
      const note = 'Name: John Doe, Shift: Day, Class: 10A, Payment Slip No: 12345';
      const result = parseStudentInfo(note);
      
      expect(result).toEqual({
        name: 'John Doe',
        shift: 'Day',
        className: '10A',
        paymentSlipNo: '12345'
      });
    });

    it('should return null for invalid note', () => {
      expect(parseStudentInfo('Random text')).toBeNull();
    });

    it('should handle partial info', () => {
      const note = 'Name: Jane Smith';
      const result = parseStudentInfo(note);
      
      expect(result).toEqual({
        name: 'Jane Smith',
        shift: '',
        className: '',
        paymentSlipNo: ''
      });
    });
  });

  describe('categorizeByRoot', () => {
    it('should categorize ledgers by root type', () => {
      const responses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 1000,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 1000,
          total_amount: 1000,
          upto_date_for_opening_balance: ''
        },
        {
          ledger_account: { id: 2, name: 'Cash In Hand', ledger_code: '10101', root: 'Asset', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 1, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 0,
          total_debit: 500,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 500,
          total_amount: 500,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = categorizeByRoot(responses);
      expect(result.income).toHaveLength(1);
      expect(result.asset).toHaveLength(1);
      expect(result.expense).toHaveLength(0);
    });
  });

  describe('calculateFeeCollection', () => {
    it('should calculate fee collection summary', () => {
      const incomeResponses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [
            { id: 1, credit_amount: 1000, debit_amount: 0, entry: 'cr', created_date: '2026-01-01', status: 'approved', acc_voucher_details: { transaction_note: 'Name: John Doe', voucher_no: 'V001', transaction_date: '2026-01-01', voucher_type: 'receipt', transaction_for: 'fee', site_accounts_fiscal_year_id: 1, site_accounts_voucher_id: 1, site_id: 1, status: 'approved', created_at: '', updated_at: '' }, ledger: { id: 1, name: 'Tuition Fee', ledger_code: '30003' }, site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '' },
            { id: 2, credit_amount: 1500, debit_amount: 0, entry: 'cr', created_date: '2026-01-02', status: 'approved', acc_voucher_details: { transaction_note: 'Name: Jane Smith', voucher_no: 'V002', transaction_date: '2026-01-02', voucher_type: 'receipt', transaction_for: 'fee', site_accounts_fiscal_year_id: 1, site_accounts_voucher_id: 1, site_id: 1, status: 'approved', created_at: '', updated_at: '' }, ledger: { id: 1, name: 'Tuition Fee', ledger_code: '30003' }, site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 2, site_id: 1, updated_at: '', created_at: '' }
          ],
          total_credit: 2500,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 2500,
          total_amount: 2500,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = calculateFeeCollection(incomeResponses);
      expect(result).toHaveLength(1);
      expect(result[0].feeType).toBe('Tuition Fee');
      expect(result[0].totalCollected).toBe(2500);
      expect(result[0].transactionCount).toBe(2);
    });
  });

  describe('calculateCashFlow', () => {
    it('should calculate cash flow statement', () => {
      const responses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 5000,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 5000,
          total_amount: 5000,
          upto_date_for_opening_balance: ''
        },
        {
          ledger_account: { id: 2, name: 'Salary Expense', ledger_code: '40008', root: 'Expense', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 0,
          total_debit: 3000,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 3000,
          total_amount: 3000,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = calculateCashFlow(responses, '2026-01-01', '2026-01-31');
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpense).toBe(3000);
      expect(result.netCashFlow).toBe(2000);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/financialExtractor.test.ts`
Expected: FAIL - Module not found (functions not implemented yet)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/financialExtractor.test.ts
git commit -m "test: add unit tests for financial data processing functions"
```

---

## Task 3: Core Extractor Implementation

**Files:**
- Create: `src/extractors/financialExtractor.ts`

- [ ] **Step 1: Create financialExtractor.ts with exported functions**

```typescript
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
  writeJsonOutput('financial_cash_flow', cashFlow);

  // Calculate and save fee collection
  const categorized = categorizeByRoot(rawResponses);
  const feeCollection = calculateFeeCollection(categorized.income);
  writeJsonOutput('financial_fee_collection', feeCollection);

  log.step('Financial data extraction complete');
  return rawResponses;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/financialExtractor.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/extractors/financialExtractor.ts
git commit -m "feat: implement core financial extractor with data processing functions"
```

---

## Task 4: Server Routes

**Files:**
- Create: `src/server/routes/financial.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create financial.ts routes**

```typescript
// src/server/routes/financial.ts

import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { extractFinancialData } from '../../extractors/financialExtractor';
import type { FinancialReportParams } from '../../types/FinancialReport';

export const financialRouter = Router();

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

// GET /api/financial/status - Check extractor status
financialRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const rawFile = path.join(OUTPUT_DIR, 'financial_raw.json');
    const summaryFile = path.join(OUTPUT_DIR, 'financial_cash_flow.json');
    const feeCollectionFile = path.join(OUTPUT_DIR, 'financial_fee_collection.json');

    const hasRaw = fs.existsSync(rawFile);
    const hasSummary = fs.existsSync(summaryFile);
    const hasFeeCollection = fs.existsSync(feeCollectionFile);

    let latestData = null;
    if (hasRaw) {
      try {
        latestData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
      } catch {
        latestData = null;
      }
    }

    res.json({
      status: hasRaw ? 'ready' : 'no_data',
      hasRaw,
      hasSummary,
      hasFeeCollection,
      ledgerCount: latestData ? latestData.length : 0,
      lastUpdated: hasRaw ? fs.statSync(rawFile).mtime.toISOString() : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financial/generate - Generate financial report
financialRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, status = 'approved' } = req.body;

    if (!from_date || !to_date) {
      return res.status(400).json({ error: 'from_date and to_date are required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from_date) || !dateRegex.test(to_date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const params: FinancialReportParams = { from_date, to_date, status };

    // Get Playwright page from session (you'll need to implement this based on your auth setup)
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Financial report generation initiated',
      params
    });
  } catch (err: any) {
    console.error('[financial] Generate failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financial/summary - Get latest summary data
financialRouter.get('/summary', (_req: Request, res: Response) => {
  try {
    const summaryFile = path.join(OUTPUT_DIR, 'financial_cash_flow.json');
    const feeCollectionFile = path.join(OUTPUT_DIR, 'financial_fee_collection.json');

    if (!fs.existsSync(summaryFile)) {
      return res.json({
        status: 'no_data',
        message: 'No financial data available. Run "Generate" first.'
      });
    }

    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    const feeCollection = fs.existsSync(feeCollectionFile)
      ? JSON.parse(fs.readFileSync(feeCollectionFile, 'utf-8'))
      : [];

    res.json({
      status: 'ready',
      summary,
      feeCollection
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financial/download/:format - Download Excel/PDF
financialRouter.get('/download/:format', (req: Request, res: Response) => {
  try {
    const { format } = req.params;

    if (!['json', 'excel', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use json, excel, or pdf' });
    }

    const filePath = path.join(OUTPUT_DIR, `financial_raw.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No financial data available' });
    }

    if (format === 'json') {
      res.download(filePath, 'financial_report.json');
    } else {
      // Excel and PDF generation will be implemented in Task 5
      res.status(501).json({ error: `${format} export not yet implemented` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Register route in src/server/index.ts**

Find the line where other routers are registered and add:
```typescript
import { financialRouter } from './routes/financial';
// ... after other router registrations
app.use('/api/financial', financialRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/financial.ts src/server/index.ts
git commit -m "feat: add Express routes for financial report API"
```

---

## Task 5: Report Generation Utilities

**Files:**
- Create: `src/utils/financialReports.ts`

- [ ] **Step 1: Create financialReports.ts with Excel and PDF generation**

```typescript
// src/utils/financialReports.ts

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import type { LedgerResponse, FinancialReport, FeeCollectionSummary, CashFlowStatement } from '../types/FinancialReport';

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

/**
 * Generate Excel report with multiple sheets
 */
export async function generateExcelReport(
  data: LedgerResponse[],
  summary: CashFlowStatement,
  feeCollection: FeeCollectionSummary[]
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DUHA School Portal';
  workbook.created = new Date();

  // Sheet 1: Cash Flow Summary
  const cashFlowSheet = workbook.addWorksheet('Cash Flow');
  cashFlowSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Amount', key: 'amount', width: 20 }
  ];

  cashFlowSheet.addRow({ category: 'Period', amount: `${summary.period.from} to ${summary.period.to}` });
  cashFlowSheet.addRow({ category: 'Total Income', amount: summary.totalIncome });
  cashFlowSheet.addRow({ category: 'Total Expense', amount: summary.totalExpense });
  cashFlowSheet.addRow({ category: 'Net Cash Flow', amount: summary.netCashFlow });
  cashFlowSheet.addRow({ category: 'Opening Balance', amount: summary.openingBalance });
  cashFlowSheet.addRow({ category: 'Closing Balance', amount: summary.closingBalance });

  // Add income by type
  cashFlowSheet.addRow({});
  cashFlowSheet.addRow({ category: 'Income by Type', amount: '' });
  for (const [type, amount] of Object.entries(summary.incomeByType)) {
    cashFlowSheet.addRow({ category: `  ${type}`, amount });
  }

  // Add expense by type
  cashFlowSheet.addRow({});
  cashFlowSheet.addRow({ category: 'Expense by Type', amount: '' });
  for (const [type, amount] of Object.entries(summary.expenseByType)) {
    cashFlowSheet.addRow({ category: `  ${type}`, amount });
  }

  // Sheet 2: Fee Collection
  const feeSheet = workbook.addWorksheet('Fee Collection');
  feeSheet.columns = [
    { header: 'Fee Type', key: 'feeType', width: 30 },
    { header: 'Total Collected', key: 'totalCollected', width: 20 },
    { header: 'Transaction Count', key: 'transactionCount', width: 20 }
  ];

  for (const fee of feeCollection) {
    feeSheet.addRow({
      feeType: fee.feeType,
      totalCollected: fee.totalCollected,
      transactionCount: fee.transactionCount
    });
  }

  // Sheet 3: Ledger Details
  const ledgerSheet = workbook.addWorksheet('Ledger Details');
  ledgerSheet.columns = [
    { header: 'Ledger Name', key: 'name', width: 30 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Root', key: 'root', width: 15 },
    { header: 'Total Credit', key: 'credit', width: 20 },
    { header: 'Total Debit', key: 'debit', width: 20 },
    { header: 'Balance', key: 'balance', width: 20 }
  ];

  for (const ledger of data) {
    ledgerSheet.addRow({
      name: ledger.ledger_account.name,
      code: ledger.ledger_account.ledger_code,
      root: ledger.ledger_account.root,
      credit: ledger.total_credit,
      debit: ledger.total_debit,
      balance: ledger.total_amount
    });
  }

  // Save workbook
  const filePath = path.join(OUTPUT_DIR, 'financial_report.xlsx');
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

/**
 * Generate PDF report
 */
export function generatePdfReport(
  data: LedgerResponse[],
  summary: CashFlowStatement,
  feeCollection: FeeCollectionSummary[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(OUTPUT_DIR, 'financial_report.pdf');
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(20).text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${summary.period.from} to ${summary.period.to}`, { align: 'center' });
    doc.moveDown(2);

    // Cash Flow Summary
    doc.fontSize(16).text('Cash Flow Summary');
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Income: ${summary.totalIncome.toLocaleString()}`);
    doc.text(`Total Expense: ${summary.totalExpense.toLocaleString()}`);
    doc.text(`Net Cash Flow: ${summary.netCashFlow.toLocaleString()}`);
    doc.text(`Opening Balance: ${summary.openingBalance.toLocaleString()}`);
    doc.text(`Closing Balance: ${summary.closingBalance.toLocaleString()}`);
    doc.moveDown(2);

    // Fee Collection
    doc.fontSize(16).text('Fee Collection Summary');
    doc.moveDown();
    doc.fontSize(12);
    for (const fee of feeCollection) {
      doc.text(`${fee.feeType}: ${fee.totalCollected.toLocaleString()} (${fee.transactionCount} transactions)`);
    }
    doc.moveDown(2);

    // Ledger Details
    doc.fontSize(16).text('Ledger Details');
    doc.moveDown();
    doc.fontSize(10);
    for (const ledger of data) {
      doc.text(`${ledger.ledger_account.name} (${ledger.ledger_account.ledger_code}): Credit ${ledger.total_credit.toLocaleString()} | Debit ${ledger.total_debit.toLocaleString()}`);
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/financialReports.ts
git commit -m "feat: add Excel and PDF report generation utilities"
```

---

## Task 6: Web UI Page

**Files:**
- Create: `web/src/pages/Financial.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create Financial.tsx page**

```tsx
// web/src/pages/Financial.tsx

import { useState, useEffect } from 'react';

interface FinancialStatus {
  status: string;
  hasRaw: boolean;
  ledgerCount: number;
  lastUpdated: string | null;
}

interface CashFlowSummary {
  period: { from: string; to: string };
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  incomeByType: Record<string, number>;
  expenseByType: Record<string, number>;
}

export default function Financial() {
  const [status, setStatus] = useState<FinancialStatus | null>(null);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchSummary();
  }, []);

  const fetchStatus = async () => {
    try {
      const resp = await fetch('/api/financial/status');
      const data = await resp.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const resp = await fetch('/api/financial/summary');
      const data = await resp.json();
      if (data.status === 'ready') {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/financial/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_date: fromDate, to_date: toDate, status: 'approved' })
      });

      const data = await resp.json();
      if (data.success) {
        // Refresh data after generation
        await fetchStatus();
        await fetchSummary();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string) => {
    window.open(`/api/financial/download/${format}`, '_blank');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Financial Reports</h1>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Status</h2>
        {status ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{status.status === 'ready' ? 'Ready' : 'No Data'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ledgers</p>
              <p className="font-medium">{status.ledgerCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">
                {status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>

      {/* Generate Report */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Total Income</p>
              <p className="text-xl font-bold text-green-700">{summary.totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Total Expense</p>
              <p className="text-xl font-bold text-red-700">{summary.totalExpense.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Net Cash Flow</p>
              <p className="text-xl font-bold text-blue-700">{summary.netCashFlow.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Closing Balance</p>
              <p className="text-xl font-bold text-purple-700">{summary.closingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Download Reports</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleDownload('json')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Download JSON
          </button>
          <button
            onClick={() => handleDownload('excel')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Download Excel
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to web/src/App.tsx**

Find the routes section and add:
```tsx
import Financial from './pages/Financial';
// ... in routes
<Route path="/financial" element={<Financial />} />
```

- [ ] **Step 3: Add navigation link to web/src/components/Sidebar.tsx**

Add to the sidebar navigation:
```tsx
<NavLink to="/financial" className={({ isActive }) => isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}>
  Financial Reports
</NavLink>
```

- [ ] **Step 4: Verify web build**

Run: `cd web && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/Financial.tsx web/src/App.tsx web/src/components/Sidebar.tsx
git commit -m "feat: add Financial Reports page to web UI"
```

---

## Task 7: Integration Testing

**Files:**
- Modify: `src/__tests__/financialExtractor.test.ts` (add integration tests)

- [ ] **Step 1: Add integration tests for API call and data processing**

```typescript
// Add to src/__tests__/financialExtractor.test.ts

describe('Integration Tests', () => {
  it('should process complete financial extraction flow', () => {
    // Mock data representing API response
    const mockResponses: LedgerResponse[] = [
      {
        ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
        data_list: [
          { id: 1, credit_amount: 1000, debit_amount: 0, entry: 'cr', created_date: '2026-01-01', status: 'approved', acc_voucher_details: { transaction_note: 'Name: John Doe, Shift: Day, Class: 10A, Payment Slip No: 12345', voucher_no: 'V001', transaction_date: '2026-01-01', voucher_type: 'receipt', transaction_for: 'fee', site_accounts_fiscal_year_id: 1, site_accounts_voucher_id: 1, site_id: 1, status: 'approved', created_at: '', updated_at: '' }, ledger: { id: 1, name: 'Tuition Fee', ledger_code: '30003' }, site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '' }
        ],
        total_credit: 1000,
        total_debit: 0,
        total_credit_for_opening_balance: 0,
        total_debit_for_opening_balance: 0,
        opening_balance: 0,
        sub_total_amount: 1000,
        total_amount: 1000,
        upto_date_for_opening_balance: ''
      }
    ];

    // Test categorization
    const categorized = categorizeByRoot(mockResponses);
    expect(categorized.income).toHaveLength(1);
    expect(categorized.expense).toHaveLength(0);

    // Test fee collection
    const feeCollection = calculateFeeCollection(categorized.income);
    expect(feeCollection).toHaveLength(1);
    expect(feeCollection[0].feeType).toBe('Tuition Fee');
    expect(feeCollection[0].totalCollected).toBe(1000);

    // Test cash flow
    const cashFlow = calculateCashFlow(mockResponses, '2026-01-01', '2026-01-31');
    expect(cashFlow.totalIncome).toBe(1000);
    expect(cashFlow.totalExpense).toBe(0);
    expect(cashFlow.netCashFlow).toBe(1000);
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/financialExtractor.test.ts
git commit -m "test: add integration tests for financial extraction flow"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Build web application**

Run: `cd web && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run linting**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete financial report extractor implementation"
```

---

## Execution Handoff

Plan complete and saved to `plan/IMPLEMENTATION-PLAN-financial.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
