# task.md — Payroll Web Integration (Phase 2)

## Step 1: Salary Computation Module
- [ ] 1.1 Create `src/utils/payrollCompute.ts` with interfaces
- [ ] 1.2 Implement `computeStaffSalary()` — single staff breakdown
  - [ ] perDay, tiffin (with exclusions + Saturday)
  - [ ] late calculation (customTiming, daySpecificTimings, Saturday)
  - [ ] absent deduction (with noAbsentDays + skipAbsentDeduction)
  - [ ] late deductions (over20Fine, graduated penalties, perDay if late>=3)
  - [ ] apply exceptions (OT, increment, bonus, PF)
  - [ ] net = gross - deductions + additions
  - [ ] markings string
- [ ] 1.3 Implement `computePayrollPreview()` — all staff + summary
- [ ] 1.4 Implement `getSaturdayDates()` — auto-holiday calc
- [ ] 1.5 Verify: type-check passes

## Step 2: Unit Tests
- [ ] 2.1 Create `src/utils/payrollCompute.test.ts`
- [ ] 2.2 Test: basic + allowance → gross
- [ ] 2.3 Test: tiffin calculation (exclusions + Saturdays)
- [ ] 2.4 Test: absent deduction
- [ ] 2.5 Test: late penalties (4 tiers)
- [ ] 2.6 Test: skipLateCheck / skipAbsentDeduction
- [ ] 2.7 Test: overridePdays / overrideAbsent
- [ ] 2.8 Test: customTiming
- [ ] 2.9 Test: noAbsentDays
- [ ] 2.10 Test: OT/increment/bonus/PF
- [ ] 2.11 Test: net floor at 0
- [ ] 2.12 Test: full preview (3 staff)
- [ ] 2.13 Verify: `npm test` passes

## Step 3: Payroll Proxy Routes
- [ ] 3.1 Create `src/server/routes/payroll.ts` with Router
- [ ] 3.2 `GET /api/payroll/status` — check js-agv8 connectivity
- [ ] 3.3 `POST /api/payroll/run` — trigger pipeline phases
- [ ] 3.4 `GET /api/payroll/preview` — enriched salary breakdown
- [ ] 3.5 `GET /api/payroll/verify` — audit results
- [ ] 3.6 `GET /api/payroll/config` — proxy config read
- [ ] 3.7 `PUT /api/payroll/config` — proxy config write
- [ ] 3.8 `GET /api/payroll/files` — list output files
- [ ] 3.9 `GET /api/payroll/files/:filename` — download file
- [ ] 3.10 `GET /api/payroll/logs` — SSE bridge
- [ ] 3.11 Name matching dashboard data
- [ ] 3.12 Verify: type-check passes

## Step 4: Mount Routes
- [ ] 4.1 Import payroll router in `src/server/index.ts`
- [ ] 4.2 Mount at `/api/payroll`
- [ ] 4.3 Verify: server starts

## Step 5: Payroll Tab UI
- [ ] 5.1 Create `web/src/pages/Payroll.tsx` with 6 sub-tabs
- [ ] 5.2 Overview panel — connection status, summary, Run button, progress
- [ ] 5.3 Preview panel — sortable salary table, row expansion, filters
- [ ] 5.4 Verify panel — audit table, pass/fail, anomalies
- [ ] 5.5 Config panel — staff editor, holidays, policies, save, lock/unlock
- [ ] 5.6 Files panel — file list, download, grouped by type
- [ ] 5.7 Names panel — matched/unmatched dashboard
- [ ] 5.8 SSE wiring for real-time progress
- [ ] 5.9 Dark mode styling
- [ ] 5.10 Verify: renders in browser

## Step 6: Navigation
- [ ] 6.1 Add Payroll to PAGES in App.tsx
- [ ] 6.2 Add route for Payroll page
- [ ] 6.3 Verify: tab appears and navigates

## Step 7: Integration Verification
- [ ] 7.1 Start js-agv8 server + portal scraper
- [ ] 7.2 Verify: connection status shows green
- [ ] 7.3 Verify: preview matches all.js output
- [ ] 7.4 Verify: run pipeline triggers phases
- [ ] 7.5 Verify: audit results display correctly
- [ ] 7.6 Verify: config load/save works
- [ ] 7.7 Verify: file download works
- [ ] 7.8 Verify: name matching shows results
- [ ] 7.9 Manual: compare web vs CLI output

## Step 8: Documentation
- [ ] 8.1 Update README.md — Payroll Web UI section
- [ ] 8.2 Update task-portal-automation-suite.md
- [ ] 8.3 Commit: `feat: salary computation module`
- [ ] 8.4 Commit: `test: salary computation tests`
- [ ] 8.5 Commit: `feat: payroll proxy routes`
- [ ] 8.6 Commit: `feat: Payroll tab UI`
- [ ] 8.7 Commit: `feat: payroll integration verification`
- [ ] 8.8 Commit: `docs: Phase 2 payroll web integration`
