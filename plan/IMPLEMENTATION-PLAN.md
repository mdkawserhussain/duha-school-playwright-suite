# Implementation Plan: Attendance-to-Payroll Bridge (Phase 1)

## Step 1: Create bridge module

**File:** `src/utils/attendanceToPayroll.ts`

Core transformation function:
- Input: `FlatAttendanceRecord[]` + config path
- Output: writes `js-agv8/temp/parsed.json`
- Handles: grouping, time conversion, status mapping, late calculation, name matching

### Sub-steps:
1.1 Define TypeScript interfaces: `FlatAttendanceRecord`, `PayrollInput`, `DailyLog`, `Baseline`, `PayrollConfig`
1.2 Implement `timeTo12h(time24h: string): string` — 24h → 12h conversion with zero-padding
1.3 Implement `timeToMins(timeStr: string): number` — time to minutes since midnight
1.4 Implement `groupByEmployee(records[]): Map<string, FlatAttendanceRecord[]>`
1.5 Implement `computeBaseline(records[], holidays[], threshold): Baseline` — pdays, absent, leave, late, over20
1.6 Implement `convertToPayrollInput(grouped, config): PayrollInput[]` — full transformation
1.7 Implement `writePayrollInput(inputs[], outputPath): void`
1.8 Implement `findStaffMatch(empName, staff)` — fuzzy name matching
1.9 Implement `attendanceToPayroll(attPath, jsAgv8Dir)` — main entry with error handling + unmatched reporting
1.10 Verify: `npx tsc --noEmit` passes

## Step 2: Create CLI script

**File:** `scripts/payroll.ts`

CLI entry point that:
- Loads portal attendance JSON
- Loads js-agv8 config.json (via bridge module)
- Runs bridge transformation
- Optionally runs all.js, verify.js, wa.js via child_process

### Sub-steps:
2.1 Parse CLI args: `--attendance`, `--dry-run`, `--skip-verify`
2.2 Find latest `output/attendance_*.json` if not specified
2.3 Run bridge transformation: `attendanceToPayroll()`
2.4 Execute `node all.js` via `execSync` (cwd: js-agv8/)
2.5 Execute `node verify.js` via `execSync` (cwd: js-agv8/)
2.6 Execute `node wa.js` via `execSync` (cwd: js-agv8/)
2.7 Report generated files from `js-agv8/output/`
2.8 Verify: `npm run payroll` runs end-to-end

## Step 3: Add npm script

**File:** `package.json`

```json
"payroll": "npx tsx scripts/payroll.ts"
```

## Step 4: Unit tests

**File:** `src/utils/attendanceToPayroll.test.ts`

Test cases (59 tests):
- timeTo12h: 24h morning, 24h afternoon, 12h passthrough, empty/null
- timeToMins: 12h format, 24h format, empty
- groupByEmployee: groups by ID, skips empty
- computeBaseline: present days, absent days, leave days, late arrivals, over20, holidays, empty
- findStaffMatch: exact, fuzzy, manual map, no match
- convertToPayrollInput: full transformation, holiday exclusion

## Step 5: Write plan files

**Files:** `plan/PRD.md`, `plan/TECH-SPEC.md`, `plan/IMPLEMENTATION-PLAN.md`, `plan/task.md`
