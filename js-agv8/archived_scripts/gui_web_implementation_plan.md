# Implementation Plan: Web UI for DUHA Payroll System

Build both **Approach C** (standalone dashboard) and **Approach A** (full Express web UI) in a single implementation.

---

## Proposed Changes

### Approach C — Standalone Dashboard

#### [NEW] [dashboard.html](file:///d:/Rasel/dis-docs/hr/js-agv8/output/dashboard.html)
A single self-contained HTML file placed in `output/` that:
- Loads `final_payroll.json` from the same directory via `fetch()`
- Renders summary cards: Total Staff, Total Net, Bank Total, Cash Total
- Renders a searchable/sortable payroll table with all columns
- Color-coded attendance details (absent=red, late=orange, leave=blue)
- Dark theme, modern glassmorphism design
- **Zero dependencies, zero server** — just double-click to open

---

### Approach A — Express Web UI

#### [NEW] [server.js](file:///d:/Rasel/dis-docs/hr/js-agv8/server.js)
Express server (~150 lines) with:
- Static file serving from `public/`
- API routes for config CRUD, pipeline execution, file listing/download
- SSE endpoint for real-time log streaming during phase execution
- Console capture wrapper for piping script output to browser
- File upload via `multer` for `att.docx` and `monthly2.docx`
- Mutex lock to prevent concurrent pipeline execution

#### [NEW] [public/index.html](file:///d:/Rasel/dis-docs/hr/js-agv8/public/index.html)
Main dashboard page with:
- Header with school name, month/year, lock status
- Summary stat cards
- Pipeline stepper (Phase 1→2→3→5→8) with run buttons and status indicators
- Live log panel with auto-scroll
- Output files list with download links
- File upload dropzone for `att.docx`

#### [NEW] [public/config.html](file:///d:/Rasel/dis-docs/hr/js-agv8/public/config.html)
Staff config editor page with:
- Cycle controls form (year, month, holidays, tiffin exclusion days, locked toggle)
- Staff list with search/filter
- Expandable staff cards with editable fields (name, basic, allowance, bank, exceptions)
- Save button that PUTs to `/api/config`

#### [NEW] [public/review.html](file:///d:/Rasel/dis-docs/hr/js-agv8/public/review.html)
Attendance review page (replaces Phase 2 manual Word editing):
- Loads `temp/parsed.json` into an editable table
- Inline editing for P.Days, Leave, Absent, Late columns
- Save button that writes changes back via API
- Visual diff highlighting for cells that differ from auto-calculated values

#### [NEW] [public/style.css](file:///d:/Rasel/dis-docs/hr/js-agv8/public/style.css)
Shared CSS with:
- Dark theme (navy/charcoal palette matching existing DOCX header color `#1F497D`)
- Card components, tables, forms, buttons
- Glassmorphism effects, subtle animations
- Responsive layout

#### [NEW] [public/app.js](file:///d:/Rasel/dis-docs/hr/js-agv8/public/app.js)
Shared client-side JavaScript:
- API helper functions (fetch wrappers)
- SSE log listener
- Table sorting/filtering utilities
- Toast notifications

#### [MODIFY] [package.json](file:///d:/Rasel/dis-docs/hr/js-agv8/package.json)
- Add `express` and `multer` dependencies
- Add `"start": "node server.js"` script

---

## Open Questions

> [!IMPORTANT]
> **Port number:** The server will run on `localhost:3000`. Is that acceptable, or do you prefer a different port?

> [!IMPORTANT]
> **Attendance review saving:** When edits are saved from the review page, should we also regenerate `temp/parsed.docx` from the updated JSON, or is updating `parsed.json` sufficient (since `all.js` reads from both and prefers manual edits)?

---

## Verification Plan

### Automated Tests
1. `npm install` — verify new dependencies install cleanly
2. `npm start` — verify server starts without errors
3. Open `http://localhost:3000` — verify dashboard loads
4. Click each pipeline button — verify scripts execute and logs stream
5. Open `output/dashboard.html` directly in browser — verify standalone works
6. Edit a staff member's config — verify save persists to `config.json`

### Manual Verification
- Open the standalone `dashboard.html` and compare numbers against the terminal output from `node all.js`
- Run the full pipeline from the web UI and verify output files match CLI-generated files
