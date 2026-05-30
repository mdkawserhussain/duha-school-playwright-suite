# School Management Portal Automation Suite — Comprehensive Improvement Audit

**PROJECT TYPE:** Automation script / CLI tool
**CURRENT STATE:** A Playwright-based browser automation suite that authenticates into a Laravel/Vue.js school management portal (eduexpert24.com), extracts staff attendance and student accounts receivable data, and outputs JSON/XLSX reports.
**TARGET USER:** School IT administrators and finance officers — semi-technical — core pain point is repetitive, error-prone manual data exports.
**STACK / TECH:** Node.js · TypeScript · Playwright · ExcelJS · dotenv · tsx
**GOAL:** Internal efficiency → future commercialization for other eduexpert24 schools.

---

## 1. EXECUTIVE SUMMARY

- **CRITICAL SECURITY:** Production admin credentials (`e232290012` / `01889534420`) are hardcoded as fallback defaults in [config.ts:L16-L17](file:///home/ticktick/Desktop/playwright/src/config.ts#L16-L17) and exist in the git history. This is a P0 blocker — anyone who clones this repo gains full admin access to the school portal.
- **Architectural Win Available Now:** The attendance module currently scrapes paginated HTML tables, but the portal exposes a JSON API at `/site/employee/attendance/report/employee-date-wise-attendance-list`. Intercepting this response eliminates all pagination, selector flakiness, and is ~10× faster.
- **Silent Data Loss Risk:** Failed filter combinations in [accountsReceivable.ts:L418-L420](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L418-L420) are logged as warnings and silently skipped. The final XLSX report gives no indication that data is incomplete.
- **WhatsApp Integration Opportunity:** The existing `wa2.js` script manually parses Word documents for payroll notifications. This can be replaced by feeding our scraped JSON directly into a message compiler, closing the loop from extraction → notification in a single run.
- **Zero Test Coverage:** There are no unit, integration, or E2E tests. Every code change is a blind deployment against a live production portal.

---

## 2. DIMENSION-BY-DIMENSION AUDIT

### DIMENSION 1 — FEATURE COMPLETENESS & CORE VALUE LOOP

#### 1.1 Attendance extraction scrapes DOM instead of intercepting API
- **(a) Current State:** [attendance.ts](file:///home/ticktick/Desktop/playwright/src/extractors/attendance.ts) navigates to the attendance page, interacts with dropdowns and date pickers, then scrapes the HTML table using `extractPaginatedTable()`. This approach is fragile, pagination-dependent, and loses rich data fields (exact `in_time`, `out_time`, `late_status`, `is_holiday`, `is_leave`).
- **(b) Improvement:** Intercept the `POST` response to `/site/employee/attendance/report/employee-date-wise-attendance-list` using `page.waitForResponse()`. The API returns a complete `employee_list[]` with per-day `date_list[]` entries containing all attendance metadata. Flatten each employee × date into a record: `{ employee_id, name, designation, contact, date, status, in_time, out_time, hours, late }`. Status derived from: `is_holiday` → "Holiday", `is_leave` → "Leave", `attendance_status === true` → "Present", else "Absent".
- **(c) Priority:** P0
- **(d) Effort:** S (4 hours)
- **(e) Impact Type:** Performance / UX / Retention

#### 1.2 No WhatsApp notification pipeline
- **(a) Current State:** `wa2.js` exists as a standalone Node.js script that parses Word documents to generate WhatsApp salary slip links. It is completely disconnected from the Playwright extraction pipeline and requires manual Word file preparation.
- **(b) Improvement:** Create `src/utils/whatsappGenerator.ts` that accepts the scraped employee attendance JSON and student dues JSON, compiles WhatsApp message templates, and outputs a `WhatsApp-Links-Dashboard.html` with two tabs (Staff Salary Slips / Parent Dues Reminders). Gate behind `GENERATE_WHATSAPP_DASHBOARD=true` in `.env`. Staff phone numbers come from the attendance API response (`contact_number` field); parent phones from the accounts receivable scrape.
- **(c) Priority:** P1
- **(d) Effort:** M (2 days)
- **(e) Impact Type:** UX / Revenue

#### 1.3 No CLI interface — everything is `.env` driven
- **(a) Current State:** All runtime configuration (year, shift, class, extractor toggles) must be edited in the `.env` file before each run. There is no way to do a quick one-off extraction with different filters without modifying files.
- **(b) Improvement:** Add a CLI wrapper using `commander` or `yargs` so users can run: `npm start -- --year 2026 --shift "Day" --class "One,Two" --type dues --whatsapp`. CLI flags override `.env` values. Add `--preview` to dry-run without writing files, and `--headed` to replace the env var.
- **(c) Priority:** P1
- **(d) Effort:** M (1 day)
- **(e) Impact Type:** UX / Dev Velocity

#### 1.4 No diff/delta reporting between runs
- **(a) Current State:** Each run generates a completely independent output file. The `run_history.json` tracks raw/due counts but doesn't compare actual records.
- **(b) Improvement:** After extraction, load the previous run's JSON for the same prefix. Compute and log: new students with dues, students whose dues increased, students whose dues were cleared. Write a `diff_report_YYYY-MM-DD.json` alongside the main output.
- **(c) Priority:** P2
- **(d) Effort:** M (2 days)
- **(e) Impact Type:** Retention / UX

---

### DIMENSION 2 — EDGE CASES & FAILURE MODES

#### 2.1 Failed filter combos are silently swallowed
- **(a) Current State:** In [accountsReceivable.ts:L418-L420](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L418-L420), when an individual Year×Shift×Class combo extraction throws, the error is logged as a warning and skipped. The final XLSX report contains no indication that certain combinations failed.
- **(b) Improvement:** Maintain a `failedCombos: Array<{year, shift, cls, error}>` alongside `allRaw`. After the loop completes, write `output/run_manifest_YYYY-MM-DD.json` containing: `{ totalCombos, successfulCombos, failedCombos: [...], totalRawRecords, totalDueRecords, startTime, endTime, durationMs }`. Add a red "INCOMPLETE" banner row in the XLSX summary if any combos failed.
- **(c) Priority:** P0
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** Security / UX

#### 2.2 `handleFatalError` can throw if page is detached
- **(a) Current State:** [errorHandler.ts:L27-L31](file:///home/ticktick/Desktop/playwright/src/utils/errorHandler.ts#L27-L31) runs `page.evaluate()` to clear credential fields before screenshotting. If the page was closed or the browser crashed (the most common fatal error scenario), this evaluate will throw an unhandled rejection inside the catch block.
- **(b) Improvement:** Wrap the entire `page.evaluate` block in its own try-catch (it already is — ✅ confirmed on re-read). However, the outer `page.screenshot()` at L44 has a 5s timeout but no catch — if screenshot also fails (e.g., browser process killed), the entire `handleFatalError` will throw. Add a wrapping try-catch around L44 that logs but never throws.
- **(c) Priority:** P1
- **(d) Effort:** S (30 min)
- **(e) Impact Type:** Performance / Dev Velocity

#### 2.3 Three-phase table refresh state machine uses global window variables
- **(a) Current State:** [accountsReceivable.ts:L227-L305](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L227-L305) stores state machine variables (`__arSession`, `__arState`, `__arPhase2Start`, etc.) on the `window` object inside `waitForFunction`. These persist across combos and could cause stale state if the page is reused but the state isn't fully reset.
- **(b) Improvement:** Reset all `window.__ar*` variables to `undefined` at the beginning of each `extractCombo` call via a `page.evaluate(() => { ... })` before the main `waitForFunction`. Alternatively, namespace them with the combo index: `window.__ar_combo_${i}_state`.
- **(c) Priority:** P1
- **(d) Effort:** S (1 hour)
- **(e) Impact Type:** Performance / Security

#### 2.4 `writeJsonOutput` silently writes empty arrays
- **(a) Current State:** [fileWriter.ts:L27-L29](file:///home/ticktick/Desktop/playwright/src/utils/fileWriter.ts#L27-L29) logs a warning when data is empty but still writes the empty array to disk, potentially overwriting a previously valid extraction.
- **(b) Improvement:** When `data.length === 0` and a backup of the previous file was just created, abort the write and keep the backup as the active file. Log an error (not warning) indicating "Empty extraction result — previous output preserved."
- **(c) Priority:** P1
- **(d) Effort:** S (1 hour)
- **(e) Impact Type:** Security / UX

#### 2.5 No timeout or circuit breaker on combo loop
- **(a) Current State:** If the portal hangs or becomes very slow, the combo loop in [accountsReceivable.ts:L410-L421](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L410-L421) can run indefinitely. There is no global execution timeout.
- **(b) Improvement:** Add a configurable `MAX_TOTAL_RUNTIME_MS` (default 10 minutes) in config. Check elapsed time after each combo. If exceeded, write partial results with a manifest indicating "Execution timed out after N combos."
- **(c) Priority:** P1
- **(d) Effort:** S (2 hours)
- **(e) Impact Type:** Performance / UX

---

### DIMENSION 3 — PERFORMANCE, OPTIMIZATION & WEB VITALS

#### 3.1 Attendance module does full DOM scraping (already addressed above in 1.1)
- **(a) Current State:** The DOM-based approach requires page navigation, dropdown interactions, networkidle waits, and paginated table extraction.
- **(b) Improvement:** API interception eliminates all of this. Single `waitForResponse()` → JSON parse → flatten → write. Expected: ~30s → ~3s.
- **(c) Priority:** P0
- **(d) Effort:** S (4 hours)
- **(e) Impact Type:** Performance

#### 3.2 Dropdown discovery re-runs on every execution
- **(a) Current State:** When `CONFIG.filters.shifts` or `CONFIG.filters.classes` are empty, [accountsReceivable.ts:L358-L402](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L358-L402) performs discovery by reading dropdown options via `readDropdownOptions()` with retries. This adds ~5-10s of DOM interaction per run.
- **(b) Improvement:** Cache discovered options to `output/.combo_cache.json` with a 24-hour TTL. On subsequent runs within the TTL window, read from cache. Add `--no-cache` CLI flag to force fresh discovery.
- **(c) Priority:** P1
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** Performance

#### 3.3 ExcelJS report generation is synchronous and unbounded
- **(a) Current State:** [spreadsheetWriter.ts](file:///home/ticktick/Desktop/playwright/src/utils/spreadsheetWriter.ts) builds the entire workbook in memory and writes it at the end. For very large datasets (1000+ students × 30+ columns), this could consume significant memory.
- **(b) Improvement:** For now, this is acceptable given school-scale data (~500-2000 rows max). **[ASSUMPTION: No school in the target market has >5000 students.]** Flag for monitoring but no action needed at P1.
- **(c) Priority:** P2
- **(d) Effort:** M (2 days)
- **(e) Impact Type:** Scale

---

### DIMENSION 4 — UX, ACCESSIBILITY & FRICTION REDUCTION

#### 4.1 No progress indication during long combo loops
- **(a) Current State:** The user sees raw log lines scrolling during execution. For 30+ combos taking 5+ minutes, there is no indication of overall progress, ETA, or which combo is currently running (beyond individual log messages).
- **(b) Improvement:** Add a progress summary line after each combo: `[Combo 12/34] Class "Two" (Day) — 45 records | Elapsed: 2m 15s | ETA: ~4m`. At completion, print a tabular summary showing records per class.
- **(c) Priority:** P1
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** UX

#### 4.2 Error messages lack actionable guidance
- **(a) Current State:** When login fails, [login.ts:L67](file:///home/ticktick/Desktop/playwright/src/auth/login.ts#L67) logs "Login failed:" with the raw Playwright error. The user gets a timeout stack trace with no guidance on what to check.
- **(b) Improvement:** Map common error patterns to human-readable messages: timeout on login form → "Portal login page did not load. Check PORTAL_BASE_URL and network connectivity."; timeout on dashboard after login → "Credentials may be incorrect. Check PORTAL_USERNAME and PORTAL_PASSWORD in .env."; selector not found → "Portal UI may have changed. Check selectors.ts for updated field labels."
- **(c) Priority:** P1
- **(d) Effort:** S (2 hours)
- **(e) Impact Type:** UX / Dev Velocity

#### 4.3 First-run experience requires manual `.env` configuration
- **(a) Current State:** A new user must: clone repo → npm install → npx playwright install chromium → copy .env.example → manually fill in credentials → `npm start`. No validation or interactive prompts.
- **(b) Improvement:** On first run when `.env` is missing, prompt interactively: "No .env found. Enter PORTAL_USERNAME:" (with `readline`). Write the `.env` file automatically. Validate the portal URL is reachable with a quick HEAD request before launching the browser.
- **(c) Priority:** P2
- **(d) Effort:** M (1 day)
- **(e) Impact Type:** UX / Dev Velocity

---

### DIMENSION 5 — SECURITY, DATA INTEGRITY & COMPLIANCE

#### 5.1 Hardcoded credentials in source code
- **(a) Current State:** [config.ts:L16-L17](file:///home/ticktick/Desktop/playwright/src/config.ts#L16-L17) contains:
  ```typescript
  username: process.env.PORTAL_USERNAME || 'e232290012',
  password: process.env.PORTAL_PASSWORD || '01889534420',
  ```
  These are real production admin credentials. They exist in the git history even if removed from HEAD.
- **(b) Improvement:**
  1. Remove the fallback string literals immediately. Change to: `username: process.env.PORTAL_USERNAME || ''`
  2. In `validateConfig()`, fail hard with `process.exit(1)` if either is empty (already partially implemented but currently non-functional because defaults prevent emptiness).
  3. Purge from git history using `git filter-repo` or `BFG Repo Cleaner`.
  4. Rotate the credentials on the portal immediately.
- **(c) Priority:** P0
- **(d) Effort:** S (1 hour)
- **(e) Impact Type:** Security

#### 5.2 `.gitignore` doesn't cover XLSX output files
- **(a) Current State:** [.gitignore](file:///home/ticktick/Desktop/playwright/.gitignore) ignores `output/*.json` and `errors/*.png` but NOT `output/*.xlsx`. Excel files containing student names, IDs, parent phone numbers, and financial data could be accidentally committed.
- **(b) Improvement:** Add `output/*.xlsx`, `output/*.html`, `output/*.js`, and `output/run_history.json` to `.gitignore`. Consider adding a blanket `output/` ignore.
- **(c) Priority:** P0
- **(d) Effort:** S (5 minutes)
- **(e) Impact Type:** Security / Compliance

#### 5.3 Extracted PII stored unencrypted with no retention policy
- **(a) Current State:** Student names, parent phone numbers, financial balances, and staff contact numbers sit in plaintext JSON and XLSX files in `./output/` indefinitely. No automatic cleanup.
- **(b) Improvement:** Add a `MAX_OUTPUT_AGE_DAYS` env var (default 30). On each run startup, scan `./output/` and delete files older than the threshold. Log deletions. For high-security environments, encrypt output files with a symmetric key derived from a passphrase env var.
- **(c) Priority:** P1
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** Security / Compliance

#### 5.4 `user-data/` contains session cookies with no access restrictions
- **(a) Current State:** The persistent browser profile in `user-data/` contains session cookies that grant full admin access to the portal. Directory permissions are not restricted.
- **(b) Improvement:** After creating `user-data/`, set permissions to `0700` via `fs.chmodSync`. Add a warning log if the directory is world-readable.
- **(c) Priority:** P1
- **(d) Effort:** S (30 minutes)
- **(e) Impact Type:** Security

#### 5.5 OWASP review
- **Injection:** N/A — tool does not accept external user input or construct queries.
- **Broken Auth:** ⚠️ Hardcoded credentials (5.1 above).
- **Sensitive Data Exposure:** ⚠️ XLSX not gitignored (5.2), PII unencrypted (5.3), session cookies unprotected (5.4).
- **Broken Access Control:** N/A — single-user CLI tool.
- **Security Misconfiguration:** ⚠️ `.env.example` comment says "leave blank to use DUHA defaults" — implying credentials are intended to be hardcoded. Remove this comment.
- **XSS:** N/A (no web UI served to users, only local HTML files opened by the operator).
- **Insecure Deserialization:** N/A.
- **Known Vulnerabilities:** Run `npm audit` to check for vulnerable dependencies.
- **Insufficient Logging:** ⚠️ No audit trail of what data was extracted and by whom. Add a signed manifest per run.

---

### DIMENSION 6 — SCALABILITY, ARCHITECTURE & OBSERVABILITY

#### 6.1 Extraction and reporting are tightly coupled
- **(a) Current State:** [accountsReceivable.ts](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts) is a 461-line monolith that handles sidebar navigation, dropdown selection, filter state management, table extraction, raw JSON output, dues filtering, and XLSX generation — all in a single function chain.
- **(b) Improvement:** Split into three layers:
  1. `src/extractors/accountsReceivable.ts` — browser interaction only, returns raw JSON.
  2. `src/processors/duesProcessor.ts` — filtering, enrichment, diff computation (pure functions, testable offline).
  3. `src/reporters/xlsxReporter.ts` + `src/reporters/whatsappReporter.ts` — output generation.
- **(c) Priority:** P2
- **(d) Effort:** M (3 days)
- **(e) Impact Type:** Scale / Dev Velocity

#### 6.2 No structured logging — only colorized console output
- **(a) Current State:** [logger.ts](file:///home/ticktick/Desktop/playwright/src/utils/logger.ts) outputs ANSI-colored strings to stdout. This is un-parseable by log aggregators, un-searchable, and loses context when piped to a file.
- **(b) Improvement:** Add an optional JSON log mode toggled by `LOG_FORMAT=json` env var. In JSON mode, emit `{ timestamp, level, message, context }` objects. Keep the colorized human mode as default.
- **(c) Priority:** P1
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** Dev Velocity / Scale

#### 6.3 No execution metrics
- **(a) Current State:** The only timing data is the `run_history.json` which stores raw/due counts but not duration, per-combo timings, or error rates.
- **(b) Improvement:** Emit a `run_metrics.json` per execution containing: `{ startTime, endTime, durationMs, comboTimings: [{combo, durationMs, recordCount}], errors: [], systemInfo: { nodeVersion, playwrightVersion, os } }`.
- **(c) Priority:** P1
- **(d) Effort:** S (2 hours)
- **(e) Impact Type:** Dev Velocity

---

### DIMENSION 7 — COMMERCIALIZATION, MONETIZATION & IN-APP CONVERSION

#### 7.1 Productize for the eduexpert24 ecosystem
- **(a) Current State:** Built specifically for `duhais.eduexpert24.com` with DUHA-specific selectors and navigation paths.
- **(b) Improvement:** **[ASSUMPTION: eduexpert24.com is a multi-tenant SaaS used by many schools.]** If the portal UI is consistent across tenants, the suite could be sold or licensed to other schools on the platform by simply changing `PORTAL_BASE_URL` and credentials. Validate this assumption by testing against a second school's subdomain.
- **(c) Priority:** P2
- **(d) Effort:** M (3 days to validate + generalize)
- **(e) Impact Type:** Revenue

#### 7.2 Pricing model
- **(a) Current State:** Internal tool, no pricing.
- **(b) Improvement:** If commercialized: per-school monthly subscription ($20-50/month) including automated daily extractions, WhatsApp notification dashboard, and diff reporting. Premium tier adds multi-year historical analytics and API access.
- **(c) Priority:** P2
- **(d) Effort:** L (ongoing)
- **(e) Impact Type:** Revenue

#### 7.3 "Aha moment" analysis
- **(a) Current State:** The aha moment is seeing the first XLSX report generated with filtered dues data. Currently takes ~10-15 minutes from clone to first report (install + config + run + wait).
- **(b) Improvement:** Target <5 minutes: interactive first-run setup (4.3) + API interception (1.1) + progress bar (4.1) = clone → `npm start` → interactive credential prompt → report in ~2 minutes.
- **(c) Priority:** P1
- **(d) Effort:** M (combined with other items)
- **(e) Impact Type:** Retention

---

### DIMENSION 8 — COMPETITIVE DIFFERENTIATION & DEFENSIBILITY

#### 8.1 Unique advantage: dual extraction (attendance + finance) with WhatsApp delivery
- **(a) Current State:** No known competitor automates both attendance and accounts receivable extraction from eduexpert24 portals specifically.
- **(b) Improvement:** Make the WhatsApp notification pipeline a first-class feature. The combination of "extract data + filter overdue + generate WhatsApp collection messages with one click" is a workflow no manual process or generic scraper can match.
- **(c) Priority:** P1
- **(d) Effort:** M (combined with 1.2)
- **(e) Impact Type:** Retention / Moat

#### 8.2 Build switching cost through historical data
- **(a) Current State:** Each run is independent. No longitudinal data.
- **(b) Improvement:** Store every run's extracted data in a lightweight SQLite database (or append-only JSON log). Over time, this becomes a historical ledger of attendance trends and payment collection rates. Users who switch away lose this history. This also enables diff reporting (1.4) and trend dashboards.
- **(c) Priority:** P2
- **(d) Effort:** M (4 days)
- **(e) Impact Type:** Retention / Moat

---

### DIMENSION 9 — AUTOMATION & INTELLIGENCE UPGRADES

#### 9.1 Scheduled unattended execution
- **(a) Current State:** The suite must be manually invoked via `npm start`.
- **(b) Improvement:** Provide a cron template in the README: `0 7 * * 1-5 cd /path/to/project && npm start >> output/cron.log 2>&1`. For advanced users, add a Docker Compose configuration with a built-in cron scheduler.
- **(c) Priority:** P1
- **(d) Effort:** S (2 hours)
- **(e) Impact Type:** UX / Retention

#### 9.2 Smart dues escalation detection
- **(a) Current State:** Dues filtering is binary — a student either has dues or doesn't.
- **(b) Improvement:** When diff reporting (1.4) is implemented, auto-flag students whose dues have increased for 3+ consecutive extractions as "escalating risk." Include this flag in the WhatsApp message to parents as an urgency indicator.
- **(c) Priority:** P2
- **(d) Effort:** M (2 days)
- **(e) Impact Type:** Revenue / UX

#### 9.3 Auto-detect portal UI changes
- **(a) Current State:** When the portal updates its Vue components, selectors break silently (timeout errors).
- **(b) Improvement:** Before each extraction, run a quick "health check" that verifies all critical selectors in [selectors.ts](file:///home/ticktick/Desktop/playwright/src/utils/selectors.ts) can find at least one element on the current page. Log a structured report: `{ selector: "finance.yearDropdown", status: "FOUND" | "MISSING" }`. If any critical selector is missing, abort early with a clear "Portal UI has changed" error instead of timing out 30s later.
- **(c) Priority:** P1
- **(d) Effort:** S (3 hours)
- **(e) Impact Type:** UX / Dev Velocity

---

### DIMENSION 10 — DEVELOPER EXPERIENCE & OPERATOR TOIL

#### 10.1 Zero test coverage
- **(a) Current State:** [package.json](file:///home/ticktick/Desktop/playwright/package.json) has a `test` script but it runs `playwright test` which has no test files. There are zero unit tests for `duesFilter.ts`, `spreadsheetWriter.ts`, `fileWriter.ts`, or any utility.
- **(b) Improvement:** Add tests for the pure-function modules that don't require a browser:
  - `duesFilter.test.ts`: test `parseNumeric()`, `isJunkRow()`, `filterDuesRows()` with edge cases (Unicode names, zero amounts, "Grand Total" rows, empty strings).
  - `spreadsheetWriter.test.ts`: test column filtering logic (`shouldIncludeColumn()`), sorting order, summary row computation.
  - `fileWriter.test.ts`: test backup logic, empty data handling, directory creation.
- **(c) Priority:** P1
- **(d) Effort:** M (2 days)
- **(e) Impact Type:** Dev Velocity

#### 10.2 No `tsconfig.json` strictness
- **(a) Current State:** [tsconfig.json](file:///home/ticktick/Desktop/playwright/tsconfig.json) exists but wasn't reviewed.  **[ASSUMPTION: `strict` mode may not be enabled.]** The codebase uses `any` types extensively (e.g., `Record<string, any>` everywhere).
- **(b) Improvement:** Enable `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`. Define proper interfaces for extracted records (`AttendanceRecord`, `DuesRecord`, `ComboResult`). This prevents entire classes of runtime errors.
- **(c) Priority:** P1
- **(d) Effort:** M (1 day)
- **(e) Impact Type:** Dev Velocity

#### 10.3 Documentation gaps
- **(a) Current State:** README covers basic setup but doesn't document: the combo discovery system, the filter interaction model (REPORT_COLUMNS + PORTAL_DUE_STUDENTS_ONLY), the XLSX column filtering behavior, the run_history system, or troubleshooting common portal errors.
- **(b) Improvement:** Add a `docs/` directory with: `ARCHITECTURE.md` (data flow diagram), `TROUBLESHOOTING.md` (common errors and fixes), `FILTERS.md` (how REPORT_COLUMNS and DUE_STUDENTS_ONLY interact).
- **(c) Priority:** P1
- **(d) Effort:** S (4 hours)
- **(e) Impact Type:** Dev Velocity

#### 10.4 `package.json` has no description, author, or repository
- **(a) Current State:** [package.json:L4-L5](file:///home/ticktick/Desktop/playwright/package.json#L4-L5): `"description": ""`, `"main": "index.js"` (wrong — entry is `src/main.ts`), no `"repository"` field, no `"engines"` field specifying Node.js version requirement.
- **(b) Improvement:** Fill in metadata. Set `"engines": { "node": ">=18" }`. Change `"main"` to `"src/main.ts"`. Add `"repository"` and `"description"`.
- **(c) Priority:** P1
- **(d) Effort:** S (15 minutes)
- **(e) Impact Type:** Dev Velocity

---

## Proposed Changes: Attendance API Interception

Based on the analysis of [attendance_curl_request_response](file:///home/ticktick/Desktop/playwright/attendance_curl_request_response), the portal loads employee attendance data via a `POST` request to `/site/employee/attendance/report/employee-date-wise-attendance-list` with a date-range payload. Instead of scraping the HTML DOM of the page (which is paginated and visually complex), we can intercept this API request to capture the complete structured JSON response directly.

### Interception flow for [attendance.ts](file:///home/ticktick/Desktop/playwright/src/extractors/attendance.ts):

1. **Setup Response Interceptor:**
   Before selecting the month/date range or triggering the report, register a `page.waitForResponse` listener in `extractAttendance`:
   ```typescript
   const responsePromise = page.waitForResponse(
     response => response.url().includes('/employee-date-wise-attendance-list') && response.request().method() === 'POST',
     { timeout: CONFIG.timeouts.navigation }
   );
   ```

2. **Trigger the UI Search:**
   Interact with the dropdown/datepicker as normal to specify the month/dates. When the Vue frontend triggers the API request, our promise will resolve with the response payload.

3. **Extract and Flatten JSON:**
   Parse the captured JSON response:
   ```typescript
   const responseBody = await (await responsePromise).json();
   const employees = responseBody.employee_list || [];
   ```
   For each employee in `employees`, map and flatten their metadata and `date_list` items to maintain a flat, easily consumable JSON output structure.
   
   *Flat record mapping format:*
   ```json
   {
     "Employee ID": 61927,
     "Name": "Hasan Mahmud",
     "Designation": "Director",
     "Contact": "01827879271",
     "Date": "2026-05-01",
     "Status": "Holiday",
     "In Time": null,
     "Out Time": null,
     "Hours": 0,
     "Late": false
   }
   ```
   *Status mapping rules:*
   - If `is_holiday === true` → `"Holiday"`
   - If `is_leave === true` → `"Leave"`
   - If `attendance_status === true` → `"Present"`
   - If `attendance_status === false` → `"Absent"`

4. **Output Generation:**
   Save the flattened array using `writeJsonOutput('attendance', data)`.

### Benefits:
- **Zero UI flakiness:** Eliminates DOM locator breakage risks for tables and pagination controls.
- **Speed:** Instant extraction without clicking through pages.
- **Data completeness:** Captures precise `in_time`, `out_time`, `late_status`, and holiday markers that are often truncated or missing in basic UI tables.

---

## Proposed Changes: WhatsApp & Telegram Notification Generators

The script [wa2.js](file:///home/ticktick/Desktop/playwright/wa2.js) parses staff payroll and attendance data from Microsoft Word files and generates WhatsApp message notifications and an interactive links dashboard. 

In our project, we can adapt this functionality to be **fully automated** by bypassing the need for manual Word files entirely. We will directly feed the scraped, clean JSON databases (extracted from the portal by Playwright) into a TypeScript-based WhatsApp message compiler.

### Adaptation architecture:

1. **New Module — `src/reporters/whatsappReporter.ts`:**
   Implement a utility that takes:
   - A list of parsed employee attendance records (from `extractAttendance`).
   - A list of accounts receivable dues (from `extractAccountsReceivable`).
   - Configuration profiles (from a local `config.json` or `.env` containing staff phone numbers and templates).
   
2. **Message Compilers:**
   - **Staff Salary/Attendance Compiler:** Translates a scraped employee record (which already contains name, designation, present/absent days, and late entries via the intercepted API) into the official slip layout from `wa2.js`.
   - **Outstanding Dues Compiler:** Translates a student accounts receivable record (name, ID, class, total due, parent phone number) into a parent-facing WhatsApp reminder.
     *Example parent message template:*
     ```
     *DUHA INTERNATIONAL SCHOOL*
     *OUTSTANDING DUES NOTICE*
     
     Dear Parent,
     This is to notify you that child *[Student Name]* (ID: [ID], Class: [Class])
     has outstanding balances totaling *BDT [Amount]*.
     
     Please settle the balance as soon as possible.
     _Automated Accounts System_
     ```

3. **Output Files Generation:**
   - Generate `output/wa-data.js` dynamically using ES6 templates.
   - Output `output/WhatsApp-Links-Dashboard.html` featuring a modern, tabbed interface to switch between **Staff Notifications** and **Student Due Notifications**.

4. **Integration into main orchestrator:**
   Expose an option in `.env` (e.g., `GENERATE_WHATSAPP_DASHBOARD=true`). When enabled, the orchestrator (`src/main.ts`) will invoke the generator immediately after saving extraction reports.

### Benefits of Integration:
- **No manual Word files:** Eliminates the error-prone step of manually copying data into Word templates and parsing them with `adm-zip`.
- **Dual-mode dashboard:** Centralizes both employee payroll communication and parent financial follow-ups in a single, local web view.
- **Immediate pipeline flow:** Scraping → Report Compiling → WhatsApp Sending becomes a single seamless workflow.

### Telegram Extension:

5. **New Module — `src/reporters/telegramNotifier.ts`:**
   A post-run notifier script. When execution finishes, it compiles metadata metrics (Run duration, Total Due Students, Outstanding Balance, Attendance Anomalies) and dispatches a markdown message to the Telegram API:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
     -d "chat_id=<YOUR_CHAT_ID>" \
     -d "parse_mode=Markdown" \
     -d "text=*Run Completion Summary*%0A%0A*Total Due Students:* 15%0A*Outstanding Balance:* \$4,500.00%0A*Attendance Anomalies:* 3%0A%0ACheck the dashboard for details."
   ```

6. **Telegram Integration into main orchestrator:**
   Expose options in `.env` (e.g., `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ENABLE_TELEGRAM_NOTIFICATIONS=true`). When enabled, the orchestrator (`src/main.ts`) will invoke the Telegram notifier immediately after saving extraction reports.

---

## Proposed Changes: Standalone HTML Summary Dashboard

Generate a rich, standalone HTML dashboard page alongside the Excel report to give administrators a quick visual overview of outstanding dues and collection health.

### Dashboard Requirements:
- **Visualization:** Include:
  - **Bar Chart**: Total outstanding amount by class (Class One, Class Two, etc.).
  - **Pie Chart**: Collection rate (Paid total vs. Outstanding Due total).
  - **Overdue Trend Line**: Overdue amounts by academic month (January, February, etc.).
  - **Defaulters Table**: A list of the worst defaulters (students with the highest outstanding due amounts, including ID, Name, Class, and Total Due).
- **Embedded Architecture**: The output HTML must be entirely self-contained (no build step, no external local CSS/JS imports). Employs CDN-hosted TailwindCSS for styling and **Chart.js** loaded via `<script>` tag:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  ```
- **Generation Utility**: Create a module `src/reporters/htmlDashboard.ts` which takes the accounts receivable JSON data, calculates aggregates, writes the HTML output to `output/dues_dashboard_YYYY-MM-DD.html`, and links to it from logs.
- **Effort**: Medium

---

## Proposed Changes: Data Change Detection (Diff Engine)

Implement local diffing utilities to identify financial risk changes between consecutive daily automation runs.

### Diff Mechanics:
1. **Snapshot Storage**: On each run, the scraper outputs structured JSON files to `output/`. The previous day's JSON serves as the snapshot.
2. **Comparison Logic (`diffSnapshot` in `src/utils/diffEngine.ts`)**:
   - Compare records by unique Student ID/Roll number.
   - Detect:
     - **New Defaulters**: Students who had 0 or no due record yesterday but have outstanding dues today.
     - **Cleared Dues**: Students who had dues yesterday but have 0 outstanding balance today.
     - **Dues Increased**: Defaulters whose due amount increased (e.g., due to newly added monthly fees).
     - **Dues Decreased**: Defaulters who paid off a portion of their balance.
3. **Output**: Write a structured `output/dues_diff_YYYY-MM-DD.json` diff file and log a warning indicator if significant changes (e.g., total dues increase > 20% or new high-profile defaulters) are detected.
- **Effort**: Low

---

## Proposed Changes: Single Student Payment Ledger & Waiver Tracking

To provide detailed financial auditing, extract individual transaction histories and concessions (waivers) for students with outstanding dues using the portal's API endpoints.

### 1. Student-wise Payment Ledger Extraction
- **API Interception/Request**: For each student identified as "due" in the primary accounts receivable list, make a direct API call:
  - **Endpoint**: `POST https://duhais.eduexpert24.com/site/fee/student-payment-report/get-site-single-student-payment-summary`
  - **Payload**:
    ```json
    {
      "user_name": "2622900113",
      "academic_year_id": 19,
      "active_status": 1
    }
    ```
- **Excel Output**: Save the installments, dates, and amounts paid into a dedicated tab named **Payment Ledger** in the main Excel workbook.
- **Effort**: Medium

### 2. Concession/Waiver Tracking
- **API Extraction**: Collect class-wide fee concessions and waivers granted to students:
  - **Endpoint**: `POST https://duhais.eduexpert24.com/site/fee/student-payment-report/get-site-class-base-waiver-list`
  - **Payload**:
    ```json
    {
      "academic_version_id": 2,
      "academic_year_id": 19,
      "academic_class_id": 30,
      "academic_department_id": null,
      "academic_section_id": null,
      "academic_shift_id": 1,
      "academic_class_group_id": null,
      "academic_class_group_present": false,
      "academic_session_id": null,
      "academic_student_category_id": null,
      "academic_student_type_id": null,
      "academic_student_admission_type_id": null,
      "start_date": null,
      "end_date": null,
      "waiver_type_id": null,
      "active_status": 1
    }
    ```
- **Data Enrichment**: Map waiver reasons (e.g., tuition fee waiver for 12 months) and waiver amounts directly into a new column (**Waiver Amount & Reasons**) in the accounts receivable sheet.
- **Effort**: Medium

---

## Proposed Changes: Automated Scheduling & Cloud Sync

Integrate unattended background scheduling and remote cloud backup capabilities.

1. **Nightly Scheduler (`node-cron`)**:
   Create a daemon/service script `src/scheduler.ts` powered by `node-cron` to execute the scraper automatically.
   - Default schedule: Every day at **8:30 AM**.
   - Cron configuration: `30 8 * * *`.
   - Continuous error catching to ensure the scheduler remains alive even if Playwright instances crash.
2. **Google Drive & Sheets API Sync**:
   Create `src/utils/cloudSync.ts`. When configured via `.env` credentials, it uploads:
   - Generated `.xlsx` spreadsheet files directly to a designated Google Drive folder.
   - Synchronizes raw dues JSON directly into a Google Sheets spreadsheet for online access.

---

## Proposed Changes: Anti-Bot & UX Improvements

1. **Anti-Bot (`ghost-cursor`)**: Emulate human cursor navigation to prevent Cloudflare/WAF detection. Integrate `ghost-cursor` to click dropdown elements, text boxes, and search triggers using organic paths and velocity profiles instead of instantaneous Playwright DOM clicks.
2. **CLI Filters**: Integrate `commander` or `yargs` to configure parameters via command line overrides (e.g., `npm start -- --min-due=5000 --class=One,Five --exclude-shift="Morning"`).
3. **Heartbeat Integration**: Ping third-party endpoints (UptimeRobot, Better Stack) on run begin and end.
4. **Desktop Notifications**: Trigger OS bubble prompts via `node-notifier`.
5. **Tauri Wrapper**: Create configuration files for wrapping the dashboard and CLI runner into a Tauri-based cross-platform desktop application.

---

## 3. PRIORITIZED ROADMAP

### Immediate Wins (P0 — This Week, max 5)

| # | Action | Entry Point | Impact |
|---|--------|-------------|--------|
| 1 | **Remove hardcoded credentials** — delete fallback strings, fail hard on empty, rotate password on portal, purge git history | [config.ts:L16-L17](file:///home/ticktick/Desktop/playwright/src/config.ts#L16-L17) | Security |
| 2 | **Add `output/*.xlsx` to .gitignore** — prevent accidental commit of student PII in Excel reports | [.gitignore](file:///home/ticktick/Desktop/playwright/.gitignore) | Security / Compliance |
| 3 | **Intercept attendance API** — replace DOM scraping with `page.waitForResponse()` on the JSON endpoint, flatten `employee_list[].date_list[]` | [attendance.ts](file:///home/ticktick/Desktop/playwright/src/extractors/attendance.ts) | Performance / UX |
| 4 | **Track failed combos in a run manifest** — maintain `failedCombos[]` array, write `run_manifest.json`, add red INCOMPLETE banner in XLSX | [accountsReceivable.ts:L410-L421](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts#L410-L421) | UX / Security |
| 5 | **Fix `.env.example` comment** — remove "leave blank to use DUHA defaults" which implies hardcoded credentials are intentional | [.env.example:L1](file:///home/ticktick/Desktop/playwright/.env.example#L1) | Security |

---

### Milestone Roadmap (P1 — 30 / 60 / 90 Days)

#### Month 1: Reliability & Observability
*Theme: Make the tool trustworthy enough to run unattended on a daily cron.*
- Write unit tests for `duesFilter.ts`, `spreadsheetWriter.ts`, and `fileWriter.ts`
- Add structured JSON logging mode (`LOG_FORMAT=json`)
- Emit `run_metrics.json` with per-combo timings and system info
- Add actionable error messages for common failure modes (wrong credentials, portal down, selector mismatch)
- Add global execution timeout (`MAX_TOTAL_RUNTIME_MS`)
- Reset `window.__ar*` state variables between combos
- Protect empty array writes in `fileWriter.ts`
- Restrict `user-data/` directory permissions to owner-only
- Implement **Standalone HTML Summary Dashboard** with Chart.js charts (dues by class, collection rate pie, overdue trend by month, top defaulters table)
- Implement **Telegram Notification Pipeline** (`src/reporters/telegramNotifier.ts`) to dispatch run summary metrics after each completed execution
- Implement **Data Change Detection Diff Engine** (`diffSnapshot` in `src/utils/diffEngine.ts`) comparing daily JSON snapshots to identify new defaulters, cleared dues, and amount updates

#### Month 2: UX & WhatsApp Integration
*Theme: Close the loop from data extraction to stakeholder notification.*
- Implement WhatsApp notification generator (`src/reporters/whatsappReporter.ts`)
- Add CLI wrapper with `commander` (override `.env`, `--preview`, `--headed`)
- Add combo progress bar with ETA and per-class summary table
- Cache dropdown discovery with 24-hour TTL
- Add selector health check before extraction runs
- Implement automatic PII cleanup for files older than `MAX_OUTPUT_AGE_DAYS`
- Implement **Student-wise Payment Ledger Extraction** by POSTing to `/get-site-single-student-payment-summary` for each due student; append as dedicated **Payment Ledger** tab in Excel workbook
- Implement **Class-wise Waiver Tracking** using `/get-site-class-base-waiver-list`; add **Waiver Amount & Reasons** column to accounts sheet
- Integrate **Nightly Scheduler (`node-cron`)** via `src/scheduler.ts` set to run daily at 8:30 AM (`30 8 * * *`)
- Integrate **Google Drive & Google Sheets Sync** (`src/utils/cloudSync.ts`) to upload XLSX and sync dues JSON on completion
- Add OS desktop notifications via `node-notifier` on run completion

#### Month 3: Developer Velocity & Documentation
*Theme: Make the project maintainable by anyone on day one.*
- Enable TypeScript strict mode; define proper record interfaces
- Create `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING.md`, `docs/FILTERS.md`
- Fix `package.json` metadata (description, engines, main)
- Add cron template and Docker Compose for scheduled execution
- Decouple extractors from reporters (three-layer architecture)
- Integrate **Human-like Interaction (`ghost-cursor`)** for dropdown clicks and login inputs to bypass WAF/Cloudflare detection
- Build lightweight **Tauri or Electron Desktop App** wrapping the local dashboard and scheduling client into a cross-platform GUI
- Add uptime heartbeats (Better Stack/Cronitor) to monitor cron health

---

### Strategic Bets (P2)

1. **Multi-School Commercialization `[Revenue bet]`**
   Validate that other schools on the eduexpert24 platform have identical portal structures. If so, package as a configurable product sold per-school at $20-50/month with automated daily extractions and WhatsApp notifications.

2. **Historical Data Ledger `[Moat bet]`**
   Store every extraction run in a local SQLite database. Over months, build a longitudinal dataset of attendance trends and payment collection rates. This history becomes a switching cost — users who leave lose their analytics.

3. **Smart Dues Escalation & Diff Reporting `[Retention bet]`**
   Compare each extraction against the previous run. Auto-flag students whose dues increased for 3+ consecutive runs. Generate a "Changes Since Last Run" summary showing new defaulters, cleared balances, and escalating risks.

4. **Dockerized Cloud Runner `[Technical bet]`**
   Package the browser automation into a headless Docker container deployable on AWS ECS / GCP Cloud Run. Triggered by cron or webhook. Outputs reports to S3/GCS and sends Slack/email digests.

5. **Vite/Next.js Financial Web Portal `[UX bet]`**
   Replace the local static HTML dashboard with a full-stack Next.js client hosting the databases, giving administrators historical drilldown tools, user management, and manual override states.

---

### What NOT to Build (Avoid List)

1. **Multi-browser support (Firefox, WebKit)**
   *Why:* The portal is accessed exclusively via Chromium-based browsers. Adding Firefox/WebKit multiplies testing surface with zero user benefit. Playwright's Chromium mode is sufficient.

2. **In-portal write operations (payment processing, attendance marking)**
   *Why:* Automating writes inside the school portal introduces extreme liability. If a script marks a student as "paid" or an employee as "present" incorrectly, the consequences are financial and legal. Keep the tool strictly read-only.

3. **Real-time monitoring dashboard (web server)**
   *Why:* Building a persistent web application to display extraction results in real-time adds massive infrastructure complexity (server hosting, auth, state management) for marginal benefit over the current local XLSX + WhatsApp HTML approach. The target user opens a report once, acts on it, and moves on. A dashboard is only justified if the tool is commercialized as SaaS (Strategic Bet #1).

4. **Full SaaS Auth System early on**
   *Why:* A local database and HTML dashboard meet the administrators' operational needs without hosting cost and web app complexity. Full auth infrastructure is premature until commercialization is validated.

---

## 4. ONE-PARAGRAPH COMMERCIAL PITCH

"The School Management Portal Automation Suite transforms the daily grind of manual school data exports into a lights-out, zero-touch pipeline. In under two minutes, it securely authenticates into your eduexpert24 portal, captures complete staff attendance records via direct API interception, extracts student accounts receivable across every class and shift, filters to outstanding balances, and produces publication-ready Excel ledgers sorted by class and dues amount. It then generates a one-click WhatsApp notification dashboard — letting finance officers send personalized collection reminders to every parent and salary slips to every teacher without composing a single message. Built with credential-safe architecture, automatic PII rotation, and exhaustive run manifests, it is the first tool purpose-built for the operational reality of schools running on eduexpert24 — and every school on the platform can be onboarded by changing a single URL."
