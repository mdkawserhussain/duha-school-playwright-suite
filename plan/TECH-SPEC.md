# Tech Spec: Attendance-to-Payroll Bridge

## Data Flow

```
Portal Extraction
  → output/attendance_YYYY-MM-DD.json  (FlatAttendanceRecord[])
  → src/utils/attendanceToPayroll.ts   (bridge module)
  → ../js-agv8/temp/parsed.json        (PayrollInput[])
  → ../js-agv8/all.js                  (computePayroll)
  → output/ (Monthly-All, Salary-Report, Bank-Transfer, WhatsApp)
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
2. Get threshold: config.json `policies.standardThreshold` ("07:49 AM" = 469)
3. If arrival > threshold: lateMinutes = arrival - threshold
4. If lateMinutes > 20: increment `over20`
5. Build lateDetails string: `"5(5m), 12(25m)"`

### 5. pdays Count
pdays = count of days with Status "Present" or "Late" (excluding holidays from config.json).

### 6. Holiday Awareness
Read `config.json` → `holidays` array (day numbers). Skip these days when computing pdays/absent.

### 7. Name Matching
Use js-agv8's `utils.js:findStaffConfig()` logic:
1. Normalize: lowercase + strip non-alpha
2. Manual map for known short names
3. Exact match
4. Fuzzy substring match

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/attendanceToPayroll.ts` | Core bridge module |
| `scripts/payroll.ts` | CLI entry point |
| `src/utils/attendanceToPayroll.test.ts` | Unit tests |
| `plan/PRD.md` | Product requirements |
| `plan/TECH-SPEC.md` | This document |
| `plan/IMPLEMENTATION-PLAN.md` | Step-by-step plan |
| `plan/task.md` | Task checklist |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `"payroll"` script |

## Files Referenced (Read-Only)

| File | Purpose |
|------|---------|
| `../js-agv8/config.json` | Staff list, policies, holidays |
| `../js-agv8/all.js` | Payroll computation (called via require) |
| `../js-agv8/utils.js` | Name matching utilities |
| `../js-agv8/verify.js` | Audit engine |
| `../js-agv8/wa.js` | WhatsApp salary slips |

## Error Handling

1. **No attendance file** → Clear error: "Run extraction first: npm start"
2. **No matching staff in config** → Warning + skip (don't crash)
3. **config.json not found** → Error with path hint
4. **js-agv8 not found** → Error with setup instructions
5. **Name mismatch** → Log unmatched portal employees and config staff
