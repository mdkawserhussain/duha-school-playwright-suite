# Implementation Plan: Leave Management Module

## Step 1: Type Definitions

**File:** `src/types/LeaveRecord.ts`

### Sub-steps:
1.1 Define `LeaveRecord` interface with all fields matching parsed API output
1.2 Define `LeaveSummary` interface for per-staff balance
1.3 Define `MonthlyBreakdown` interface for month-wise grid
1.4 Define `LeaveFetchResult` interface for fetch operation return value
1.5 Verify: type-check passes

## Step 2: SQLite History Database

**File:** `src/utils/leaveHistoryDb.ts`

### Sub-steps:
2.1 Create `initLeaveHistoryTable()` — CREATE TABLE IF NOT EXISTS with indexes
2.2 Implement `storeLeaveRecords(records: LeaveRecord[])` — INSERT OR IGNORE with dedup
2.3 Implement `getLeaveRecords(filters)` — query with optional staff/type/status/date filters
2.4 Implement `getLeaveSummary(year: number)` — grouped by staff + leave type
2.5 Implement `getMonthlyBreakdown(year: number)` — grouped by staff + month + type
2.6 Implement `getLeaveStatus()` — counts by status/type, last fetched time
2.7 Initialize table on server startup (call from `src/server/index.ts`)
2.8 Verify: unit tests pass (existing 81 tests + new leave tests)

## Step 3: Leave Extractor

**File:** `src/extractors/leaveExtractor.ts`

### Sub-steps:
3.1 Implement `parseApiRecord(r: any): LeaveRecord` — flatten nested API structure
3.2 Implement `fetchLeaveApplications(page: Page): Promise<LeaveFetchResult>`
  - Navigate to leave page to establish session
  - Extract XSRF token from cookies
  - Fetch all pages via `page.evaluate(fetch(...))` — inherit session cookies
  - Parse each page's data array
  - Deduplicate against SQLite
  - Write JSON output
  - Store in SQLite
3.3 Handle pagination: array-of-pages vs single-page response
3.4 Error handling: try-catch per page, log failures, return partial results
3.5 Verify: type-check passes

## Step 4: Leave API Routes

**File:** `src/server/routes/leave.ts`

### Sub-steps:
4.1 Create Router with outputDir and leaveDb references
4.2 Implement `GET /api/leave/status` — connection info + record counts
4.3 Implement `POST /api/leave/fetch` — SSE streaming, triggers extractor
  - Need Playwright page instance (pass from server context or create)
  - Stream progress events: navigating, fetching pages, parsing, complete
4.4 Implement `GET /api/leave/records` — query with filters
4.5 Implement `GET /api/leave/summary` — per-staff balance
4.6 Implement `GET /api/leave/monthly` — month-wise breakdown
4.7 Implement `GET /api/leave/download` — generate Excel with exceljs
4.8 Verify: type-check passes

## Step 5: Mount Routes in Server

**File:** `src/server/index.ts`

### Sub-steps:
5.1 Import leave router
5.2 Mount at `/api/leave`
5.3 Initialize leave_history table on startup
5.4 Verify: server starts without errors

## Step 6: Leave Tab UI

**File:** `web/src/pages/Leave.tsx`

### Sub-steps:
6.1 Create Leave.tsx with 4 sub-tab navigation (Records, Summary, Monthly, Download)
6.2 Implement Records panel
  - Sortable table with columns: Staff Name, Leave Type, Status, From, To, Days, Reason
  - Filter dropdowns: Staff (unique names), Type (unique types), Status (all/approved/pending/cancelled)
  - Date range filter (from/to date inputs)
  - Status badges: green (Approved), amber (Pending), red (Cancelled)
  - Empty state: "No leave records found. Click Fetch Leaves to import."
6.3 Implement Summary panel
  - Cards per staff member
  - Each card: Staff name, CL allotted/used/remaining, SPL allotted/used/remaining
  - Color coding: green (>2 remaining), yellow (1-2), red (0)
  - Grand total row
6.4 Implement Monthly panel
  - Grid: Staff rows × Month columns (Jan–Dec)
  - Each cell: days taken, color-coded by leave type
  - Year Total column
  - Grand total row
6.5 Implement Download panel
  - Year selector (default: 2026)
  - "Download Excel Report" button
  - Loading state during generation
6.6 Implement fetch trigger
  - "Fetch Leaves" button in header
  - Progress indicator during fetch
  - Success/error notification
6.7 Dark mode styling (match existing design system)
6.8 Verify: renders in browser, all panels functional

## Step 7: Add Leave Tab to Navigation

**File:** `web/src/App.tsx`

### Sub-steps:
7.1 Import Leave page
7.2 Add to PAGES: `{ key: 'leave', label: 'Leave', icon: '📅' }`
7.3 Add route: `{page === 'leave' && <Leave />}`
7.4 Verify: tab appears, click navigates

## Step 8: Main Pipeline Integration

**File:** `src/main.ts`

### Sub-steps:
8.1 Add `PORTAL_LEAVE_SYNC` config option to `src/config.ts`
8.2 Add step 15 after attendance extraction: `if (CONFIG.leaveSync) fetchLeaveApplications(page)`
8.3 Add `.env` variable `PORTAL_LEAVE_SYNC=true`
8.4 Verify: extraction runs with leave fetch, JSON output created

## Step 9: Integration Verification

### Sub-steps:
9.1 Start server: `npm run web`
9.2 Navigate to Leave tab — should show empty state
9.3 Click "Fetch Leaves" — should stream progress, load records
9.4 Verify Records table shows leave data with filters working
9.5 Verify Summary shows per-staff CL/SPL balances
9.6 Verify Monthly shows month-wise breakdown
9.7 Click Download — Excel file generated and downloaded
9.8 Verify SQLite has records: `sqlite3 user-data/history.db "SELECT COUNT(*) FROM leave_history"`
9.9 Run main extraction with `PORTAL_LEAVE_SYNC=true` — leave fetch runs automatically
9.10 Run full test suite: `npm test` — all 81+ tests pass
9.11 Verify zero TypeScript errors: `npx tsc --noEmit`

## Step 10: Documentation + Commits

### Sub-steps:
10.1 Update README.md — add Leave Management section
10.2 Update task-portal-automation-suite.md
10.3 Commit per step (10 commits total)
