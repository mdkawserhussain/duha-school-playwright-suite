# Task: Leave Management Module

## Step 1: Type Definitions
- [ ] 1.1 Define `LeaveRecord` interface
- [ ] 1.2 Define `LeaveSummary` interface
- [ ] 1.3 Define `MonthlyBreakdown` interface
- [ ] 1.4 Define `LeaveFetchResult` interface
- [ ] 1.5 Verify type-check passes

## Step 2: SQLite History Database
- [ ] 2.1 Create `initLeaveHistoryTable()` with schema + indexes
- [ ] 2.2 Implement `storeLeaveRecords(records)` with dedup (INSERT OR IGNORE)
- [ ] 2.3 Implement `getLeaveRecords(filters)` with optional params
- [ ] 2.4 Implement `getLeaveSummary(year)` grouped by staff + type
- [ ] 2.5 Implement `getMonthlyBreakdown(year)` grouped by staff + month + type
- [ ] 2.6 Implement `getLeaveStatus()` with counts + last fetched
- [ ] 2.7 Initialize table on server startup
- [ ] 2.8 Verify existing tests still pass

## Step 3: Leave Extractor
- [ ] 3.1 Implement `parseApiRecord(r)` — flatten nested API structure
- [ ] 3.2 Implement `fetchLeaveApplications(page)` — Playwright session fetch
- [ ] 3.3 Handle pagination (array-of-pages vs single-page)
- [ ] 3.4 Error handling: try-catch per page, partial results
- [ ] 3.5 Verify type-check passes

## Step 4: Leave API Routes
- [ ] 4.1 Create Router + outputDir/leaveDb references
- [ ] 4.2 `GET /api/leave/status` — connection info + counts
- [ ] 4.3 `POST /api/leave/fetch` — SSE streaming + extractor trigger
- [ ] 4.4 `GET /api/leave/records` — filtered query
- [ ] 4.5 `GET /api/leave/summary` — per-staff balance
- [ ] 4.6 `GET /api/leave/monthly` — month-wise breakdown
- [ ] 4.7 `GET /api/leave/download` — Excel generation with exceljs
- [ ] 4.8 Verify type-check passes

## Step 5: Mount Routes
- [ ] 5.1 Import leave router in `src/server/index.ts`
- [ ] 5.2 Mount at `/api/leave`
- [ ] 5.3 Initialize leave_history table on startup
- [ ] 5.4 Verify server starts without errors

## Step 6: Leave Tab UI
- [ ] 6.1 Create Leave.tsx with 4 sub-tab navigation
- [ ] 6.2 Records panel: table + filters + status badges + empty state
- [ ] 6.3 Summary panel: staff cards + CL/SPL balance + color coding
- [ ] 6.4 Monthly panel: staff × months grid + totals
- [ ] 6.5 Download panel: year selector + download button
- [ ] 6.6 Fetch trigger: button + progress indicator
- [ ] 6.7 Dark mode styling (match existing design system)
- [ ] 6.8 Verify renders in browser

## Step 7: Navigation
- [ ] 7.1 Import Leave page in App.tsx
- [ ] 7.2 Add to PAGES array
- [ ] 7.3 Add conditional render
- [ ] 7.4 Verify tab appears + navigates

## Step 8: Pipeline Integration
- [ ] 8.1 Add `PORTAL_LEAVE_SYNC` to config.ts
- [ ] 8.2 Add step 15 in main.ts
- [ ] 8.3 Add `.env` variable
- [ ] 8.4 Verify extraction runs with leave fetch

## Step 9: Integration Verification
- [ ] 9.1 Leave tab shows empty state on first load
- [ ] 9.2 Fetch Leaves streams progress and loads records
- [ ] 9.3 Records table filters work (staff, type, status, date)
- [ ] 9.4 Summary shows per-staff CL/SPL balances
- [ ] 9.5 Monthly shows month-wise breakdown
- [ ] 9.6 Excel download generates styled file
- [ ] 9.7 SQLite has records after fetch
- [ ] 9.8 Auto-fetch works with PORTAL_LEAVE_SYNC=true
- [ ] 9.9 All 81+ tests pass
- [ ] 9.10 Zero TypeScript errors

## Step 10: Documentation + Commits
- [ ] 10.1 Update README.md
- [ ] 10.2 Update task-portal-automation-suite.md
- [ ] 10.3 Commit per step (10 commits total)
