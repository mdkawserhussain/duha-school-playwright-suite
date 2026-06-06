# Implementation Plan: Attendance-to-Payroll Bridge

## Step 1: Create bridge module

**File:** `src/utils/attendanceToPayroll.ts`

Core transformation function:
- Input: `FlatAttendanceRecord[]` + config path
- Output: writes `../js-agv8/temp/parsed.json`
- Handles: grouping, time conversion, status mapping, late calculation, name matching

### Sub-steps:
1.1 Define TypeScript interfaces for PayrollInput, DailyLog, Baseline
1.2 Implement `timeTo12h(time24h: string): string` — 24h → 12h conversion
1.3 Implement `groupByEmployee(records[]): Map<string, FlatAttendanceRecord[]>`
1.4 Implement `computeBaseline(records[], holidays[]): Baseline`
1.5 Implement `convertToPayrollInput(grouped, config): PayrollInput[]`
1.6 Implement `writePayrollInput(inputs[], outputPath): void`
1.7 Export main function: `attendanceToPayroll(attPath, configPath): void`

## Step 2: Create CLI script

**File:** `scripts/payroll.ts`

CLI entry point that:
- Loads portal attendance JSON
- Loads js-agv8 config.json
- Runs bridge module
- Optionally runs all.js, verify.js, wa.js

### Sub-steps:
2.1 Parse CLI args: `--attendance`, `--config`, `--skip-verify`, `--dry-run`
2.2 Find latest attendance JSON if not specified
2.3 Run bridge transformation
2.4 Execute js-agv8 pipeline via child_process
2.5 Report generated files

## Step 3: Add npm script

**File:** `package.json`

```json
"payroll": "npx tsx scripts/payroll.ts"
```

## Step 4: Unit tests

**File:** `src/utils/attendanceToPayroll.test.ts`

Test cases:
- Time format conversion (AM/PM, noon, midnight)
- Status mapping (Present, Absent, Leave, Holiday, null)
- Late calculation (on time, 5min late, 25min late)
- Name matching (exact, fuzzy, unmatched)
- Empty attendance array
- Holiday exclusion

## Step 5: Write plan files

**Files:** `plan/PRD.md`, `plan/TECH-SPEC.md`, `plan/IMPLEMENTATION-PLAN.md`, `plan/task.md`
