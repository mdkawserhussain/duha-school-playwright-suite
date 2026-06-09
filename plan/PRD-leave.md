# PRD: Leave Management Module

## Overview

Integrate the existing standalone leave tools (`leave/fetch_leaves.js`, `leave/leave.py`) into the school portal scraper suite, providing a Leave tab in the web UI that fetches leave data from the portal API, displays records and balances, generates Excel reports, and stores historical data in SQLite.

## Problem

After building the dues extraction, attendance, and payroll modules, leave management remains standalone:

1. **`leave/fetch_leaves.js`** — Node.js script with hardcoded session cookies, must be run manually in terminal
2. **`leave/leave.py`** — Python script that generates the Excel ledger from scratch (not used by the suite)
3. **`leave/employee_leaves.json`** — Raw API response, no UI to view or filter
4. **No SQLite storage** — leave data isn't persisted for historical tracking
5. **No web UI** — admin must switch to terminal + Excel to check leave balances

The admin needs to:
- Open terminal, run `node fetch_leaves.js` with fresh cookies
- Open Excel to view leave records
- Manually cross-reference leave balances with payroll
- No historical tracking — only the latest JSON snapshot

## Goal

Add a Leave tab to the suite's web UI that:
- Fetches live leave data from the portal API (using Playwright session)
- Displays all leave records with filters (staff, type, status, date range)
- Shows per-staff leave balance summary (CL used/remaining, SPL used/remaining)
- Generates Excel reports (styled like the existing `leave.py` output)
- Stores records in SQLite for historical tracking
- Auto-runs during extraction pipeline (optional) + manual refresh button

## Users

- School admin (same person who runs extraction and payroll)
- Needs to track staff leave balances for payroll processing

## Success Criteria

1. Click "Leave" tab → see leave records from latest fetch
2. Click "Fetch Leaves" → triggers API fetch via Playwright session, streams progress
3. Records table shows all leave data with filters (staff, type, status, date range)
4. Summary panel shows per-staff balances (CL/SPL allotted, used, remaining)
5. Monthly breakdown panel shows month-wise leave distribution
6. Download Excel button generates styled report
7. Leave data stored in SQLite with run history
8. Auto-extraction runs during main pipeline when `PORTAL_LEAVE_SYNC=true`
9. All existing tests still pass (81/81)
10. Zero TypeScript errors

## Scope

### In Scope
- `src/types/LeaveRecord.ts` — TypeScript interfaces for leave data
- `src/extractors/leaveExtractor.ts` — API fetch via Playwright session (interception pattern)
- `src/utils/leaveHistoryDb.ts` — SQLite `leave_history` table + queries
- `src/utils/leaveSync.ts` — Excel sync logic (port from `fetch_leaves.js`)
- `src/server/routes/leave.ts` — Leave API endpoints
- `src/server/index.ts` — Mount leave router
- `web/src/pages/Leave.tsx` — Leave tab with sub-panels
- `web/src/App.tsx` — Add Leave to navigation
- `src/main.ts` — Add optional leave fetch step
- `.env` — Add `PORTAL_LEAVE_SYNC`, `PORTAL_LEAVE_TYPES`

### Out of Scope
- `leave/leave.py` modifications (Python script stays as-is)
- `leave/fetch_leaves.js` modifications (stays as standalone fallback)
- Payroll integration (leave days don't affect payroll deductions)
- WhatsApp leave notifications
- Leave approval workflow (portal handles this)
- Mobile responsive layout (follows existing pattern)

## Dependencies

- Phase 1 complete (extraction pipeline working)
- Phase 2 complete (web UI with auth)
- Portal session must be authenticated (Playwright browser session)
- `exceljs` already installed (used by Phase 2 payroll)
- `leave/Duha_Leave_Ledger_v2_Configurable.xlsx` — existing template file

## User Stories

1. **As admin**, I click "Leave" tab → see latest leave records from portal
2. **As admin**, I click "Fetch Leaves" → data refreshes from portal API
3. **As admin**, I filter records by staff name, leave type, status, or date range
4. **As admin**, I see per-staff balance: CL allotted 10, used 3, remaining 7
5. **As admin**, I see monthly breakdown: Jan=1, Feb=0, Mar=2, etc.
6. **As admin**, I download Excel report with styled data matching `leave.py` format
7. **As admin**, leave data is tracked historically in SQLite
8. **As admin**, extraction can auto-fetch leave data (when `PORTAL_LEAVE_SYNC=true`)
9. **As admin**, I can manually trigger leave fetch independently from extraction

## Data Flow

```
Portal API (leave/application-list)
         ↓ (Playwright session cookies)
leaveExtractor.ts
         ↓
  employee_leaves.json (raw)
         ↓
  leaveHistoryDb.ts (SQLite)
         ↓
  Leave.tsx (Web UI)
         ↓
  leaveSync.ts → Excel (styled report)
```

## API Details

- **Endpoint:** `GET /site/employee-leave/application-list?search_leave_type=&search_text=&search_date=&search_leave_status=&paginate=100`
- **Auth:** Playwright session cookies (inherited from main extraction)
- **Response:** Paginated — `{ current_page, data: [...] }` or array of pages
- **Employee lookup:** `GET /api/get-employee-list?academic_group_id=3`
- **Leave statuses:** `approved`, `pending`, `cancelled`
- **Leave types:** Dynamic from API — e.g., "Casual Leave" (CL), "Special Leave" (SPL)

## Architecture Decision

**Why reuse Playwright session instead of hardcoded cookies?**

The existing `fetch_leaves.js` uses hardcoded session cookies that expire. The suite already handles login/session reuse via Playwright's browser context. By calling the API from `page.evaluate()`, we inherit all session cookies automatically — no manual cookie management needed.

This matches the pattern used by `attendance.ts` (API interception via `page.evaluate(fetch)`).
