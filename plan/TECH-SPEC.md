# Tech Spec: Attendance-to-Payroll Bridge (Phase 1)

## Data Flow

```
Portal Extraction
  → output/attendance_YYYY-MM-DD.json  (FlatAttendanceRecord[])
  → src/utils/attendanceToPayroll.ts   (bridge module)
  → js-agv8/temp/parsed.json           (PayrollInput[])
  → js-agv8/all.js                     (computePayroll → docx reports)
  → js-agv8/verify.js                  (audit engine)
  → js-agv8/wa.js                      (WhatsApp salary slips)
```

## Input Format (Portal Attendance)

```typescript
// FlatAttendanceRecord from src/utils/attendanceFlattener.ts
interface FlatAttendanceRecord {
  'Employee ID': number | string;
  'Name': string;
  'Designation': string;
  'Contact': string;
  'Date': string;          // "2026-06-01" ISO format
  'Status': string;        // "Present" | "Absent" | "Leave" | "Holiday"
  'In Time': string | null; // "08:00" (24h) or null
  'Out Time': string | null;
  'Hours': number;
  'Late': boolean;
}
```

## Output Format (Payroll Input)

```typescript
// From js-agv8/temp/parsed.json
interface PayrollInput {
  name: string;
  role: string;
  dailyLogs: Array<{
    day: number;    // 1-31 (day of month)
    time: string;   // "08:00 AM" (12h format)
  }>;
  baseline: {
    pdays: number;
    leave: number;
    absent: number;
    absentDates: number[];
    leaveDates: number[];
    late: number;
    over20: number;
    lateMins: number[];
    lateDetails: string;  // "5(5m), 12(25m)"
  };
}
```

## Transformation Rules

### 1. Grouping
Group flat records by `Employee ID` (primary) or `Name` (fallback).

### 2. Time Format Conversion
Portal uses 24h ("08:00"), payroll expects 12h ("08:00 AM").

```
"08:00" → "08:00 AM"
"14:30" → "02:30 PM"
"00:00" → "12:00 AM"
```

### 3. Status → dailyLogs / absentDates / leaveDates Mapping

| Portal Status | Payroll Effect |
|---------------|----------------|
| "Present"     | Add to `dailyLogs` (with In Time) |
| "Late"        | Add to `dailyLogs` (with In Time), increment `late` |
| "Absent"      | Add day to `absentDates`, increment `absent` |
| "Leave"       | Add day to `leaveDates`, increment `leave` |
| "Holiday"     | Skip (don't count in any bucket) |
| null/empty    | Treat as absent |

### 4. Late Calculation
For each Present/Late day:
1. Convert In Time to minutes: `timeToMins("08:00 AM")` = 480
2. Get threshold: config.json `policies.standardTiming` ("07:49 AM" = 469)
3. If arrival > threshold: lateMinutes = arrival - threshold
4. If lateMinutes > 20: increment `over20`
5. Build lateDetails string: `"5(5m), 12(25m)"`

### 5. pdays Count
pdays = count of days with Status "Present" or "Late" (excluding holidays from config.json).

### 6. Holiday Awareness
Read `config.json` → `holidays` array (day numbers). Skip these days when computing pdays/absent.
Note: Fridays are auto-calculated as holidays by all.js (not in the bridge).

### 7. Name Matching
Use js-agv8's `utils.js:findStaffConfig()` logic:
1. Normalize: lowercase + strip non-alpha
2. Manual map for known short names (akter → Taslima Akter, aziza → Aziza Sultana, etc.)
3. Exact match
4. Fuzzy substring match

## Files Created

| File | Purpose |
|------|---------|
| `src/utils/attendanceToPayroll.ts` | Core bridge module (416 lines) |
| `scripts/payroll.ts` | CLI entry point (164 lines) |
| `src/utils/attendanceToPayroll.test.ts` | Unit tests (59 tests) |
| `plan/PRD.md` | This document |
| `plan/TECH-SPEC.md` | This document |
| `plan/IMPLEMENTATION-PLAN.md` | Step-by-step plan |
| `plan/task.md` | Task checklist |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `"payroll": "npx tsx scripts/payroll.ts"` script |

## Files Referenced (Read-Only)

| File | Purpose |
|------|---------|
| `js-agv8/config.json` | Staff list (53 entries), policies, holidays |
| `js-agv8/all.js` | Payroll computation (Phase 3) — called via child_process |
| `js-agv8/utils.js` | Name matching, validation, formatting |
| `js-agv8/verify.js` | Audit engine (Phase 5/7) |
| `js-agv8/wa.js` | WhatsApp salary slips (Phase 8) |
| `js-agv8/run.js` | Orchestrator (alternative to individual scripts) |
| `output/attendance_*.json` | Portal attendance extraction output |

## Error Handling

1. **No attendance file** → Clear error: "Run extraction first: npm start"
2. **No matching staff in config** → Warning + skip (don't crash)
3. **config.json not found** → Error with path hint
4. **js-agv8 not found** → Error with setup instructions
5. **Name mismatch** → Log unmatched portal employees and config staff
6. **js-agv8 script fails** → Capture error, report which step failed

## Bridge Module API

```typescript
// Main function
export function attendanceToPayroll(
  attendancePath: string,   // path to output/attendance_YYYY-MM-DD.json
  jsAgv8Dir: string         // path to js-agv8/
): PayrollInput[]

// Individual utilities (exported for testing)
export function timeTo12h(time24: string): string
export function timeToMins(timeStr: string): number
export function groupByEmployee(records: FlatAttendanceRecord[]): Map<string, FlatAttendanceRecord[]>
export function computeBaseline(records: FlatAttendanceRecord[], holidays: number[], threshold: string): Baseline
export function convertToPayrollInput(grouped: Map<string, FlatAttendanceRecord[]>, config: PayrollConfig): PayrollInput[]
export function writePayrollInput(inputs: PayrollInput[], outputPath: string): void
export function findStaffMatch(empName: string, staff: Array<{ name: string }>): { name: string } | null
```

## CLI Script API

```bash
npx tsx scripts/payroll.ts                      # auto-find latest attendance
npx tsx scripts/payroll.ts --attendance path     # specific file
npx tsx scripts/payroll.ts --dry-run             # bridge only, no reports
npx tsx scripts/payroll.ts --skip-verify         # skip audit step
npm run payroll                                  # via package.json script
```

Pipeline steps:
1. Bridge: `attendanceToPayroll()` → writes `js-agv8/temp/parsed.json`
2. Compute: `node all.js` (cwd: js-agv8/) → generates docx reports
3. Verify: `node verify.js` (cwd: js-agv8/) → audit report
4. WhatsApp: `node wa.js` (cwd: js-agv8/) → WhatsApp links
