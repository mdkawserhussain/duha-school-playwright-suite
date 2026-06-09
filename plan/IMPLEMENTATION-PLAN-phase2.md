# Implementation Plan: Payroll Web Integration (Phase 2)

## Step 1: Salary Computation Module

**File:** `src/utils/payrollCompute.ts`

Port all.js's `computePayroll()` to TypeScript for the preview endpoint. Reads directly from filesystem.

### Sub-steps:
1.1 Define interfaces: `StaffSalary`, `PayrollPreview`, `StaffExceptions`
1.2 Implement `computeStaffSalary()` — single staff salary breakdown
  - perDay = Math.round(basic / 25)
  - Tiffin = eligibleDays × 25 (exclude tiffinExclusionDays + Saturdays)
  - Late with customTiming, daySpecificTimings, Saturday exclusion
  - Absent deduction = absent × perDay (unless skipAbsentDeduction)
  - Late deductions: over20Fine + graduated penalties + perDay if late>=3
  - Apply exceptions: OT, increment, bonus, PF deduction/return
  - net = Math.max(0, gross - totalDed) + tiffin + ot + increment + bonus - pfDeduction + pfReturn
  - Build markings string: "Ab:3,10 Lt:5(2m),12(8m) Lv:7"
1.3 Implement `computePayrollPreview()` — all staff + summary
1.4 Implement `getSaturdayDates(year, month)` — auto-holiday calculation
1.5 Verify: type-check passes

## Step 2: Unit Tests for Salary Computation

**File:** `src/utils/payrollCompute.test.ts`

### Sub-steps:
2.1 Test: basic + allowance → gross
2.2 Test: tiffin = pdays × 25 (excluding tiffinExclusionDays + Saturdays)
2.3 Test: absent deduction = absent × (basic / 25)
2.4 Test: late penalties — under 6min, 6-10min, 11+min, over20
2.5 Test: skipLateCheck exception → no late deductions
2.6 Test: skipAbsentDeduction exception → no absent deduction
2.7 Test: overridePdays / overrideAbsent
2.8 Test: customTiming → different threshold per staff
2.9 Test: noAbsentDays → exempt from absent deduction
2.10 Test: OT, increment, bonus additions
2.11 Test: PF deduction / return
2.12 Test: net floor at 0 (can't go negative)
2.13 Test: full preview with 3 staff members (compare with all.js output)
2.14 Verify: `npm test` passes

## Step 3: Payroll Proxy Routes

**File:** `src/server/routes/payroll.ts`

Thin proxy layer to js-agv8's server.js.

### Sub-steps:
3.1 Create Router with JS_AGV8_BASE = 'http://localhost:3000'
3.2 Implement `GET /api/payroll/status` — check connectivity + local state
3.3 Implement `POST /api/payroll/run` — trigger phases via js-agv8 API
3.4 Implement `GET /api/payroll/preview` — read filesystem, compute salaries
3.5 Implement `GET /api/payroll/verify` — fetch audit from js-agv8
3.6 Implement `GET /api/payroll/config` — proxy to js-agv8
3.7 Implement `PUT /api/payroll/config` — proxy to js-agv8
3.8 Implement `GET /api/payroll/files` — proxy to js-agv8
3.9 Implement `GET /api/payroll/files/:filename` — proxy download
3.10 Implement `GET /api/payroll/logs` — SSE bridge from js-agv8
3.11 Implement name matching: compare portal attendance vs config.json staff
3.12 Verify: type-check passes

## Step 4: Mount Routes in Server

**File:** `src/server/index.ts`

### Sub-steps:
4.1 Import payroll router
4.2 Mount at `/api/payroll`
4.3 Verify: server starts without errors

## Step 5: Payroll Tab UI

**File:** `web/src/pages/Payroll.tsx`

### Sub-steps:
5.1 Create Payroll.tsx with 6 sub-tab navigation (Overview, Preview, Verify, Config, Files, Names)
5.2 Implement Overview panel
  - Connection status indicator (green/red)
  - Last run summary card
  - Quick stats (gross, net, deductions)
  - Run Pipeline button with phase checkboxes
  - Progress bar with SSE log output
5.3 Implement Preview panel
  - Sortable table: Name, Role, PDays, Absent, Late, Basic, Tiffin, Deductions, Net
  - Row expansion → daily logs
  - Filter by name, role, status
  - Color coding (green/red/yellow)
5.4 Implement Verify panel
  - Overall status banner (PASS/FAIL)
  - Audit table with calc vs report vs bank
  - Failed rows highlighted
  - Anomaly flags
5.5 Implement Config panel
  - Staff list with inline editing
  - Edit fields: basic, allowance, bank, role, customTiming
  - Exceptions editor (skipLateCheck, overridePdays, etc.)
  - Holidays editor
  - Policies editor
  - Save button
  - Lock/unlock toggle
5.6 Implement Files panel
  - File list with sizes + dates
  - Download buttons
  - Grouped by type
5.7 Implement Names panel
  - Matched/unmatched dashboard
  - Manual mapping override
5.8 Wire SSE for real-time progress
5.9 Dark mode styling (match existing design)
5.10 Verify: renders in browser, all panels functional

## Step 6: Add Payroll Tab to Navigation

**File:** `web/src/App.tsx`

### Sub-steps:
6.1 Import Payroll page
6.2 Add to PAGES: `{ key: 'payroll', label: 'Payroll', icon: '💰' }`
6.3 Add route: `{page === 'payroll' && <Payroll />}`
6.4 Verify: tab appears, click navigates

## Step 7: Integration Verification

### Sub-steps:
7.1 Start js-agv8 server: `cd js-agv8 && node server.js`
7.2 Start portal scraper: `npm run web`
7.3 Verify: Payroll tab shows "connected" status
7.4 Verify: Preview shows 53 staff with salary breakdown
7.5 Verify: Run Pipeline triggers phases, progress streams
7.6 Verify: Verify panel shows audit results
7.7 Verify: Config panel loads and saves staff edits
7.8 Verify: Files panel lists output files
7.9 Verify: Names panel shows matching results
7.10 Compare: web preview matches `node all.js` output
7.11 Compare: verify panel matches `node verify.js` output

## Step 8: Documentation + Commits

### Sub-steps:
8.1 Update README.md — add Payroll Web UI section
8.2 Update task-portal-automation-suite.md
8.3 Commit per step (8 commits total)
