# Filter Configuration

## REPORT_COLUMNS

Controls which fee columns are included in the XLSX output and which are checked for dues.

**Syntax:** Comma-separated list of column name substrings (case-insensitive, partial match).

**Examples:**
```
REPORT_COLUMNS=""                  # Include ALL columns
REPORT_COLUMNS="january"          # Only January column
REPORT_COLUMNS="january,session"  # January OR Session Fee columns
```

**Behavior:**
- Identity columns (SL, Name, ID, Roll, Contact) are always included
- Matching is partial: `"jan"` matches "January Due", "January Paid", etc.
- When combined with `PORTAL_DUE_STUDENTS_ONLY=true`, only students with dues in the specified columns are included

## PORTAL_DUE_STUDENTS_ONLY

Controls whether the output includes all students or only those with outstanding dues.

**Values:**
- `true` (default) — Only students with non-zero dues
- `false` — All students regardless of dues

**Interaction with REPORT_COLUMNS:**

| REPORT_COLUMNS | DUE_STUDENTS_ONLY | Result |
|----------------|-------------------|--------|
| empty | true | Students with dues in ANY column |
| empty | false | ALL students |
| "january" | true | Students with dues in January column only |
| "january" | false | ALL students, but only January column in XLSX |
| "january,session" | true | Students with dues in January OR Session Fee |

## PORTAL_YEAR

Comma-separated list of academic years to extract.

**Default:** `2026`

**Example:** `PORTAL_YEAR="2025,2026"` extracts both years.

## PORTAL_SHIFT

Comma-separated list of shift names to filter.

**Default:** empty (discovers all shifts from portal)

**Example:** `PORTAL_SHIFT="Day Shift"` extracts only Day Shift.

## PORTAL_CLASS

Comma-separated list of class names to filter.

**Default:** empty (discovers all classes from portal)

**Example:** `PORTAL_CLASS="One,Two,Three"` extracts only these classes.

**Note:** Class names must match portal display (case-insensitive). Portal shows "Play" not "play".

## MIN_DUE_AMOUNT

Minimum due amount to include in output (CLI only).

**Flag:** `--min-due <amount>`

**Example:** `npm start -- --min-due 5000` only includes students with ≥ 5000 due.

## Dues Filtering Flow

```
Raw API Response
    │
    ▼
filterDuesRows(data, REPORT_COLUMNS)
    │
    ├─ REPORT_COLUMNS empty? → check ALL numeric columns for dues
    │
    └─ REPORT_COLUMNS set? → check ONLY those columns for dues
    │
    ▼
Students with non-zero dues in checked columns
    │
    ▼
writeJsonOutput('dues_enriched', ...)
writeXlsxOutput(...)
```
