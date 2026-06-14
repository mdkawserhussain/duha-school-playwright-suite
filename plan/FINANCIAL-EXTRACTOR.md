# Financial Report Extractor - Design Specification

**Date:** 2026-06-14
**Status:** Approved
**Approach:** Direct API Integration

## Overview

Comprehensive financial reporting system that extracts data from the DUHA portal's ledger-details-list API and generates five report types: Fee Collection Summary, Student Payment Details, Cash Flow Statement, Bank Reconciliation, and Outstanding Dues Report.

## Architecture

### Components

1. **`src/extractors/financialExtractor.ts`** - Core extractor that calls the ledger-details-list API
2. **`src/server/routes/financial.ts`** - Express routes for API endpoints
3. **`web/src/pages/Financial.tsx`** - New page in web UI for financial reports
4. **`src/types/FinancialReport.ts`** - TypeScript interfaces for financial data

### Design Principles

- Follow existing patterns from `paymentLedger.ts`
- Use Playwright's `page.evaluate()` for direct API calls
- Reuse existing authenticated session
- Deduplicate API response data
- Generate JSON, Excel, and PDF outputs

## Data Flow

### Input Parameters

```typescript
interface FinancialReportParams {
  from_date: string;  // "YYYY-MM-DD" format
  to_date: string;    // "YYYY-MM-DD" format
  status: string;     // "approved" | "pending" | "all"
}
```

### API Call Flow

1. Extract XSRF token from cookies
2. POST to `/site/accounts/report/ledger-details-list`
3. Receive array of ledger objects with `data_list[]` and summary totals

### Data Processing

1. **Deduplication**: Group by `data_list[].id`, keep first occurrence only
2. **Student Info Extraction**: Parse `transaction_note` for Name, Shift, Class, Payment Slip No
3. **Categorization**: Group by ledger account root (Income/Expense/Asset)
4. **Aggregation**: Calculate running totals and balances

### Output Structure

- `financial_raw.json` - Complete API response
- `financial_processed.json` - Deduplicated and enriched data
- `financial_summary.json` - Aggregated totals by category
- Excel workbook with multiple sheets
- PDF export with formatted tables

## API Integration

### Endpoint

**POST** `/site/accounts/report/ledger-details-list`

### Request Body

```json
{
  "from_date": "2026-01-01",
  "to_date": "2026-01-31",
  "status": "approved"
}
```

### Response Structure

```typescript
interface LedgerResponse {
  data_list: Array<{
    id: number;
    site_accounts_ledger_id: number;
    debit_amount: number;
    credit_amount: number;
    entry: "dr" | "cr";
    created_date: string;
    status: string;
    acc_voucher_details: {
      id: number;
      transaction_date: string;
      voucher_type: string;
      voucher_no: string;
      transaction_for: string;
      transaction_note: string;
    };
    ledger: {
      id: number;
      name: string;
      ledger_code: string;
    };
  }>;
  ledger_account: {
    id: number;
    name: string;
    ledger_code: string;
    root: string;  // "Income" | "Expense" | "Asset"
  };
  total_credit: number;
  total_debit: number;
  total_credit_for_opening_balance: number;
  total_debit_for_opening_balance: number;
  opening_balance: number;
  sub_total_amount: number;
  total_amount: number;
  upto_date_for_opening_balance: string;
}
```

### Known Ledger Accounts

**Income Ledgers:**
- Tuition Fee (30003)
- Session Fee (30006)
- Admission Fee (30007)
- Books & Others Fee (30023)
- Admission form (30022)
- Spring Summative Assessment Fee (30032)

**Expense Ledgers:**
- Students needs (40049)
- Various operational expenses (40008, 40009, 40021, 40032, 40041, 40044, 40050, 40053)

**Asset Ledgers:**
- Cash In Hand (10101)
- AIBL-0951120046843 (10104)

### Deduplication Logic

```typescript
function deduplicateEntries(dataList: LedgerDataItem[]): LedgerDataItem[] {
  const seen = new Set<number>();
  const unique: LedgerDataItem[] = [];
  
  for (const item of dataList) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  
  log.info(`Deduplication: ${dataList.length} → ${unique.length} entries (${dataList.length - unique.length} duplicates removed)`);
  return unique;
}
```

## Report Generation

### 1. Fee Collection Summary

**Purpose:** Total fees collected by type with time breakdown

**Data Source:** Income ledgers (30003, 30006, 30007, 30023, 30022, 30032)

**Metrics:**
- Total by fee type (Tuition, Session, Admission, Books, Spring Assessment)
- Daily/weekly/monthly breakdown
- Comparison periods (current vs previous)

**Output:** Excel sheet with pivot tables, PDF with charts

### 2. Student Payment Details

**Purpose:** Per-student payment history and outstanding balances

**Data Source:** `transaction_note` field parsing

**Parsing Logic:**
```typescript
function parseStudentInfo(note: string): StudentInfo | null {
  const nameMatch = note.match(/Name:\s*([^,]+)/);
  const shiftMatch = note.match(/Shift:\s*([^,]+)/);
  const classMatch = note.match(/Class:\s*([^,]+)/);
  const slipMatch = note.match(/Payment Slip No:\s*(\d+)/);
  
  if (!nameMatch) return null;
  
  return {
    name: nameMatch[1].trim(),
    shift: shiftMatch ? shiftMatch[1].trim() : '',
    className: classMatch ? classMatch[1].trim() : '',
    paymentSlipNo: slipMatch ? slipMatch[1] : ''
  };
}
```

**Metrics:**
- Per-student payment history
- Class/shift grouping
- Payment method breakdown

### 3. Cash Flow Statement

**Purpose:** Income vs expense summary with net cash flow

**Data Source:** All ledgers (Income + Expense roots)

**Metrics:**
- Total Income
- Total Expense
- Net Cash Flow (Income - Expense)
- Running balance with opening/closing

**Output:** Standard cash flow format with sections

### 4. Bank Reconciliation

**Purpose:** AIBL bank account and Cash In Hand reconciliation

**Data Source:** Asset ledgers (10101, 10104)

**Metrics:**
- AIBL-0951120046843 ledger analysis
- Cash In Hand reconciliation
- Discrepancy identification
- Matching transactions

### 5. Outstanding Dues Report

**Purpose:** Students with pending payments and aging analysis

**Data Source:** Income ledgers with credit entries

**Metrics:**
- Students with pending payments
- Aging analysis (30/60/90 days)
- Collection rate metrics
- Top delinquent accounts

## Web UI Integration

### New Page: `/financial`

**Components:**

1. **Date Range Picker**
   - Start/end date selectors
   - Presets: This Month, Last Month, This Quarter, Custom

2. **Filter Controls**
   - Status dropdown: Approved, Pending, All
   - Report Type selector

3. **Action Buttons**
   - Generate Report
   - Download Excel
   - Download PDF

4. **Report Preview**
   - Tabbed interface for each report type
   - Summary cards with key metrics

5. **Summary Cards**
   - Total Income
   - Total Expense
   - Net Cash Flow
   - Outstanding Dues

### API Endpoints

```typescript
// src/server/routes/financial.ts

GET  /api/financial/status          // Check extractor status
POST /api/financial/generate        // Generate report with date params
GET  /api/financial/summary         // Get latest summary data
GET  /api/financial/download/:format // Download Excel/PDF
```

### Navigation

- Add "Financial Reports" link to sidebar menu
- Add route to React Router configuration

## Error Handling

### API Errors

- **Timeout:** 30s default, configurable
- **Authentication:** Detect expiration, redirect to login
- **Validation:** Invalid date range handling
- **Network:** Retry logic (3 attempts with exponential backoff)

### Data Errors

- **Empty Data:** Graceful handling with user message
- **Parse Failures:** Log warning, continue with partial data
- **Duplicate Detection:** Log count, proceed with deduplication

### Output Errors

- **Excel Generation:** Fallback to JSON if library fails
- **PDF Generation:** Graceful degradation, provide Excel alternative
- **File Write:** Check disk space, handle permission errors

## Logging

```typescript
// Extraction progress
log.step(`Extracting financial data from ${fromDate} to ${toDate}...`);
log.info(`API returned ${ledgerCount} ledger entries`);

// Deduplication
log.info(`Deduplication: ${originalCount} → ${uniqueCount} entries`);

// Report generation
log.step(`Generating ${reportType} report...`);
log.info(`Report complete: ${outputPath}`);
```

## Testing Strategy

### Unit Tests

- Data processing functions (deduplication, parsing)
- Report calculation logic
- Date range validation
- Student info extraction

### Integration Tests

- Mock API responses
- Full extraction flow
- Report generation pipeline

### Test Fixtures

- Sample ledger API responses
- Various date ranges
- Edge cases (empty data, single ledger, many duplicates)

### Success Criteria

- [ ] All 5 report types generate correctly
- [ ] Excel files open without errors
- [ ] PDF renders properly
- [ ] Web UI displays accurate data
- [ ] Handles edge cases gracefully
- [ ] Performance < 30s for monthly reports

## Implementation Order

1. **Phase 1:** Core extractor + types
2. **Phase 2:** Server routes
3. **Phase 3:** Web UI page
4. **Phase 4:** Report generation (Excel/PDF)
5. **Phase 5:** Testing and refinement

## Dependencies

- Playwright (existing)
- ExcelJS (existing in package.json)
- PDFKit or Puppeteer (for PDF generation)
- date-fns (existing in package.json)
