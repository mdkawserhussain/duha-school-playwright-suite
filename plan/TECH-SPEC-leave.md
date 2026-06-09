# Tech Spec: Leave Management Module

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Web UI (Leave.tsx)                                         │
│  ├── Records tab  ←  GET /api/leave/records                 │
│  ├── Summary tab  ←  GET /api/leave/summary                 │
│  ├── Monthly tab  ←  GET /api/leave/monthly                 │
│  └── Download     ←  GET /api/leave/download                │
├─────────────────────────────────────────────────────────────┤
│  Server (routes/leave.ts)                                   │
│  ├── GET /api/leave/status                                  │
│  ├── POST /api/leave/fetch  ←  triggers extractor           │
│  ├── GET /api/leave/records?staff=&type=&status=&from=&to=  │
│  ├── GET /api/leave/summary?year=2026                       │
│  ├── GET /api/leave/monthly?year=2026                       │
│  └── GET /api/leave/download?year=2026                      │
├─────────────────────────────────────────────────────────────┤
│  Extractor (leaveExtractor.ts)                              │
│  └── page.evaluate(fetch(...))  →  LeaveRecord[]            │
├─────────────────────────────────────────────────────────────┤
│  SQLite (leaveHistoryDb.ts)                                 │
│  └── leave_history table                                    │
├─────────────────────────────────────────────────────────────┤
│  Excel Sync (leaveSync.ts)                                  │
│  └── Port of fetch_leaves.js syncToExcel()                  │
└─────────────────────────────────────────────────────────────┘
```

## Type Definitions

**File:** `src/types/LeaveRecord.ts`

```typescript
export interface LeaveRecord {
  id: number;                          // API record ID
  staffName: string;                   // "First Last"
  leaveType: string;                   // "Casual Leave", "Special Leave"
  leaveTypeShort: string;              // "CL", "SPL"
  reason: string;
  fromDate: string;                    // "YYYY-MM-DD"
  toDate: string;                      // "YYYY-MM-DD"
  days: number;                        // spend_leave_days
  requestDate: string;                 // "YYYY-MM-DD"
  approveDate: string | null;
  status: 'approved' | 'pending' | 'cancelled';
  remainingDays: number;               // from API
  totalAllocated: number;              // leave_days from nested object
}

export interface LeaveSummary {
  staffName: string;
  designation: string;
  leaveTypes: {
    [typeName: string]: {
      shortName: string;
      allotted: number;
      used: number;
      remaining: number;
    };
  };
}

export interface MonthlyBreakdown {
  staffName: string;
  months: {
    [month: string]: {                 // "January", "February", etc.
      [leaveType: string]: number;     // days taken
    };
  };
  yearTotal: number;
}

export interface LeaveFetchResult {
  records: LeaveRecord[];
  totalFetched: number;
  newRecords: number;
  skippedDuplicates: number;
  fetchedAt: string;                   // ISO timestamp
}
```

## SQLite Schema

**File:** `src/utils/leaveHistoryDb.ts`

```sql
CREATE TABLE IF NOT EXISTS leave_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_id INTEGER UNIQUE,
  staff_name TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  leave_type_short TEXT,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER DEFAULT 1,
  status TEXT NOT NULL,                -- 'approved', 'pending', 'cancelled'
  reason TEXT,
  request_date TEXT,
  approve_date TEXT,
  remaining_days INTEGER,
  total_allocated INTEGER,
  raw_json TEXT,                       -- full API record for debugging
  fetched_at TEXT NOT NULL,            -- ISO timestamp
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leave_staff ON leave_history(staff_name);
CREATE INDEX IF NOT EXISTS idx_leave_type ON leave_history(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_history(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_history(from_date, to_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_dedup
  ON leave_history(staff_name, leave_type, from_date, to_date);
```

**Dedup strategy:** `INSERT OR IGNORE` on the unique index `(staff_name, leave_type, from_date, to_date)`.

## Extractor

**File:** `src/extractors/leaveExtractor.ts`

Pattern: Same as `attendance.ts` — API interception via `page.evaluate()`.

```typescript
export async function fetchLeaveApplications(page: Page): Promise<LeaveFetchResult> {
  // 1. Navigate to leave page to establish session
  await page.goto('https://duhais.eduexpert24.com/employee-leave-management/employee-leave', {
    waitUntil: 'networkidle',
  });

  // 2. Extract XSRF token from cookies
  const xsrfToken = await page.evaluate(() => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });

  // 3. Fetch all pages via API (runs in browser context)
  const allRecords = await page.evaluate(async (args) => {
    const records = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const resp = await fetch(
        `/site/employee-leave/application-list?search_leave_type=&search_text=&search_date=&search_leave_status=&paginate=100&page=${page}`,
        {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': args.xsrfToken,
          },
        }
      );
      const data = await resp.json();

      if (Array.isArray(data)) {
        // Array of pages
        for (const pageData of data) {
          records.push(...pageData.data);
        }
        hasMore = false;
      } else if (data.data && data.data.length > 0) {
        records.push(...data.data);
        page++;
        hasMore = data.current_page < data.last_page;
      } else {
        hasMore = false;
      }
    }

    return records;
  }, { xsrfToken });

  // 4. Parse raw API records into LeaveRecord[]
  const parsed = allRecords.map(parseApiRecord);

  // 5. Write JSON output
  writeJsonOutput('employee_leaves', parsed);

  // 6. Store in SQLite
  storeLeaveRecords(parsed);

  return {
    records: parsed,
    totalFetched: parsed.length,
    newRecords: /* count from SQLite insert */,
    skippedDuplicates: /* count of IGNORED */,
    fetchedAt: new Date().toISOString(),
  };
}

function parseApiRecord(r: any): LeaveRecord {
  return {
    id: r.id,
    staffName: r.employee_history?.user?.first_name || 'Unknown',
    leaveType: r.site_employee_leave_generate?.academic_leave_type?.name || 'Unknown',
    leaveTypeShort: r.site_employee_leave_generate?.academic_leave_type?.short_name || '',
    reason: r.reason || '',
    fromDate: r.from_date,
    toDate: r.to_date,
    days: r.spend_leave_days || 1,
    requestDate: r.request_date || r.from_date,
    approveDate: r.approve_date,
    status: r.leave_status,
    remainingDays: r.remaining_days || 0,
    totalAllocated: r.site_employee_leave_generate?.leave_days || 0,
  };
}
```

**Error handling:** Try-catch around each page fetch. Log failures to `log.error()`. Return partial results if some pages fail.

## Server Routes

**File:** `src/server/routes/leave.ts`

### `GET /api/leave/status`

Returns connection info and record counts.

```json
{
  "connected": true,
  "totalRecords": 45,
  "byStatus": { "approved": 30, "pending": 10, "cancelled": 5 },
  "byType": { "Casual Leave": 25, "Special Leave": 20 },
  "lastFetched": "2026-06-10T14:30:00.000Z",
  "staffCount": 12
}
```

### `POST /api/leave/fetch`

Triggers live fetch from portal API. Uses SSE for progress streaming.

```
→ SSE event: { type: 'log', message: 'Navigating to leave page...' }
→ SSE event: { type: 'log', message: 'Fetching page 1...' }
→ SSE event: { type: 'log', message: 'Found 45 records' }
→ SSE event: { type: 'complete', result: { totalFetched: 45, newRecords: 3, skippedDuplicates: 42 } }
```

### `GET /api/leave/records?staff=&type=&status=&from=&to=`

Query parameters are optional filters. Returns array of LeaveRecord.

### `GET /api/leave/summary?year=2026`

Returns LeaveSummary[] — per-staff balance across all leave types.

Computation:
```sql
SELECT
  staff_name,
  leave_type,
  leave_type_short,
  SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END) as used,
  total_allocated
FROM leave_history
WHERE strftime('%Y', from_date) = '2026'
GROUP BY staff_name, leave_type
```

Remaining = totalAllocated - used.

### `GET /api/leave/monthly?year=2026`

Returns MonthlyBreakdown[] — per-staff × per-month × per-leave-type days.

Computation:
```sql
SELECT
  staff_name,
  strftime('%m', from_date) as month,
  leave_type,
  SUM(days) as total_days
FROM leave_history
WHERE strftime('%Y', from_date) = '2026' AND status = 'approved'
GROUP BY staff_name, month, leave_type
```

### `GET /api/leave/download?year=2026`

Generates Excel file using `exceljs` with styling matching `leave.py`:
- Sheet 1: Leave Records — all records with color-coded status
- Sheet 2: Leave Summary — per-staff balance table
- Sheet 3: Monthly Breakdown — staff × months grid

Streams the file as download.

## Excel Sync

**File:** `src/utils/leaveSync.ts`

Ports the sync logic from `fetch_leaves.js` (lines 79-252) to TypeScript:

1. Read existing `leave/Duha_Leave_Ledger_v2_Configurable.xlsx` with `exceljs`
2. Find Leave Records sheet (name "Leave Records")
3. Build dedup set from existing rows: `norm(name)|norm(type)|fromDate|toDate`
4. Append new records that aren't in the dedup set
5. Apply styling:
   - Status cells: green fill (Approved), amber fill (Pending), red fill (Cancelled)
   - Date cells: formatted as "DD-MMM-YYYY"
6. Write back to file

## Leave UI

**File:** `web/src/pages/Leave.tsx`

Layout: 4 sub-tabs matching the existing design system.

### Records Tab
- Table: Staff Name, Leave Type, Status (color badge), From, To, Days, Reason
- Filters: Staff dropdown, Type dropdown, Status dropdown, Date range picker
- Sort: Click column headers
- Empty state: "No leave records found. Click Fetch Leaves to import."

### Summary Tab
- Cards per staff member
- Each card: Staff name, designation, CL allotted/used/remaining, SPL allotted/used/remaining
- Color: Green (remaining > 2), Yellow (remaining 1-2), Red (remaining 0)
- Grand total row at bottom

### Monthly Tab
- Grid: Staff (rows) × Months (Jan–Dec columns)
- Each cell: days taken, color-coded by leave type
- Year Total column
- Grand total row

### Download Tab
- Year selector dropdown (default: current year)
- "Download Excel Report" button
- Shows file size and last generated time

## Navigation

**File:** `web/src/App.tsx`

```typescript
// Add to PAGES array:
{ key: 'leave', label: 'Leave', icon: '📅' }

// Add to conditional rendering:
{page === 'leave' && <Leave />}
```

## Main Pipeline Integration

**File:** `src/main.ts`

Add optional step after attendance extraction (step 15):

```typescript
if (CONFIG.leaveSync) {
  log.step('Step 15: Fetching leave applications...');
  await fetchLeaveApplications(page);
}
```

Triggered when `PORTAL_LEAVE_SYNC=true` in `.env`.

## Environment Variables

```bash
# .env additions
PORTAL_LEAVE_SYNC=true                    # Auto-fetch during extraction
PORTAL_LEAVE_TYPES=Casual Leave,Special Leave  # Leave types to track (for Excel allotments)
```

## Error Handling

1. **API fetch fails mid-page:** Log partial results, return what was fetched
2. **SQLite write fails:** Log error, continue (JSON output is primary)
3. **Excel sync fails (file locked):** Return error message, suggest manual close
4. **No session:** Return 401 with message "Portal session expired. Run extraction first."
5. **Empty results:** Return empty array, don't error

## Performance Considerations

- **API pagination:** Fetch all pages sequentially (100 records per page)
- **SQLite indexed:** Dedup + staff + type + status + dates all indexed
- **Excel sync:** Read only Leave Records sheet, skip other 3 sheets
- **UI lazy load:** Summary/Monthly computed on-demand from SQLite, not pre-cached
