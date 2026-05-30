# task-portal-automation-suite.md

## Relevant Files

- `src/config.ts` — Credential defaults, validation, MAX_TOTAL_RUNTIME_MS, MAX_OUTPUT_AGE_DAYS
- `src/auth/login.ts` — Login logic; actionable error message mapping
- `.gitignore` — Output file PII exclusions
- `.env.example` — Environment variable template
- `src/extractors/attendance.ts` — Attendance extractor; DOM scraping → API interception refactor
- `src/extractors/accountsReceivable.ts` — Combo loop, failedCombos tracking, timeout, window state reset
- `src/extractors/paymentLedger.ts` — Per-student payment ledger API extraction *(new)*
- `src/extractors/waiverExtractor.ts` — Class-wide waiver/concession API extraction *(new)*
- `src/utils/attendanceFlattener.ts` — Flattens `employee_list[].date_list[]` into flat records *(new)*
- `src/utils/errorHandler.ts` — Fatal error handler; screenshot try-catch hardening
- `src/utils/fileWriter.ts` — JSON output writing; empty-array guard; PII cleanup
- `src/utils/fileWriter.test.ts` — Unit tests for fileWriter *(new)*
- `src/utils/logger.ts` — Structured JSON logging mode (`LOG_FORMAT=json`)
- `src/utils/selectors.ts` — Selector definitions used by health check
- `src/utils/selectorHealthCheck.ts` — Pre-extraction selector health check *(new)*
- `src/utils/metricsCollector.ts` — Per-run metrics collection and output *(new)*
- `src/utils/comboCache.ts` — Dropdown discovery cache with 24-hour TTL *(new)*
- `src/utils/diffEngine.ts` — Day-over-day dues diff engine *(new)*
- `src/utils/diffEngine.test.ts` — Unit tests for diffEngine *(new)*
- `src/utils/outputCleaner.ts` — PII file auto-cleanup by age *(new)*
- `src/utils/cloudSync.ts` — Google Drive and Google Sheets upload *(new)*
- `src/utils/desktopNotifier.ts` — OS notification on run completion *(new)*
- `src/utils/heartbeat.ts` — Uptime heartbeat pings (Better Stack / Cronitor) *(new)*
- `src/utils/formatHelpers.ts` — Duration formatting helper (`formatDuration`) *(new)*
- `src/processors/duesFilter.ts` — Dues filtering pure functions
- `src/processors/duesFilter.test.ts` — Unit tests for duesFilter *(new)*
- `src/processors/duesProcessor.ts` — Filtering + enrichment layer (refactored out of accountsReceivable) *(new)*
- `src/reporters/xlsxReporter.ts` — XLSX report generation (refactored out of spreadsheetWriter) *(new)*
- `src/reporters/whatsappReporter.ts` — WhatsApp dual-tab HTML dashboard generator *(new)*
- `src/reporters/telegramNotifier.ts` — Telegram post-run summary notifier *(new)*
- `src/reporters/htmlDashboard.ts` — Standalone Chart.js HTML dashboard *(new)*
- `src/utils/spreadsheetWriter.ts` — Legacy Excel writer; to be refactored into xlsxReporter
- `src/utils/spreadsheetWriter.test.ts` — Unit tests for spreadsheetWriter *(new)*
- `src/types/AttendanceRecord.ts` — AttendanceRecord interface *(new)*
- `src/types/DuesRecord.ts` — DuesRecord interface *(new)*
- `src/types/ComboResult.ts` — ComboResult interface *(new)*
- `src/types/PaymentInstallment.ts` — PaymentInstallment interface *(new)*
- `src/types/WaiverRecord.ts` — WaiverRecord interface *(new)*
- `src/scheduler.ts` — node-cron nightly scheduler daemon *(new)*
- `src/cli.ts` — Commander CLI wrapper with flag overrides *(new)*
- `src/main.ts` — Main orchestrator; updated with all new integrations
- `src-tauri/tauri.conf.json` — Tauri desktop app configuration *(new)*
- `package.json` — Metadata, scripts, engines field
- `tsconfig.json` — TypeScript strict mode enablement
- `Dockerfile` — Container definition with Playwright Chromium
- `docker-compose.yml` — Compose file with scraper + scheduler services
- `vitest.config.ts` — Vitest test runner configuration *(new)*
- `docs/ARCHITECTURE.md` — Data flow and module map *(new)*
- `docs/TROUBLESHOOTING.md` — Common errors and fixes *(new)*
- `docs/FILTERS.md` — REPORT_COLUMNS and DUE_STUDENTS_ONLY reference *(new)*

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update the file AND run a git commit covering whats changed (feature/fuctionality+ filename:lineNumber) in commit message  **after completing each atomic sub-sub-task**, not just after completing a parent task.

---

## Tasks

### Phase 0: Setup

- [ ] 0.0 Create feature branch
  - SKIP THIS

---

### Phase 1: Critical Security Hardening (P0)

- [x] 1.0 Remove hardcoded credentials from `config.ts` and purge git history
  - [x] 1.1 Patch credential fallback strings in `src/config.ts`
    - [x] 1.1.1 Open `src/config.ts` and locate the `username` field at L16 containing `|| 'e232290012'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.2 Replace `|| 'e232290012'` with `|| ''` on the username line [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.3 Locate the `password` field at L17 containing `|| '01889534420'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.4 Replace `|| '01889534420'` with `|| ''` on the password line [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.5 Locate `validateConfig()` function in `config.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.6 Add guard: `if (!config.credentials.username) { logger.error('PORTAL_USERNAME must be set in .env'); process.exit(1); }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.7 Add guard: `if (!config.credentials.password) { logger.error('PORTAL_PASSWORD must be set in .env'); process.exit(1); }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [x] 1.1.8 Run `npm start` with `PORTAL_USERNAME=` left blank in `.env` and confirm the process exits with the descriptive error [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.2 Purge credentials from git history
    - [ ] 1.2.1 Install `git-filter-repo` if not present: `pip install git-filter-repo` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.2.2 Create a replacements text file `replacements.txt` with content: `e232290012==>REDACTED_USER` and `01889534420==>REDACTED_PASS` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.2.3 Run `git filter-repo --replace-text replacements.txt` to rewrite history [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.2.4 Run `git log --all -p | grep e232290012` and confirm zero matches [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.2.5 Force push purged history: `git push origin --force --all` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.3 Rotate portal credentials
    - [ ] 1.3.1 Log into `duhais.eduexpert24.com` manually and change the admin account password [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.3.2 Update `.env` file with the new rotated password [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 1.3.3 Run `npm start` and confirm successful portal authentication with new credentials [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 1.1 Expand `.gitignore` to cover all PII-containing output files
  - [ ] 1.1.1 Open `.gitignore` in editor and locate the existing `output/` section [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.2 Add line `output/*.xlsx` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.3 Add line `output/*.html` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.4 Add line `output/*.js` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.5 Add line `output/run_history.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.6 Add blanket line `output/` with comment `# All generated output — contains PII` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.7 Run `git status` and confirm no `output/` files appear as untracked or staged [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 1.1.8 Run `git check-ignore -v output/test.xlsx` and confirm the path is ignored [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [x] 1.2 Fix misleading `.env.example` comment
  - [x] 1.2.1 Open `.env.example` and locate the comment referencing "DUHA defaults" [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.2.2 Delete the comment line containing "leave blank to use DUHA defaults" [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.2.3 Replace with comment: `# Required — no defaults. Tool will exit if these are empty.` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.2.4 Verify `PORTAL_USERNAME=` and `PORTAL_PASSWORD=` lines remain blank in the example file [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [x] 1.3 Add undocumented env vars to `.env.example`
  - [x] 1.3.1 Open `src/config.ts` and `src/auth/authenticate.ts` to identify all `process.env.*` references [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.3.2 Add `LOGIN_URL=""` with comment `# Custom login URL override (leave empty to auto-detect from base URL)` to `.env.example` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.3.3 Add `NAVIGATE_CONSOLE_MODE="true"` with comment `# Navigation mode: "true" to use in-browser console click, "false" for standard click with auto-fallback` to `.env.example` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.3.4 Add `HEADED=""` with comment `# Browser mode: "true" to run in headed (visible) mode, "false" or empty for headless` to `.env.example` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [x] 1.3.5 Verify `.env.example` contains all env vars used in `config.ts` and `authenticate.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 2: Core Extraction Architecture (P0)

- [ ] 2.0 Replace DOM scraping in `attendance.ts` with API response interception
  - [ ] 2.1 Audit existing extraction flow
    - [ ] 2.1.1 Read `src/extractors/attendance.ts` and document the current `extractAttendance()` function signature and return type [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.1.2 List all DOM interaction points: dropdown clicks, datepicker interactions, `extractPaginatedTable()` calls, pagination loops [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2 Create attendance flattener utility
    - [ ] 2.2.1 Create `src/utils/attendanceFlattener.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.2 Define function signature: `flattenAttendanceResponse(responseBody: any): FlatAttendanceRecord[]` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.3 Inside function: extract `const employees = responseBody.employee_list || []` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.4 Iterate each employee object and extract top-level fields: `employee_id`, `name`, `designation`, `contact_number` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.5 For each employee, iterate `employee.date_list` entries [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.6 Map status: `if (entry.is_holiday === true)` → Status `"Holiday"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.7 Map status: `else if (entry.is_leave === true)` → Status `"Leave"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.8 Map status: `else if (entry.attendance_status === true)` → Status `"Present"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.9 Map status: `else` → Status `"Absent"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.10 Build and push flat record: `{ "Employee ID", "Name", "Designation", "Contact", "Date", "Status", "In Time", "Out Time", "Hours", "Late" }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.2.11 Return completed flat records array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.3 Register API response interceptor in `attendance.ts`
    - [ ] 2.3.1 In `extractAttendance()`, before any UI interaction, add: `const responsePromise = page.waitForResponse(...)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.3.2 Set interceptor filter: `response => response.url().includes('/employee-date-wise-attendance-list') && response.request().method() === 'POST'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.3.3 Set timeout option: `{ timeout: CONFIG.timeouts.navigation }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.4 Keep UI trigger interactions and resolve the response
    - [ ] 2.4.1 Retain existing dropdown/datepicker interaction code to fire the Vue frontend request [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.4.2 After the trigger, add: `const responseBody = await (await responsePromise).json()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.4.3 Call `flattenAttendanceResponse(responseBody)` and store result in `const flatRecords` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.5 Remove obsolete DOM scraping code
    - [ ] 2.5.1 Delete all `extractPaginatedTable()` calls from `attendance.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.5.2 Delete all pagination loop logic (page number iteration, "next page" click handlers) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.5.3 Delete any `networkidle` wait calls that existed only to support table scraping [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.6 Wire output and verify end-to-end
    - [ ] 2.6.1 Call `writeJsonOutput('attendance', flatRecords)` with the flattened array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.6.2 Run `npm start` with `EXTRACT_ATTENDANCE=true` and confirm `output/attendance_*.json` is created [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.6.3 Open generated JSON and confirm each record has exactly 10 fields [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.6.4 Confirm the `Status` field contains only `"Holiday"`, `"Leave"`, `"Present"`, or `"Absent"` — no nulls or raw booleans [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 2.6.5 Confirm extraction speed is notably faster than previous DOM scraping run (check log timestamps) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 2.1 Add `failedCombos` tracking and `run_manifest.json` to `accountsReceivable.ts`
  - [ ] 2.1.1 Open `src/extractors/accountsReceivable.ts` and locate the combo loop starting around L410 [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.2 Declare `const failedCombos: Array<{ year: string; shift: string; cls: string; error: string }> = []` before the loop [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.3 Record `const startTime = new Date().toISOString()` before the loop [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.4 In the catch block of each combo: push `{ year, shift, cls, error: err.message }` to `failedCombos` instead of only calling `logger.warn` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.5 After the loop: compute `const totalCombos = combos.length` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.6 After the loop: compute `const successfulCombos = totalCombos - failedCombos.length` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.7 Open `src/utils/fileWriter.ts` and add a new exported function `writeRunManifest(data: RunManifest): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.8 Inside `writeRunManifest`: format today's date as `YYYY-MM-DD` and write to `output/run_manifest_${date}.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.9 Include in manifest: `{ totalCombos, successfulCombos, failedCombos, totalRawRecords, totalDueRecords, startTime, endTime, durationMs }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.10 Call `writeRunManifest()` after the combo loop completes in `accountsReceivable.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.11 Open `src/utils/spreadsheetWriter.ts` and locate the summary sheet generation function [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.12 Add an `if (failedCombos.length > 0)` check before inserting the first summary row [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.13 Insert a banner row with text `⚠ INCOMPLETE — ${failedCombos.length} combo(s) failed. See run_manifest.json.` at row 1 of the summary sheet [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.14 Set the banner cell fill using ExcelJS: `{ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.15 Set banner cell font to white and bold for contrast: `{ color: { argb: 'FFFFFFFF' }, bold: true }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.1.16 Run project and open generated XLSX — confirm banner row appears when a simulated failure is injected [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 2.2 Harden `errorHandler.ts` screenshot catch and `fileWriter.ts` empty-array guard
  - [ ] 2.2.1 Open `src/utils/errorHandler.ts` and locate `page.screenshot()` call at L44 [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.2 Wrap `page.screenshot()` in its own `try { ... } catch (screenshotErr) { logger.error('Screenshot failed during fatal error handling', screenshotErr); }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.3 Confirm the new catch block does NOT re-throw — it only calls `logger.error` and continues [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.4 Open `src/utils/fileWriter.ts` and locate the empty-array warning at L27-L29 [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.5 Change `logger.warn(...)` to `logger.error(...)` for the empty data case [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.6 Add logic to detect if a `.bak` backup file already exists at the output path [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.7 If backup exists and data is empty: call `return` immediately to abort the write [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.8 After the early return: add `logger.error('Empty extraction result — previous output preserved.')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 2.2.9 Run project 2+ times and simulate an empty result — confirm the backup file remains and the error log appears [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 3: Reliability & Observability (P1 — Month 1)

- [ ] 3.0 Configure test runner and write unit tests for pure-function modules
  - [ ] 3.1 Set up Vitest
    - [ ] 3.1.1 Install vitest: `npm install -D vitest` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.1.2 Create `vitest.config.ts` in project root [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.1.3 Add `include: ['src/**/*.test.ts']` inside `defineConfig({ test: { ... } })` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.1.4 Replace `"test": "playwright test"` with `"test": "vitest run"` in `package.json` scripts [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.1.5 Run `npm test` and confirm vitest starts without errors (zero tests is fine at this stage) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2 Write `duesFilter.test.ts`
    - [ ] 3.2.1 Create `src/processors/duesFilter.test.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.2 Import `parseNumeric`, `isJunkRow`, `filterDuesRows` from `./duesFilter` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.3 Add test: `parseNumeric('1,234.56')` returns `1234.56` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.4 Add test: `parseNumeric('')` returns `0` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.5 Add test: `parseNumeric(null)` returns `0` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.6 Add test: `parseNumeric(undefined)` returns `0` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.7 Add test: `isJunkRow({ Name: 'Grand Total' })` returns `true` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.8 Add test: `isJunkRow({ Name: '' })` returns `true` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.9 Add test: `isJunkRow({ Name: '   ' })` (whitespace-only) returns `true` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.10 Add test: `isJunkRow({ Name: 'Arif Hassan' })` returns `false` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.11 Add test: `filterDuesRows(records)` removes all rows where due amount is zero [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.12 Add test: `filterDuesRows(records)` removes rows with Unicode-only junk names [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.2.13 Run `npm test` and confirm all duesFilter tests pass [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3 Write `spreadsheetWriter.test.ts`
    - [ ] 3.3.1 Create `src/utils/spreadsheetWriter.test.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.2 Import `shouldIncludeColumn` from `./spreadsheetWriter` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.3 Add test: `shouldIncludeColumn('Student ID', ['Student ID', 'Name'])` returns `true` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.4 Add test: `shouldIncludeColumn('Internal Ref', ['Student ID', 'Name'])` returns `false` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.5 Add test: sorting function orders rows by due amount descending (highest first) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.6 Add test: summary row appends to worksheet data array with correct total [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.3.7 Run `npm test` and confirm all spreadsheetWriter tests pass [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4 Write `fileWriter.test.ts`
    - [ ] 3.4.1 Create `src/utils/fileWriter.test.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.4.2 Import `vi` from `vitest` and mock the `fs` module using `vi.mock('fs')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.4.3 Add test: `writeJsonOutput` calls `fs.copyFileSync` (creating `.bak`) before writing new data [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.4.4 Add test: `writeJsonOutput` with empty array + existing backup returns early without calling `fs.writeFileSync` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.4.5 Add test: `writeJsonOutput` calls `fs.mkdirSync` if `output/` directory does not exist [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 3.4.6 Run `npm test` and confirm all fileWriter tests pass [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.1 Implement structured JSON logging mode in `logger.ts`
  - [ ] 3.1.1 Open `src/utils/logger.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.2 Add at module top: `const isJsonMode = process.env.LOG_FORMAT === 'json'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.3 Refactor the `info()` method to branch: if `isJsonMode`, emit `JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', message, context }) + '\n'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.4 Refactor the `warn()` method with the same JSON branch (level: `'WARN'`) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.5 Refactor the `error()` method with the same JSON branch (level: `'ERROR'`) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.6 Refactor the `debug()` method with the same JSON branch (level: `'DEBUG'`) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.7 Confirm that in non-JSON mode (default), all existing ANSI-colored output is completely unchanged [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.8 Add commented-out line `# LOG_FORMAT=json` to `.env.example` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.1.9 Run project with `LOG_FORMAT=json` set — pipe output to `jq .` and confirm all lines parse as valid JSON [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.2 Emit `run_metrics.json` per execution
  - [ ] 3.2.1 Create `src/utils/metricsCollector.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.2 Add `import * as os from 'os'` at top of file [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.3 Declare module-level `const moduleStart = Date.now()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.4 Declare `const comboTimings: Array<{ combo: string; durationMs: number; recordCount: number }> = []` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.5 Declare `const errors: string[] = []` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.6 Export function `recordComboTiming(combo: string, durationMs: number, recordCount: number): void` that pushes to `comboTimings` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.7 Export function `recordError(message: string): void` that pushes to `errors` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.8 Export function `writeMetrics(): void` that writes `output/run_metrics_${date}.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.9 Inside `writeMetrics`: compute `endTime = new Date().toISOString()` and `durationMs = Date.now() - moduleStart` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.10 Inside `writeMetrics`: populate `systemInfo` with `{ nodeVersion: process.version, os: os.platform(), arch: os.arch() }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.11 Import `recordComboTiming` in `accountsReceivable.ts` and call it after each combo with actual duration and record count [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.12 Import `writeMetrics` in `main.ts` and call it at the end of the run, before process exits [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.2.13 Run project and verify `output/run_metrics_*.json` is created with accurate `durationMs` and populated `comboTimings` array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.3 Add actionable error messages to `login.ts`
  - [ ] 3.3.1 Open `src/auth/login.ts` and locate the catch block around L67 [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.2 Add: `const isTimeout = err.message?.toLowerCase().includes('timeout') ?? false` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.3 Add: `const isSelectorError = err.message?.toLowerCase().includes('waiting for selector') || err.message?.toLowerCase().includes('no element found') ?? false` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.4 Map timeout on login page load → log `"Portal login page did not load. Check PORTAL_BASE_URL and network connectivity."` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.5 Map timeout after credentials submitted → log `"Credentials may be incorrect. Check PORTAL_USERNAME and PORTAL_PASSWORD in .env."` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.6 Map selector error → log `"Portal UI may have changed. Check selectors.ts for updated field labels."` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.7 Add catch-all fallback: `logger.error('Login failed with unrecognized error:', err.message)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.3.8 Test by setting an invalid `PORTAL_BASE_URL` — verify the mapped message appears instead of a raw Playwright stack trace [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.4 Add global execution timeout and window state reset between combos
  - [ ] 3.4.1 Open `src/config.ts` and add `maxTotalRuntimeMs: Number(process.env.MAX_TOTAL_RUNTIME_MS) || 600000` to the config object [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.2 Add commented line `# MAX_TOTAL_RUNTIME_MS=600000` to `.env.example` [Verify environment variables match .env.example before proceeding]
  - [ ] 3.4.3 In `accountsReceivable.ts` combo loop: record `const executionStart = Date.now()` before the loop begins [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.4 At the end of each combo iteration: add `if (Date.now() - executionStart > CONFIG.maxTotalRuntimeMs)` check [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.5 Inside the timeout check: log `logger.warn('Execution timed out after ${i + 1} combos. Writing partial results.')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.6 Inside the timeout check: call `break` to exit the loop [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.7 Confirm `writeRunManifest()` is still called after the loop — it must execute even after a timeout-triggered break [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.8 Test by temporarily setting `MAX_TOTAL_RUNTIME_MS=5000` and running — confirm loop exits early and partial manifest is written [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.9 Locate the beginning of `extractCombo()` function in `accountsReceivable.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.10 Add before the `waitForFunction`: `await page.evaluate(() => { const w = window as any; delete w.__arSession; delete w.__arState; delete w.__arPhase2Start; })` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.4.11 Run project over multiple combos and confirm no stale `window.__ar*` errors appear at combo boundaries [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.5 Restrict `user-data/` directory permissions to owner-only
  - [ ] 3.5.1 Locate in `src/main.ts` (or the module that creates `user-data/`) where the directory is first created [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.5.2 Add `fs.chmodSync('user-data', 0o700)` immediately after the directory creation call [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.5.3 Add startup check: `const stat = fs.statSync('user-data'); if ((stat.mode & 0o077) !== 0) { logger.warn('user-data/ is world-readable — run: chmod 700 user-data'); }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.5.4 Run project and verify `ls -la | grep user-data` shows `drwx------` permissions [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.6 Build standalone HTML Summary Dashboard (`htmlDashboard.ts`)
  - [ ] 3.6.1 Create `src/reporters/htmlDashboard.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.2 Define and export function `generateHtmlDashboard(duesRecords: DuesRecord[]): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.3 Compute bar chart data: group records by class name, sum `totalDue` per class [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.4 Compute pie chart data: `totalPaid` and `totalOutstanding` across all records [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.5 Compute trend line data: group outstanding totals by academic month label [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.6 Sort all records descending by due amount and take the top 10 for the defaulters table [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.7 Build HTML string: open with `<!DOCTYPE html><html lang="en"><head>` including Tailwind CDN `<script src="https://cdn.tailwindcss.com"></script>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.8 Add Chart.js via CDN: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>` in `<head>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.9 Add `<canvas id="chartByClass">` element with surrounding Tailwind card div [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.10 Add `<canvas id="chartCollection">` element with surrounding Tailwind card div [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.11 Add `<canvas id="chartTrend">` element with surrounding Tailwind card div [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.12 Add HTML `<table>` for top defaulters with `<thead>` columns: Rank, ID, Name, Class, Total Due [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.13 Inject all chart data as `const CHART_DATA = {...}` inside a `<script>` tag before the Chart.js initialization [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.14 Add `<script>` block initializing all three `new Chart(...)` instances referencing `CHART_DATA` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.15 Write final HTML string to `output/dues_dashboard_${date}.html` using `fs.writeFileSync` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.16 Log output path: `logger.info('HTML dashboard written: output/dues_dashboard_${date}.html')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.17 Add `GENERATE_HTML_DASHBOARD=false` to `.env.example` [Verify environment variables match .env.example before proceeding]
  - [ ] 3.6.18 In `main.ts`: after dues extraction, check `process.env.GENERATE_HTML_DASHBOARD === 'true'` and call `generateHtmlDashboard()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.6.19 Run project with flag enabled, open the generated HTML in a browser — confirm all 3 charts render and the defaulters table is populated [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.7 Implement Telegram post-run notifier (`telegramNotifier.ts`)
  - [ ] 3.7.1 Create `src/reporters/telegramNotifier.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.2 Read `TELEGRAM_BOT_TOKEN` from `process.env` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.3 Read `TELEGRAM_CHAT_ID` from `process.env` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.4 Define and export `sendTelegramSummary(metrics: RunMetrics): Promise<void>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.5 Compose Markdown message string: include run duration, total due students, outstanding balance total, attendance anomaly count [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.6 Use Node.js built-in `fetch` (Node >=18) to POST to `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.7 Set request body: `JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, parse_mode: 'Markdown', text: messageString })` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.8 Wrap the entire fetch in `try/catch` — on failure, call `logger.warn('Telegram notification failed', err)` and do NOT throw [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.9 Add to `.env.example`: `TELEGRAM_BOT_TOKEN=`, `TELEGRAM_CHAT_ID=`, `ENABLE_TELEGRAM_NOTIFICATIONS=false` [Verify environment variables match .env.example before proceeding]
  - [ ] 3.7.10 In `main.ts`, after `writeMetrics()`: check `if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true')` before calling `sendTelegramSummary()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.7.11 Run project with real bot token and chat ID — confirm Telegram message is received in the target chat [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 3.8 Implement Data Change Detection Diff Engine (`diffEngine.ts`)
  - [ ] 3.8.1 Create `src/utils/diffEngine.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.2 Define `DiffEntry` interface: `{ studentId: string; name: string; previousAmount: number; currentAmount: number }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.3 Define `DiffResult` interface: `{ newDefaulters: DuesRecord[]; clearedDues: DuesRecord[]; duesIncreased: DiffEntry[]; duesDecreased: DiffEntry[] }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.4 Export function `diffSnapshot(previous: DuesRecord[], current: DuesRecord[]): DiffResult` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.5 Inside `diffSnapshot`: build `const prevMap = new Map(previous.map(r => [r.studentId, r]))` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.6 Iterate `current`: if student NOT in `prevMap` and `current.totalDue > 0` → push to `newDefaulters` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.7 Iterate `current`: if student IN `prevMap` and `current.totalDue === 0` and `prev.totalDue > 0` → push to `clearedDues` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.8 Iterate `current`: if student IN `prevMap` and `current.totalDue > prev.totalDue` → push `DiffEntry` to `duesIncreased` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.9 Iterate `current`: if student IN `prevMap` and `0 < current.totalDue < prev.totalDue` → push `DiffEntry` to `duesDecreased` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.10 In `main.ts`, after extraction: load previous day's dues JSON from `output/` if it exists [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.11 Call `diffSnapshot(previousRecords, currentRecords)` and store the result [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.12 Write result to `output/dues_diff_${date}.json` using `fs.writeFileSync` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.13 If `duesIncreased.length > 5` OR total balance increase > 20%: log `logger.warn('⚠ Significant dues increase detected. Review dues_diff.json.')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.14 Create `src/utils/diffEngine.test.ts` with test for each of the 4 diff categories [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 3.8.15 Run `npm test` and confirm all diffEngine tests pass [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 4: UX, Notifications & Scheduling (P1 — Month 2)

- [ ] 4.0 Build WhatsApp notification generator (`whatsappReporter.ts`)
  - [ ] 4.1 Implement Staff Salary/Attendance Compiler
    - [ ] 4.1.1 Create `src/reporters/whatsappReporter.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.2 Define and export `generateWhatsAppDashboard(attendance: AttendanceRecord[], dues: DuesRecord[]): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.3 For each unique employee in `attendance`: aggregate total present days, absent days, and late days [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.4 Compose salary slip message string using the `wa2.js` slip format: name, designation, present/absent/late counts [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.5 URL-encode the message: `const encoded = encodeURIComponent(slipMessage)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.6 Build WhatsApp deep link: `` `https://wa.me/${employee.contact}?text=${encoded}` `` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.1.7 Push `{ name, designation, phone, link }` to a `staffLinks` array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2 Implement Outstanding Dues Compiler
    - [ ] 4.2.1 For each student in `dues`: compose parent reminder message using the template from the implementation plan [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.2.2 Include in message: student name, ID, class, total due formatted as `BDT X,XXX` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.2.3 URL-encode the message and build WhatsApp link using parent phone from the dues record [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.2.4 Push `{ studentName, studentId, class: cls, totalDue, phone, link }` to a `parentLinks` array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3 Generate `output/wa-data.js`
    - [ ] 4.3.1 Build a JavaScript string: `const staffLinks = ${JSON.stringify(staffLinks, null, 2)};\nconst parentLinks = ${JSON.stringify(parentLinks, null, 2)};` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.3.2 Write to `output/wa-data.js` using `fs.writeFileSync` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4 Generate `output/WhatsApp-Links-Dashboard.html`
    - [ ] 4.4.1 Create HTML boilerplate with Tailwind CDN in `<head>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.2 Add two tab buttons: "Staff Salary Slips" and "Student Due Reminders" with click handlers [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.3 Add JS tab-switch logic: clicking a tab shows its panel and hides the other [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.4 Render staff panel: card grid populated from `staffLinks` with employee name, designation, and green "Send Slip" button [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.5 Render parent panel: table populated from `parentLinks` with student name, class, due amount, and "Send Reminder" button [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.6 Add `<script src="./wa-data.js"></script>` before the rendering script to load the data [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.4.7 Write final HTML to `output/WhatsApp-Links-Dashboard.html` using `fs.writeFileSync` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5 Wire into `main.ts`
    - [ ] 4.5.1 Add `GENERATE_WHATSAPP_DASHBOARD=false` to `.env.example` [Verify environment variables match .env.example before proceeding]
    - [ ] 4.5.2 In `main.ts`, after extraction, check `process.env.GENERATE_WHATSAPP_DASHBOARD === 'true'` and call `generateWhatsAppDashboard()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 4.5.3 Run project with flag enabled, open dashboard in browser — verify both tabs render with correct links [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.1 Add CLI wrapper using `commander`
  - [ ] 4.1.1 Install commander: `npm install commander` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.2 Create `src/cli.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.3 Import `Command` from `commander` and `runMain` from `./main` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.4 Define `--year <year>` option with description and type coercion to `parseInt` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.5 Define `--shift <shift>` option [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.6 Define `--class <classes>` option (comma-separated; parsed with `.split(',')`) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.7 Define `--type <type>` option restricted to `'dues' | 'attendance' | 'all'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.8 Define `--whatsapp` boolean flag [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.9 Define `--preview` boolean flag for dry-run mode [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.10 Define `--headed` boolean flag [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.11 Define `--no-cache` boolean flag [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.12 Define `--min-due <amount>` numeric option [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.13 After `.parse()`, merge CLI option values into `CONFIG`, overriding any `.env` values for matching keys [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.14 Update `package.json` `"start"` script to `"tsx src/cli.ts"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.1.15 Run `npm start -- --year 2026 --type dues --preview` and confirm dry-run completes without writing any files [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.2 Add combo progress bar with ETA
  - [ ] 4.2.1 Create `src/utils/formatHelpers.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.2 Implement and export `formatDuration(ms: number): string` that returns `"Xm Ys"` format [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.3 In `accountsReceivable.ts` combo loop: record `const comboStart = Date.now()` at the top of each iteration [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.4 After each combo completes: compute `const elapsed = Date.now() - executionStart` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.5 Compute ETA: `const eta = (elapsed / (i + 1)) * (totalCombos - i - 1)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.6 Log: `` logger.info(`[Combo ${i + 1}/${totalCombos}] Class "${cls}" (${shift}) — ${records} records | Elapsed: ${formatDuration(elapsed)} | ETA: ~${formatDuration(eta)}`) `` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.7 After all combos complete: call `console.table(summaryRows)` where `summaryRows` has `{ class, shift, recordCount }` per combo [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.2.8 Run project and verify progress lines appear after each combo and summary table prints at the end [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.3 Cache dropdown discovery with 24-hour TTL
  - [ ] 4.3.1 Create `src/utils/comboCache.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.2 Define `ComboCache` interface: `{ shifts: string[]; classes: string[]; cachedAt: number }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.3 Implement `loadCache(): ComboCache | null` — reads `output/.combo_cache.json` if it exists, returns null on any error [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.4 Implement `isCacheValid(cache: ComboCache): boolean` — returns `Date.now() - cache.cachedAt < 86400000` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.5 Implement `saveCache(shifts: string[], classes: string[]): void` — writes to `output/.combo_cache.json` with current timestamp [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.6 In `accountsReceivable.ts` discovery block: before running `readDropdownOptions()`, call `loadCache()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.7 If cache exists and is valid (and `--no-cache` flag is not set): use cached options, log `"Using cached combo options (TTL valid)"` and skip DOM discovery [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.8 If no valid cache (or `--no-cache` flag): run discovery as before, then call `saveCache()` with discovered values [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.9 Add `output/.combo_cache.json` to `.gitignore` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.3.10 Run project twice back-to-back — confirm the second run logs "Using cached combo options" and skips dropdown interactions [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.4 Implement selector health check before extraction
  - [ ] 4.4.1 Create `src/utils/selectorHealthCheck.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.2 Import `SELECTORS` from `src/utils/selectors.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.3 Define `CRITICAL_SELECTORS` array listing: finance sidebar link, year dropdown, shift dropdown, class dropdown, search/submit button, results table container [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.4 Define `HealthReport` interface: `{ results: Array<{ selector: string; status: 'FOUND' | 'MISSING' }> }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.5 Implement `runSelectorHealthCheck(page: Page): Promise<HealthReport>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.6 For each selector in `CRITICAL_SELECTORS`: call `await page.locator(selector).count()` with a 3000ms timeout [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.7 If count > 0: push `{ selector, status: 'FOUND' }`; if count === 0 or timeout: push `{ selector, status: 'MISSING' }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.8 Log the full health report as a JSON object via `logger.info` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.9 If any result has `status: 'MISSING'`: throw `new Error('Portal UI has changed — aborting. Check selectors.ts.')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.10 Call `runSelectorHealthCheck(page)` in `main.ts` after login completes and before any extractor is invoked [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.4.11 Test: temporarily break a selector name in `selectors.ts` and confirm the abort error fires before any extraction begins [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.5 Implement automatic PII file cleanup
  - [ ] 4.5.1 Add `maxOutputAgeDays: Number(process.env.MAX_OUTPUT_AGE_DAYS) || 30` to `src/config.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.2 Add commented line `# MAX_OUTPUT_AGE_DAYS=30` to `.env.example` [Verify environment variables match .env.example before proceeding]
  - [ ] 4.5.3 Create `src/utils/outputCleaner.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.4 Implement `cleanOldOutputFiles(outputDir: string, maxAgeDays: number): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.5 List all files in `outputDir` using `fs.readdirSync()`, filtering for files only (not subdirectories) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.6 For each file: compute age in days using `(Date.now() - fs.statSync(filePath).mtimeMs) / 86400000` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.7 If `age > maxAgeDays`: delete with `fs.unlinkSync(filePath)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.8 Log each deletion: `` logger.info(`Deleted old output file: ${filename} (age: ${Math.floor(age)} days)`) `` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.9 Call `cleanOldOutputFiles('output', CONFIG.maxOutputAgeDays)` at the start of `main.ts` before any extraction [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.5.10 Test: manually create a dummy file in `output/` and use `touch -d '35 days ago'` to backdate it — verify it is deleted on next run [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.6 Implement Student-wise Payment Ledger extraction
  - [ ] 4.6.1 Create `src/types/PaymentInstallment.ts` and define interface: `{ studentId: string; studentName: string; feeHead: string; dueAmount: number; paidAmount: number; paymentDate: string | null }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.2 Create `src/extractors/paymentLedger.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.3 Define and export `extractPaymentLedger(page: Page, studentUserName: string, academicYearId: number): Promise<PaymentInstallment[]>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.4 Inside function: use `page.evaluate()` to POST to `/site/fee/student-payment-report/get-site-single-student-payment-summary` with payload `{ user_name: studentUserName, academic_year_id: academicYearId, active_status: 1 }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.5 Parse the response and map installment records to `PaymentInstallment[]` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.6 Add error handling: if API returns error or empty, return `[]` and log a warning [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.7 In `accountsReceivable.ts` extraction: after identifying due students, iterate each and call `extractPaymentLedger()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.8 Collect all payment installments into a flat `allLedgerRecords` array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.9 In `src/utils/spreadsheetWriter.ts`: add function `addPaymentLedgerSheet(workbook: Workbook, ledgerData: PaymentInstallment[]): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.10 Inside function: create a new worksheet named `"Payment Ledger"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.11 Add columns: Student ID, Student Name, Fee Head, Due Amount, Paid Amount, Payment Date [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.12 Populate rows from `ledgerData` array [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.13 Call `addPaymentLedgerSheet()` in the spreadsheet generation pipeline after the main dues sheet [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.6.14 Run project and open the generated XLSX — verify the "Payment Ledger" tab exists and contains per-student installment rows [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.7 Implement Class-wise Waiver Tracking
  - [ ] 4.7.1 Create `src/types/WaiverRecord.ts` and define interface: `{ studentId: string; studentName: string; waiverType: string; amount: number; reason: string }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.2 Create `src/extractors/waiverExtractor.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.3 Define and export `extractWaivers(page: Page, classId: number, shiftId: number, academicYearId: number): Promise<WaiverRecord[]>` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.4 Inside function: POST to `/site/fee/student-payment-report/get-site-class-base-waiver-list` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.5 Construct full payload with all required fields: `academic_version_id`, `academic_year_id`, `academic_class_id`, `academic_shift_id`; set all optional nullable fields to `null` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.6 Parse response and map to `WaiverRecord[]` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.7 In `accountsReceivable.ts`, after extracting each class+shift+year combo: call `extractWaivers()` and collect results [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.8 Build `const waiverMap = new Map(waiverRecords.map(w => [w.studentId, w]))` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.9 In `spreadsheetWriter.ts` dues sheet: after the due amount column, add a new column `"Waiver Amount & Reasons"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.10 For each dues row: look up student ID in `waiverMap` and set cell value to `"${waiver.amount} — ${waiver.reason}"` or leave blank if no waiver [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.7.11 Run project and open XLSX — verify "Waiver Amount & Reasons" column is present and populated for concession students [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.8 Integrate `node-cron` nightly scheduler
  - [ ] 4.8.1 Install node-cron: `npm install node-cron` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.2 Install type definitions: `npm install -D @types/node-cron` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.3 Refactor `main.ts` to export a `runExtraction(): Promise<void>` function instead of executing imperatively at module load [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.4 Create `src/scheduler.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.5 Import `cron` from `node-cron` and `runExtraction` from `./main` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.6 Add startup log: `logger.info('Scheduler started. Next extraction at 8:30 AM daily.')` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.7 Schedule cron job: `cron.schedule('30 8 * * *', async () => { ... })` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.8 Inside callback: wrap `await runExtraction()` in `try/catch` — on error, call `logger.error(...)` but do NOT let the process crash [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.9 Add `"scheduler": "tsx src/scheduler.ts"` to `package.json` scripts [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.10 Run `npm run scheduler` — verify startup log appears and process stays alive [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.8.11 Temporarily change cron expression to `* * * * *` (every minute) and confirm job fires — then restore to `30 8 * * *` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.9 Integrate Google Drive & Google Sheets sync
  - [ ] 4.9.1 Install googleapis: `npm install googleapis` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.2 Create `src/utils/cloudSync.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.3 Import `google` from `googleapis` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.4 Read `GOOGLE_SERVICE_ACCOUNT_JSON` (path to service account key file) from `process.env` [Verify environment variables match .env.example before proceeding]
  - [ ] 4.9.5 Read `GOOGLE_DRIVE_FOLDER_ID` from `process.env` [Verify environment variables match .env.example before proceeding]
  - [ ] 4.9.6 Read `GOOGLE_SHEET_ID` from `process.env` [Verify environment variables match .env.example before proceeding]
  - [ ] 4.9.7 Initialize `google.auth.GoogleAuth` using the service account JSON file with scopes `drive.file` and `spreadsheets` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.8 Implement `uploadToDrive(filePath: string): Promise<void>` using `drive.files.create()` with `media.mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.9 Set `requestBody.parents` to `[GOOGLE_DRIVE_FOLDER_ID]` in the Drive upload call [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.10 Implement `syncToSheets(duesRecords: DuesRecord[]): Promise<void>` using `sheets.spreadsheets.values.update()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.11 Set `range: 'Sheet1!A1'` and `valueInputOption: 'RAW'` in the Sheets update call [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.12 Add `GOOGLE_SERVICE_ACCOUNT_JSON=`, `GOOGLE_DRIVE_FOLDER_ID=`, `GOOGLE_SHEET_ID=`, `ENABLE_CLOUD_SYNC=false` to `.env.example` [Verify environment variables match .env.example before proceeding]
  - [ ] 4.9.13 In `main.ts`: after XLSX is written, check `ENABLE_CLOUD_SYNC === 'true'`, then call `uploadToDrive()` followed by `syncToSheets()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.9.14 Run project with real Google credentials — verify XLSX appears in the designated Drive folder and sheet data is updated [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 4.10 Add OS desktop notifications via `node-notifier`
  - [ ] 4.10.1 Install node-notifier: `npm install node-notifier` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.2 Install type definitions: `npm install -D @types/node-notifier` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.3 Create `src/utils/desktopNotifier.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.4 Import `notifier` from `node-notifier` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.5 Implement and export `notifyRunComplete(dueCount: number, outputPath: string): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.6 Call `notifier.notify({ title: 'Extraction Complete', message: \`${dueCount} due students found. Report saved.\`, open: outputPath })` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.7 Import and call `notifyRunComplete()` in `main.ts` at the very end of a successful run, passing the XLSX file path [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 4.10.8 Run project and confirm an OS notification bubble appears on completion [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 5: Developer Velocity, Architecture & Hardening (P1 Month 3 + P2)

- [ ] 5.0 Enable TypeScript strict mode and define typed interfaces
  - [ ] 5.0.1 Open `tsconfig.json` and add `"strict": true` inside `compilerOptions` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.2 Add `"noImplicitAny": true` to `compilerOptions` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.3 Add `"strictNullChecks": true` to `compilerOptions` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.4 Run `npx tsc --noEmit` to surface all current type errors — record the count [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.5 Create `src/types/AttendanceRecord.ts` with all 10 fields typed: `employeeId`, `name`, `designation`, `contact`, `date`, `status`, `inTime`, `outTime`, `hours`, `late` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.6 Create `src/types/DuesRecord.ts` with fields: `studentId`, `studentName`, `class`, `shift`, `year`, `totalDue`, `parentPhone` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.7 Create `src/types/ComboResult.ts` with fields: `year`, `shift`, `cls`, `records`, `durationMs`, `status: 'success' | 'failed'`, `error?: string` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.8 Replace all `Record<string, any>` in `attendance.ts` with `AttendanceRecord` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.9 Replace all `Record<string, any>` in `accountsReceivable.ts` with `DuesRecord` or `ComboResult` as appropriate [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.10 Replace remaining `any` types in `spreadsheetWriter.ts`, `fileWriter.ts`, `logger.ts`, and utility files one file at a time [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.11 Re-run `npx tsc --noEmit` after each file fix until zero errors remain [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.0.12 Run project 2+ times end-to-end confirming no new runtime type-related crashes [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.1 Create documentation files
  - [ ] 5.1.1 Create `docs/` directory: `mkdir -p docs` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.1.2 Create `docs/ARCHITECTURE.md`
    - [ ] 5.1.2.1 Add section "Data Flow" with an ASCII diagram: `Browser → Portal API → Playwright → Extractors → Processors → Reporters → output/` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.2.2 Add section "Module Map" listing each `src/` file with its single-line responsibility [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.2.3 Add section "Environment Variables Reference" listing every `.env` key with default value and description [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.1.3 Create `docs/TROUBLESHOOTING.md`
    - [ ] 5.1.3.1 Add entry: "Login timeout" → check `PORTAL_BASE_URL`, network, VPN [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.3.2 Add entry: "Credentials may be incorrect" → verify `.env` values against portal login [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.3.3 Add entry: "Portal UI has changed (selector health check fail)" → update `selectors.ts` using browser DevTools [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.3.4 Add entry: "XLSX has red INCOMPLETE banner" → check `run_manifest.json` for the failed combo details [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.3.5 Add entry: "Empty extraction result — previous output preserved" → portal may have returned no data; confirm date range has activity [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.3.6 Add entry: "node-cron not firing at expected time" → verify system timezone; cron runs in local time [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.1.4 Create `docs/FILTERS.md`
    - [ ] 5.1.4.1 Document `REPORT_COLUMNS`: what it controls, comma-separated column names, default behavior when empty [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.4.2 Document `PORTAL_DUE_STUDENTS_ONLY`: effect on extraction scope and XLSX output [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] 5.1.4.3 Add 3 worked filter combination examples showing config → expected XLSX output [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.2 Fix `package.json` metadata
  - [ ] 5.2.1 Open `package.json` and set `"description": "Playwright automation suite for eduexpert24 school portal — attendance and accounts receivable extraction with WhatsApp notifications"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.2 Change `"main": "index.js"` to `"main": "src/main.ts"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.3 Add `"engines": { "node": ">=18" }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.4 Add `"author": "Md Kawser Hussain <000kawser@gmail.com>"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.5 Add `"repository": { "type": "git", "url": "git+https://github.com/[username]/[repo].git" }` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.6 Run `node -e "require('./package.json')"` to confirm the file is valid JSON [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.2.7 Run `npm install` to verify `package.json` is accepted by npm without errors [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.3 Add cron template to README and create Docker Compose
  - [ ] 5.3.1 Open `README.md` and add section `## Scheduled Execution (Cron)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.2 Add cron template: `` `0 7 * * 1-5 cd /path/to/project && npm start >> output/cron.log 2>&1` `` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.3 Add instructions for editing crontab: `crontab -e` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.4 Create `Dockerfile` in project root [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.5 Set base image: `FROM node:18-slim` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.6 Add `RUN apt-get update && apt-get install -y chromium` (or use Playwright's official install script) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.7 Add `COPY package*.json ./` then `RUN npm ci` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.8 Add `RUN npx playwright install chromium --with-deps` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.9 Add `COPY . .` and `CMD ["npm", "start"]` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.10 Create `docker-compose.yml` with a `scraper` service using the `Dockerfile` and `env_file: .env` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.11 Add `volumes: - ./output:/app/output` to the `scraper` service so outputs are accessible on the host [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.12 Add a `scheduler` service to `docker-compose.yml` that runs `npm run scheduler` using the same image [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.3.13 Run `docker-compose build` 2+ times — confirm image builds without errors [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.4 Decouple extractors from reporters (three-layer architecture)
  - [ ] 5.4.1 Create `src/processors/duesProcessor.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.2 Move all dues filtering logic from `accountsReceivable.ts` into `duesProcessor.ts` as a pure function [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.3 Define and export `processDues(rawRecords: RawRecord[]): DuesRecord[]` in `duesProcessor.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.4 Create `src/reporters/xlsxReporter.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.5 Move all ExcelJS workbook generation logic from `spreadsheetWriter.ts` into `xlsxReporter.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.6 Define and export `generateXlsxReport(duesRecords: DuesRecord[], manifest: RunManifest, ledger: PaymentInstallment[], waivers: WaiverRecord[]): void` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.7 Update `accountsReceivable.ts` to contain ONLY browser interaction — all filter and Excel logic delegated to the new layers [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.8 Update all import paths in `main.ts` to reference the new module locations [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.9 Run `npx tsc --noEmit` — confirm zero broken imports or type errors [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.4.10 Run project end-to-end 2+ times — confirm XLSX output is identical to pre-refactor output [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.5 Integrate `ghost-cursor` for human-like browser interaction
  - [ ] 5.5.1 Install ghost-cursor: `npm install ghost-cursor` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.2 Open `src/auth/login.ts` and add `import { createCursor } from 'ghost-cursor'` at the top [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.3 Add `const cursor = createCursor(page)` inside `performLogin()` before any interactions [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.4 Replace `page.click(selectors.usernameField)` with `await cursor.click(selectors.usernameField)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.5 Replace `page.click(selectors.passwordField)` with `await cursor.click(selectors.passwordField)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.6 Replace `page.click(selectors.loginButton)` with `await cursor.click(selectors.loginButton)` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.7 Open `accountsReceivable.ts` and add `import { createCursor } from 'ghost-cursor'` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.8 Create `const cursor = createCursor(page)` inside `extractAccountsReceivable()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.9 Replace all dropdown `page.click()` calls (year, shift, class dropdowns) with `cursor.click()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.10 Replace the search/submit button click with `cursor.click()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.11 Run project with `--headed` flag — visually verify mouse moves organically to each element [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.5.12 Run project headless 2+ times — confirm no timeout regressions introduced by ghost-cursor's movement delays [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.6 Scaffold Tauri desktop app wrapper
  - [ ] 5.6.1 Install Tauri CLI: `npm install -D @tauri-apps/cli` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.2 Run `npx tauri init` to scaffold `src-tauri/` directory and `tauri.conf.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.3 Set `"productName": "School Portal Automation Suite"` in `tauri.conf.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.4 Set `"distDir"` in `tauri.conf.json` to point to `"../output"` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.5 Create a minimal `output/index.html` shell with two buttons: "Run Extraction" and "Open Dashboard" [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.6 In `src-tauri/src/main.rs`: add a Tauri command `start_extraction` that runs `npm start` via `std::process::Command` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.7 In `src-tauri/src/main.rs`: add a Tauri command `open_dashboard` that opens the latest `output/dues_dashboard_*.html` file [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.8 Wire the two HTML buttons to invoke the corresponding Tauri commands via `__TAURI__.invoke()` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.9 Add `"tauri": "tauri dev"` script to `package.json` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.6.10 Run `npm run tauri` — verify the Tauri window opens with both buttons visible and functional [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

- [ ] 5.7 Add uptime heartbeat pings
  - [ ] 5.7.1 Add `HEARTBEAT_URL=` to `.env.example` with comment: `# Paste your Better Stack / Cronitor / UptimeRobot heartbeat URL here` [Verify environment variables match .env.example before proceeding]
  - [ ] 5.7.2 Create `src/utils/heartbeat.ts` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.3 Read `HEARTBEAT_URL` from `process.env`; if empty, all ping functions are no-ops [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.4 Implement and export `pingStart(): Promise<void>` — GET request to `${HEARTBEAT_URL}/start` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.5 Implement and export `pingEnd(): Promise<void>` — GET request to `${HEARTBEAT_URL}` (base URL signals success) [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.6 Implement and export `pingFail(error: string): Promise<void>` — GET request to `${HEARTBEAT_URL}/fail?msg=${encodeURIComponent(error)}` [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.7 Wrap all three fetch calls in `try/catch` — failures log a warning but NEVER throw or crash the main process [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.8 In `main.ts`: call `await pingStart()` as the very first line [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.9 In `main.ts`: call `await pingEnd()` immediately before the process completes successfully [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.10 In the top-level `catch` block in `main.ts`: call `await pingFail(err.message)` before re-throwing or exiting [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] 5.7.11 Run project 2+ times with a real heartbeat URL — confirm both start and end pings are received in the monitoring dashboard [Loop: Run project 2+ times back-to-back -> Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
