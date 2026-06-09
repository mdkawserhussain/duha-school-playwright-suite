# task.md — Attendance-to-Payroll Bridge (Phase 1)

## Step 1: Bridge Module
- [x] 1.1 Create `src/utils/attendanceToPayroll.ts` with interfaces
- [x] 1.2 Implement `timeTo12h()` — 24h → 12h format with zero-padding
- [x] 1.3 Implement `timeToMins()` — time to minutes since midnight
- [x] 1.4 Implement `groupByEmployee()` — group flat records by employee ID
- [x] 1.5 Implement `computeBaseline()` — pdays, absent, leave, late, over20
- [x] 1.6 Implement `convertToPayrollInput()` — full transformation
- [x] 1.7 Implement `writePayrollInput()` — write to temp/parsed.json
- [x] 1.8 Implement `findStaffMatch()` — fuzzy name matching
- [x] 1.9 Implement `attendanceToPayroll()` — main entry with error handling
- [x] 1.10 Verify: type-check passes

## Step 2: CLI Script
- [x] 2.1 Create `scripts/payroll.ts`
- [x] 2.2 Add CLI args: --attendance, --dry-run, --skip-verify
- [x] 2.3 Auto-find latest attendance JSON
- [x] 2.4 Run bridge transformation
- [x] 2.5 Execute all.js via child_process
- [x] 2.6 Execute verify.js via child_process
- [x] 2.7 Execute wa.js via child_process
- [x] 2.8 Report generated files
- [x] 2.9 Verify: `npm run payroll` runs end-to-end

## Step 3: NPM Script
- [x] 3.1 Add `"payroll"` script to package.json

## Step 4: Tests
- [x] 4.1 Create `src/utils/attendanceToPayroll.test.ts`
- [x] 4.2 Test: timeTo12h conversions (4 tests)
- [x] 4.3 Test: timeToMins conversions (3 tests)
- [x] 4.4 Test: groupByEmployee (2 tests)
- [x] 4.5 Test: computeBaseline (6 tests)
- [x] 4.6 Test: findStaffMatch (4 tests)
- [x] 4.7 Test: convertToPayrollInput (2 tests)
- [x] 4.8 Verify: `npm test` passes (59 tests)

## Step 5: Documentation
- [x] 5.1 Write plan/PRD.md
- [x] 5.2 Write plan/TECH-SPEC.md
- [x] 5.3 Write plan/IMPLEMENTATION-PLAN.md
- [x] 5.4 Write plan/task.md

## Commits
- [x] `adee467` fix: v.trim crash in duesFilter.ts
- [x] `7bb0411` fix: react-query peer dep conflict
- [x] `de850b9` fix: react-query devDeps override
- [x] `b958ba4` fix: generate Tauri icons
- [x] `c76df97` fix: desktop app handle missing sidecar
- [x] `7ca4553` fix: add web:build step before tauri build
- [x] `5d57bdf` fix: lto="thin" + codegen-units=16 for faster CI
- [x] `407f001` fix: bundle targets=["deb","msi","nsis","app"]
- [x] `b600338` fix: replace tauri-action with npx tauri build + upload-artifact
- [x] `03b9c75` fix: upload-artifact glob target/**/bundle/
- [x] `d015bc3` fix: desktop app server bootstrap from bundled resources
- [x] `2942074` fix: add tsx to server-package.json, use npx tsx
- [x] `b599652` fix: add concurrently for npm run web
- [x] `7a0409b` fix: convert require() to ESM import in server/index.ts
- [x] `0d3adc2` fix: server reads PORT env var as fallback
- [x] `7de2101` feat: period-based due calculation + student detail view
- [x] `cfd5617` fix: show separate Paid and Due summary rows per class
- [x] `72933bc` feat: UI/UX overhaul — dark luxury theme, sidebar nav, skeleton loaders
- [x] `ddbd0a9` fix: Dashboard student search field name mismatch
- [x] `bc9c92f` feat: per-column totals in export summaries
- [x] `1ecadf9` feat: Due Only + Column selection interaction
- [x] `03c51c4` feat: Due Only + Column selection interaction (continued)
- [x] `0f8cc3b` fix: desktop app bootstrap — bundle full src/, web/dist, add exceljs
- [x] `6d71a51` fix: un-ignore js-agv8/ so payroll project is tracked in git
- [x] `d1fb78c` feat: attendance XLSX export + API endpoint
- [x] `c419fa1` feat: payroll bridge — Phase 1 attendanceToPayroll module + CLI
