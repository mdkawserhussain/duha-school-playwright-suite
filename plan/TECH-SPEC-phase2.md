# Tech Spec: Payroll Web Integration (Phase 2)

## Architecture

```
Portal Scraper Web UI (port 3001)
  Payroll.tsx
    ↓ GET /api/payroll/status        (is js-agv8 running?)
    ↓ GET /api/payroll/preview       (enriched salary breakdown)
    ↓ GET /api/payroll/verify        (audit results)
    ↓ GET /api/payroll/config        (staff config)
    ↓ PUT /api/payroll/config        (save staff edits)
    ↓ GET /api/payroll/files         (output file list)
    ↓ GET /api/payroll/files/:name   (download file)
    ↓ POST /api/payroll/run          (trigger pipeline)
    ↓ GET /api/payroll/logs          (SSE log stream)

Express Server (routes/payroll.ts)
    ↓ HTTP proxy → js-agv8 server.js (port 3000)
    ↓ or direct filesystem read for preview/compute

js-agv8 Server (port 3000)
  server.js
    ↓ GET /api/config
    ↓ PUT /api/config
    ↓ GET /api/parsed
    ↓ GET /api/payroll
    ↓ GET /api/audit
    ↓ POST /api/run/parse, /api/run/all, /api/run/verify, etc.
    ↓ GET /api/outputs
    ↓ GET /api/download/:filename
    ↓ GET /api/logs (SSE)
```

## Key Insight

js-agv8's server.js already implements all payroll endpoints. The portal scraper's `routes/payroll.ts` is a **thin proxy layer** that:
1. Checks if js-agv8 is reachable
2. Forwards requests to js-agv8's API
3. Adds value: enriched preview computation, name matching, SSE bridging

## New Files

| File | Purpose |
|------|---------|
| `src/server/routes/payroll.ts` | Proxy routes to js-agv8 server |
| `web/src/pages/Payroll.tsx` | Payroll tab UI |

## Modified Files

| File | Change |
|------|--------|
| `src/server/index.ts` | Mount payroll router at `/api/payroll` |
| `web/src/App.tsx` | Add Payroll tab to navigation |

## js-agv8 Server API (Reference)

These endpoints already exist in `js-agv8/server.js`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/config` | Read config.json |
| PUT | `/api/config` | Write config.json |
| GET | `/api/parsed` | Read temp/parsed.json |
| PUT | `/api/parsed` | Write temp/parsed.json + regenerate parsed.docx |
| GET | `/api/payroll` | Read temp/final_payroll.json |
| GET | `/api/audit` | Read output/audit-report.txt |
| POST | `/api/run/parse` | Run Phase 1 (parse att.docx) |
| POST | `/api/run/all` | Run Phase 3 (generate reports) |
| POST | `/api/run/verify?final=true` | Run Phase 5/7 (verify) |
| POST | `/api/run/bank2` | Run Phase 6 (bank2 letter) |
| POST | `/api/run/whatsapp` | Run Phase 8 (WhatsApp links) |
| GET | `/api/outputs` | List output/ files |
| GET | `/api/download/:filename` | Download output file |
| GET | `/api/logs` | SSE log stream |

## Portal Scraper Proxy Endpoints

### `GET /api/payroll/status`

Check if js-agv8 server is reachable + read local state.

```json
{
  "jsAgv8Connected": true,
  "jsAgv8Url": "http://localhost:3000",
  "hasConfig": true,
  "hasParsedJson": true,
  "staffCount": 53,
  "month": 5,
  "year": 2026,
  "locked": false,
  "lastAuditStatus": "failed",
  "lastAuditDate": "2026-06-08T13:53:00Z"
}
```

**Implementation:**
1. Try `fetch('http://localhost:3000/api/config')` — if fails, js-agv8 not running
2. If connected, read config for staff count, month, year, locked
3. Check `js-agv8/temp/parsed.json` exists (filesystem)
4. Check `js-agv8/output/audit-report.txt` for last status

### `POST /api/payroll/run`

Trigger js-agv8 pipeline. Streams SSE progress to portal scraper UI.

```json
// Request
{
  "phases": [1, 3, 5],  // which phases to run (default: all)
  "flags": {
    "dryRun": false,
    "final": false,
    "skipWa": false
  }
}
```

**Implementation:**
1. POST to `http://localhost:3000/api/run/parse` (if phase 1)
2. POST to `http://localhost:3000/api/run/all` (if phase 3)
3. POST to `http://localhost:3000/api/run/verify` (if phase 5)
4. POST to `http://localhost:3000/api/run/whatsapp` (if phase 8)
5. Bridge SSE: connect to `http://localhost:3000/api/logs`, pipe events to portal scraper's logStream

### `GET /api/payroll/preview`

Enriched salary breakdown. Reads `js-agv8/temp/parsed.json` + `js-agv8/config.json` directly (filesystem, not HTTP — faster, no server dependency for read-only data).

```json
{
  "year": 2026,
  "month": 5,
  "policies": {
    "standardTiming": "07:49 AM",
    "tiffinRate": 25,
    "over20Fine": 300,
    "latePenalties": [...]
  },
  "staff": [
    {
      "name": "Hasan Mahmud",
      "role": "Teacher",
      "basic": 100000,
      "allowance": 0,
      "customTiming": null,
      "pdays": 0,
      "absent": 15,
      "leave": 0,
      "late": 0,
      "over20": 0,
      "tiffin": 0,
      "perDay": 4000,
      "gross": 100000,
      "absDed": 60000,
      "lateDed": 0,
      "totalDed": 60000,
      "net": 40000,
      "exceptions": { ... },
      "dailyLogs": [],
      "lateDetails": "",
      "markings": "Ab:3,4,5,6,7,10,11,12,13,14,17,18,19,20,21"
    }
  ],
  "summary": {
    "totalStaff": 53,
    "totalGross": 3500000,
    "totalNet": 3200000,
    "totalDeductions": 300000,
    "totalTiffin": 15000
  }
}
```

**Implementation:**
1. Read `js-agv8/temp/parsed.json` (PayrollInput[])
2. Read `js-agv8/config.json` (staff, policies, holidays)
3. Compute per-staff salary using same logic as all.js:
   - `perDay = Math.round(basic / 25)`
   - Tiffin = eligible days × 25 (exclude tiffinExclusionDays + Saturdays)
   - Late with customTiming, daySpecificTimings, Saturday exclusion
   - Absent deduction = absent × perDay (unless skipAbsentDeduction)
   - Late deductions: over20Fine + graduated penalties
   - Apply exceptions: OT, increment, bonus, PF
   - `net = Math.max(0, gross - totalDed) + tiffin + ot + increment + bonus - pfDeduction + pfReturn`
4. Return enriched preview + summary

### `GET /api/payroll/verify`

Fetch audit results from js-agv8.

```json
{
  "connected": true,
  "reportText": "...",        // raw audit-report.txt
  "snapshot": { ... },        // audit-snapshot-May-2026.json
  "overallStatus": "failed",
  "mathErrors": [
    { "name": "Hasan Mahmud", "calcNet": 40000, "reportNet": 0, "status": "error" }
  ],
  "syncErrors": [],
  "anomalies": []
}
```

**Implementation:**
1. Fetch `http://localhost:3000/api/audit` → audit-report.txt
2. Read `js-agv8/output/audit-snapshot-*.json` (latest) → structured data
3. Parse audit-report.txt for math errors, sync errors
4. Return structured verification result

### `GET /api/payroll/config`

Proxy to js-agv8 config.

**Implementation:** Forward to `http://localhost:3000/api/config`

### `PUT /api/payroll/config`

Save config edits to js-agv8.

**Implementation:** Forward to `http://localhost:3000/api/config` with body

### `GET /api/payroll/files`

List js-agv8 output files.

**Implementation:** Forward to `http://localhost:3000/api/outputs`

### `GET /api/payroll/files/:filename`

Download js-agv8 output file.

**Implementation:** Forward to `http://localhost:3000/api/download/:filename`

### `GET /api/payroll/logs`

SSE bridge — connect to js-agv8's `/api/logs`, pipe to portal scraper's logStream.

**Implementation:**
```typescript
// On client request, connect to js-agv8 SSE
const response = await fetch('http://localhost:3000/api/logs');
// Pipe each event to portal scraper's SSE stream
```

## Salary Computation (Preview)

**File:** `src/utils/payrollCompute.ts`

TypeScript port of all.js's `computePayroll()` for the preview endpoint. Reads directly from filesystem (no HTTP needed).

### Key Differences from all.js

| Aspect | all.js | payrollCompute.ts |
|--------|--------|-------------------|
| Input | temp/parsed.json + config.json | Same |
| Manual edits | Reads temp/parsed.docx XML | Not supported (Phase 2) |
| Saturday handling | Auto-excludes Saturdays | Same |
| Output | Writes docx files | Returns JSON only |
| Tiffin exclusion | tiffinExclusionDays + Saturdays | Same |
| customTiming | Per-staff override | Same |
| daySpecificTimings | Per-day override | Same |
| noAbsentDays | Exempt from absent deduction | Same |

### computeStaffSalary(parsedEntry, staffConfig, policies, holidays)

```typescript
interface StaffSalary {
  name: string;
  role: string;
  basic: number;
  allowance: number;
  customTiming: string | null;
  pdays: number;
  absent: number;
  leave: number;
  late: number;
  over20: number;
  lateMins: number[];
  lateDetails: string;
  perDay: number;
  gross: number;
  tiffin: number;
  absDed: number;
  lateDed: number;
  totalDed: number;
  ot: number;
  increment: number;
  bonus: number;
  pfDeduction: number;
  pfReturn: number;
  net: number;
  markings: string;
  dailyLogs: Array<{ day: number; time: string }>;
  exceptions: StaffExceptions;
}
```

## Name Matching Dashboard

Compare portal attendance names (from `output/attendance_*.json`) against config.json staff.

```typescript
// Read latest attendance file
const attendance = JSON.parse(fs.readFileSync('output/attendance_*.json'));
const portalNames = [...new Set(attendance.map(r => r['Name']))];

// Read config staff
const config = JSON.parse(fs.readFileSync('js-agv8/config.json'));
const configNames = config.staff.map(s => s.name);

// Match using same logic as bridge module
const matched = [];
const unmatchedPortal = [];
const unmatchedConfig = [];

for (const name of portalNames) {
  const found = findStaffMatch(name, config.staff);
  if (found) matched.push({ portal: name, config: found.name });
  else unmatchedPortal.push(name);
}

for (const staff of config.staff) {
  if (!matched.some(m => normalize(m.config) === normalize(staff.name))) {
    unmatchedConfig.push(staff.name);
  }
}
```

## UI Design: Payroll Tab

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Payroll — DUHA INTERNATIONAL SCHOOL                         │
│ 🟢 js-agv8 connected (port 3000)  Month: May 2026          │
│ Last run: 2h ago ✓  Staff: 53  Status: 4 math errors       │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Preview] [Verify] [Config] [Files] [Names]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ (Sub-panel content based on active tab)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sub-panels

1. **Overview** (default)
   - Connection status card (green/red indicator)
   - Last run summary: date, status, staff count
   - Quick stats: total gross, total net, total deductions
   - Run Pipeline button with phase selection checkboxes
   - Progress bar with SSE log output

2. **Preview**
   - Sortable table: Name, Role, PDays, Absent, Late, Basic, Tiffin, Deductions, Net
   - Click row → expand daily logs
   - Filter: by name, role, status
   - Color coding: green (present), red (absent), yellow (late)

3. **Verify**
   - Overall status banner (PASS/FAIL)
   - Audit table: Name, Calc Net, Report Net, Bank Net, Status
   - Failed rows highlighted red
   - Anomaly flags from previous month comparison
   - Math errors summary

4. **Config**
   - Staff list with inline editing
   - Edit: basic, allowance, bank account, mobile, role, customTiming
   - Edit: exceptions (skipLateCheck, skipAbsentDeduction, overridePdays, etc.)
   - Holidays editor (day numbers)
   - Policies editor (standardTiming, tiffinRate, over20Fine, latePenalties)
   - Save button → PUT /api/payroll/config
   - Lock/unlock toggle

5. **Files**
   - List of generated files with sizes + dates
   - Download button per file
   - Grouped by type: Reports, Bank, WhatsApp, Audit

6. **Names**
   - Name matching dashboard
   - ✅ Matched: 50/53
   - ⚠️ Portal not in config: ["Unknown Employee"]
   - ⚠️ Config not in portal: ["Staff Member"]
   - Manual mapping override UI

### SSE Progress During Run

```
┌─────────────────────────────────────────┐
│ Running Pipeline... ████████░░ 60%      │
├─────────────────────────────────────────┤
│ ✅ Phase 1: Parse — 51 staff, 24 days  │
│ ✅ Phase 3: Reports — 53 staff         │
│ 🔄 Phase 5: Verify — running...        │
│                                         │
│ [View Full Logs]                        │
└─────────────────────────────────────────┘
```

## Error Handling

1. **js-agv8 not running** → Red status indicator, "Start js-agv8 server" button
2. **config.json not found** → Error card with path hint
3. **Pipeline phase fails** → Red X in progress, error message in log stream
4. **config.json locked** → Warning banner, unlock button
5. **Name mismatch** → Warning panel (not blocking)
6. **Preview computation error** → Fallback to raw parsed.json display
7. **SSE connection lost** → Auto-reconnect with backoff

## Files Referenced (Read-Only)

| File | Purpose |
|------|---------|
| `js-agv8/config.json` | Staff list, policies, holidays |
| `js-agv8/temp/parsed.json` | Attendance data |
| `js-agv8/temp/final_payroll.json` | Final payroll results |
| `js-agv8/output/audit-report.txt` | Audit report text |
| `js-agv8/output/audit-snapshot-*.json` | Structured audit data |
| `js-agv8/output/*` | Generated reports |

## Files to Create

| File | Purpose |
|------|---------|
| `src/server/routes/payroll.ts` | Proxy + preview computation |
| `src/utils/payrollCompute.ts` | Salary computation for preview |
| `src/utils/payrollCompute.test.ts` | Unit tests |
| `web/src/pages/Payroll.tsx` | Payroll tab UI |

## Files Modified

| File | Change |
|------|--------|
| `src/server/index.ts` | Import + mount payroll router |
| `web/src/App.tsx` | Add Payroll tab to PAGES + route |

## Testing Strategy

- Unit: `payrollCompute.ts` — salary computation matches all.js output
- Integration: proxy endpoints return correct data from js-agv8
- E2E: Click Run Pipeline → verify output files created
- Manual: Compare web preview with `node all.js` output + `node verify.js` output
