# School Management Portal Automation Suite — Execution Task Checklist

> **Implementation Protocol:** Every atomic task (lowest indentation level) must be followed by its verification loop before you proceed to the next item. Never write large blocks of code in a single pass. Implement one unit → run → verify → continue.
>
> **Loop shorthand used below:**
> `[Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]`

---

### Phase 1: P0 Security — Remove Hardcoded Credentials

- [ ] Harden credential handling in `src/config.ts`
  - [ ] Remove fallback credential string literals
    - [ ] Open `src/config.ts` and locate the `username` and `password` fallback literals on L16-L17. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Replace `process.env.PORTAL_USERNAME || 'e232290012'` with `process.env.PORTAL_USERNAME || ''`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Replace `process.env.PORTAL_PASSWORD || '01889534420'` with `process.env.PORTAL_PASSWORD || ''`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Enforce hard `process.exit(1)` on empty credentials inside `validateConfig()`
    - [ ] Locate the `validateConfig()` function in `src/config.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add the guard: `if (!config.credentials.username || !config.credentials.password) { logger.error('PORTAL_USERNAME and PORTAL_PASSWORD must be set in .env'); process.exit(1); }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Run `npm start` without a populated `.env` and confirm the process exits immediately with a clear error — no browser is launched. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Purge credentials from git history
    - [ ] Install `git-filter-repo` or download BFG Repo Cleaner to the local machine. [Verify environment variables match .env.example before proceeding]
    - [ ] Run `git filter-repo --replace-text <(echo 'e232290012==>REDACTED_USERNAME')` (or BFG equivalent) to scrub all credential strings from every commit. [Verify environment variables match .env.example before proceeding]
    - [ ] Repeat the filter-repo pass for the password string `01889534420`. [Verify environment variables match .env.example before proceeding]
    - [ ] Force-push the rewritten history to the remote repository: `git push --force --all`. [Verify environment variables match .env.example before proceeding]
    - [ ] Coordinate an immediate credential rotation on the live portal admin panel after the history purge is confirmed. [Verify environment variables match .env.example before proceeding]
  - [ ] Fix the misleading `.env.example` comment
    - [ ] Open `.env.example` and locate the line on L1 that references "DUHA defaults". [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Remove the "leave blank to use DUHA defaults" comment and replace it with: `# Required — no default values exist. Leaving blank causes an immediate startup failure.`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 2: P0 Security — `.gitignore` & PII Data Exposure

- [ ] Update `.gitignore` to cover all sensitive output file types
  - [ ] Add XLSX output pattern to `.gitignore`
    - [ ] Open `.gitignore` and add the entry `output/*.xlsx` below the existing `output/*.json` line. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `output/*.html` to prevent accidental HTML dashboard commits. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `output/*.js` to prevent `wa-data.js` output commits. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `output/run_history.json` to `.gitignore`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `output/ledger.db` to `.gitignore` (for the future SQLite ledger introduced in Phase 33). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Run `git status` and confirm no existing output files appear as untracked and no previously-tracked output files remain in the index. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 3: P0 Attendance Module — Replace DOM Scraping with API Interception

- [ ] Refactor `src/extractors/attendance.ts` to intercept the portal's JSON API
  - [ ] Register the `page.waitForResponse()` interceptor before any UI interaction
    - [ ] Open `src/extractors/attendance.ts` and identify the function where dropdown/date-picker interactions occur. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Declare the response promise before any navigation or click: `const responsePromise = page.waitForResponse(response => response.url().includes('/employee-date-wise-attendance-list') && response.request().method() === 'POST', { timeout: CONFIG.timeouts.navigation });`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Verify the interceptor is registered before any UI action that could trigger the POST request. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Trigger the existing UI interactions to fire the API request
    - [ ] Retain the existing dropdown/date-picker selection logic (month, year) so the Vue frontend issues its POST request. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Click the "Search" or "Generate Report" button to initiate the API call. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Await the intercepted response: `const response = await responsePromise;`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Parse and validate the captured JSON response
    - [ ] Parse the response body: `const responseBody = await response.json();`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Extract the employee list: `const employees = responseBody.employee_list || [];`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log the raw `employees.length` count to confirm data was captured before any transformation. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the attendance status mapping helper
    - [ ] Create a pure helper function `mapAttendanceStatus(day: DayEntry): string` inside `attendance.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add the `is_holiday === true` → `"Holiday"` branch. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add the `is_leave === true` → `"Leave"` branch. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add the `attendance_status === true` → `"Present"` branch. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add the fallback `else` → `"Absent"` branch. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Flatten employee × date records into the canonical output format
    - [ ] Write `flattenAttendanceData(employees: EmployeeEntry[]): AttendanceRecord[]` that iterates over each employee, then each day in `employee.date_list`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Map each `employee × day` pair to the flat record shape: `{ "Employee ID", "Name", "Designation", "Contact", "Date", "Status", "In Time", "Out Time", "Hours", "Late" }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `mapAttendanceStatus(day)` to populate the `"Status"` field. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log the total flattened record count before writing. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Remove all legacy DOM-scraping and pagination code
    - [ ] Delete all calls to `extractPaginatedTable()` within the attendance extractor. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Remove any `waitForSelector()` or `innerHTML` parsing logic targeting the HTML table rows. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Delete the "next page" click loop that iterated through paginated results. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Save the output using the existing file writer
    - [ ] Call `writeJsonOutput('attendance', flattenedRecords)` with the result of `flattenAttendanceData()`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Run a full attendance extraction against the live portal and confirm the output JSON contains `"In Time"`, `"Out Time"`, `"Status"`, and `"Late"` fields for every record. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 4: P0 Run Manifest & Failed Combo Tracking

- [ ] Implement `failedCombos` tracking in `src/extractors/accountsReceivable.ts`
  - [ ] Declare the `failedCombos` accumulator array
    - [ ] Add `const failedCombos: Array<{ year: string; shift: string; cls: string; error: string }> = [];` at the top of the combo loop function scope. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Capture failed combos instead of silently skipping
    - [ ] Locate the `catch` block at L418-L420 in `accountsReceivable.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Replace the existing `logger.warn(...)` call with `failedCombos.push({ year, shift, cls, error: (e as Error).message });` followed by `logger.error(...)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write `run_manifest_YYYY-MM-DD.json` after the loop completes
    - [ ] After the loop, compute `successfulCombos = totalCombos - failedCombos.length`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Construct the manifest object: `{ totalCombos, successfulCombos, failedCombos, totalRawRecords, totalDueRecords, startTime, endTime, durationMs }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write the manifest to `output/run_manifest_YYYY-MM-DD.json` using `fs.writeFileSync`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log the manifest file path to the console upon successful write. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add a red "INCOMPLETE" banner row to the XLSX summary when combos failed
    - [ ] Add a `failedCombos` parameter to the XLSX report generation function signature in `src/utils/spreadsheetWriter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] At the top of the summary sheet (row 1), conditionally insert a merged cell with red fill and bold text reading `⚠ INCOMPLETE — N combo(s) failed. See run_manifest_YYYY-MM-DD.json for details.` when `failedCombos.length > 0`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Apply `{ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }` fill to every cell in the banner row. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Pass the `failedCombos` array from `accountsReceivable.ts` to the spreadsheet writer call site. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Open the generated XLSX and visually confirm the banner is present (or absent) as expected. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 5: P1 Error Handler — Harden `handleFatalError` Screenshot

- [ ] Wrap the `page.screenshot()` call in a nested try-catch in `src/utils/errorHandler.ts`
  - [ ] Locate the `page.screenshot()` call at approximately L44 of `errorHandler.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Wrap the screenshot in `try { await page.screenshot(...); } catch (screenshotErr) { logger.warn('Screenshot also failed — browser may have crashed:', screenshotErr); }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Confirm the outer `handleFatalError` function never re-throws after a screenshot failure by simulating a browser-crash scenario and checking the process exits cleanly. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 6: P1 State Machine — Reset `window.__ar*` Variables Between Combos

- [ ] Add a `page.evaluate()` reset block at the start of each `extractCombo` call
  - [ ] Enumerate all `window.__ar*` variable names used in the `waitForFunction` state machine at L227-L305 of `accountsReceivable.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `await page.evaluate(() => { window.__arSession = undefined; window.__arState = undefined; window.__arPhase2Start = undefined; /* add any remaining */ });` as the very first statement inside `extractCombo()`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run the full combo loop over at least 3 consecutive combos and confirm via log output that no stale state variables bleed between iterations. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 7: P1 File Writer — Guard Against Empty-Array Overwrites

- [ ] Modify `src/utils/fileWriter.ts` to abort writes on empty data when a backup exists
  - [ ] Locate the empty-data check at approximately L27-L29 in `fileWriter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Elevate the log level from `logger.warn` to `logger.error` for the empty data path. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add a flag that tracks whether a backup of the previous file was created in the same function invocation. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] When `data.length === 0` and a backup exists, skip `fs.writeFileSync` entirely and log: `"Empty extraction result — previous output preserved at <backup path>."`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] When `data.length === 0` and no backup exists (first run), also skip the write and log a clear error explaining no data was produced. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Simulate an empty extraction by temporarily returning `[]` from the extractor, then confirm the previous output file is unchanged on disk. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 8: P1 Global Execution Timeout (Circuit Breaker)

- [ ] Add `MAX_TOTAL_RUNTIME_MS` and enforce it in the combo loop
  - [ ] Add `MAX_TOTAL_RUNTIME_MS=600000` to `.env.example` with a comment explaining the 10-minute default. [Verify environment variables match .env.example before proceeding]
  - [ ] Add `maxTotalRuntimeMs: Number(process.env.MAX_TOTAL_RUNTIME_MS) || 600000` to the config object in `src/config.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Record `const executionStart = Date.now();` immediately before the combo loop in `accountsReceivable.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] After each combo completes, add: `if (Date.now() - executionStart > CONFIG.maxTotalRuntimeMs) { logger.error('Global timeout reached — writing partial results and exiting loop.'); break; }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Ensure partial results are written to the output JSON before the loop exits. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Include `"timedOut": true` and `"completedCombos": N` in `run_manifest.json` when a timeout occurs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 9: P1 Structured JSON Logging Mode

- [ ] Extend `src/utils/logger.ts` to support a machine-readable JSON output mode
  - [ ] Add `LOG_FORMAT=json` to `.env.example` with a comment describing `json` vs. default colorized mode. [Verify environment variables match .env.example before proceeding]
  - [ ] Read the env var at module load: `const isJsonMode = process.env.LOG_FORMAT === 'json';` in `logger.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create a `jsonLog(level: string, message: string, context?: object): void` helper that writes `JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context })` to `process.stdout`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Update `logger.info`, `logger.warn`, `logger.error`, and `logger.debug` to branch: call `jsonLog(...)` when `isJsonMode`, otherwise call the existing ANSI-colored output. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `LOG_FORMAT=json npm start` and pipe output to `jq` to confirm every line is valid JSON with `timestamp`, `level`, and `message` keys. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 10: P1 Execution Metrics (`run_metrics.json`)

- [ ] Create `src/utils/metricsCollector.ts` and integrate it into the main orchestrator
  - [ ] Scaffold the module
    - [ ] Create the file `src/utils/metricsCollector.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define the `RunMetrics` interface: `{ startTime: string; endTime: string; durationMs: number; comboTimings: Array<{ combo: string; durationMs: number; recordCount: number }>; errors: string[]; systemInfo: { nodeVersion: string; playwrightVersion: string; os: string } }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the `MetricsCollector` class methods
    - [ ] Implement `start()` that records `startTime` and captures `process.version`, `os.platform()`, and the Playwright version from `package.json`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `recordCombo(combo: string, durationMs: number, recordCount: number)` that pushes to `comboTimings`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `finish()` that sets `endTime` and computes `durationMs`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `write()` that serializes the collected metrics to `output/run_metrics_YYYY-MM-DD.json`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Integrate `MetricsCollector` into the orchestrator
    - [ ] Instantiate the collector in `src/main.ts` and call `.start()` before any extraction begins. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Pass the collector instance into the accounts receivable extractor function signature. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `collector.recordCombo(...)` after each combo completes, passing the elapsed time and extracted record count. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `collector.finish()` and `collector.write()` after the final output files are saved. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Confirm `output/run_metrics_YYYY-MM-DD.json` is present and contains accurate timings after a full run. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 11: P1 Progress Indication During Combo Loop

- [ ] Add per-combo progress logging with ETA estimation in `accountsReceivable.ts`
  - [ ] Track the current combo index and total combo count before the loop begins. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] After each combo, compute `averageTimePerCombo = elapsedMs / completedCount`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Compute the ETA: `etaMs = averageTimePerCombo * (totalCombos - completedCount)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Log a progress line after every combo: `[Combo N/M] Class "<cls>" (<shift>) — X records | Elapsed: Xm Xs | ETA: ~Xm`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Print a final summary table to the console after all combos finish, with columns `Class | Shift | Records | Duration(s)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 12: P1 Actionable Error Messages for Login Failures

- [ ] Map common Playwright error patterns to human-readable messages in `src/auth/login.ts`
  - [ ] Locate the `catch` block around L67 in `login.ts` where the raw Playwright error is logged. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create an error classifier function `classifyLoginError(err: Error): string` in the same file. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Map `TimeoutError` on the login form → `"Portal login page did not load. Check PORTAL_BASE_URL and network connectivity."`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Map `TimeoutError` on the post-login dashboard selector → `"Credentials may be incorrect. Verify PORTAL_USERNAME and PORTAL_PASSWORD in .env."`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Map element-not-found errors → `"Portal UI may have changed. Review selectors in src/utils/selectors.ts."`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace `logger.error('Login failed:', err)` with `logger.error(classifyLoginError(err))`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 13: P1 Selector Health Check Before Extraction

- [ ] Create `src/utils/selectorHealthCheck.ts` and integrate it into the startup sequence
  - [ ] Create the file `src/utils/selectorHealthCheck.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Define `CRITICAL_SELECTORS: Array<{ name: string; selector: string; context: 'finance' | 'attendance' }>` listing every selector from `selectors.ts` essential for extraction. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `runHealthCheck(page: Page, context: 'finance' | 'attendance'): Promise<HealthCheckReport>` that checks each critical selector via `page.locator(s).count()`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Emit a structured log entry per selector: `{ selector: "finance.yearDropdown", status: "FOUND" | "MISSING" }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] When any critical selector is `"MISSING"`, log `"Portal UI has changed — aborting extraction."` and call `process.exit(1)` before any extractor is invoked. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Call `runHealthCheck()` in `src/main.ts` after successful login but before any extractor runs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run against the live portal and confirm all selectors resolve with status `"FOUND"` in the log output. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 14: P1 PII Cleanup — Automatic Output File Retention Policy

- [ ] Implement automatic deletion of output files older than `MAX_OUTPUT_AGE_DAYS`
  - [ ] Add `MAX_OUTPUT_AGE_DAYS=30` to `.env.example` with a comment about the default 30-day retention window. [Verify environment variables match .env.example before proceeding]
  - [ ] Add `maxOutputAgeDays: Number(process.env.MAX_OUTPUT_AGE_DAYS) || 30` to the config in `src/config.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `cleanupOldOutputs(): void` in `src/utils/outputCleaner.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Inside `cleanupOldOutputs()`, read all files from `output/` via `fs.readdirSync`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] For each file, compare `Date.now() - fs.statSync(filePath).mtimeMs` against `CONFIG.maxOutputAgeDays * 86400000`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Delete files exceeding the threshold with `fs.unlinkSync(filePath)` and log each deletion. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Call `cleanupOldOutputs()` at the very start of `src/main.ts` before the browser launches. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Manually create a dummy file with an `mtime` 31 days in the past (via `fs.utimesSync`) and confirm it is deleted on the next run. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 15: P1 Session Cookie Protection — Restrict `user-data/` Permissions

- [ ] Set `user-data/` to owner-only access immediately after the directory is created
  - [ ] Locate where `user-data/` is first created or referenced in the codebase. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `fs.chmodSync('./user-data', 0o700)` immediately after confirming the directory exists. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add a startup check: read `fs.statSync('./user-data').mode` and log a `logger.warn` if the directory is world-readable (bits set for group/other read). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Confirm with `ls -la .` that `user-data/` shows `drwx------` permissions after a run on a Unix system. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 16: P1 Dropdown Discovery Cache

- [ ] Cache discovered dropdown options to `output/.combo_cache.json` with a 24-hour TTL
  - [ ] Create `src/utils/comboCache.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Define the cache schema interface: `{ generatedAt: string; ttlMs: number; shifts: string[]; classes: string[] }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `loadCache(): CacheEntry | null` that reads and parses `output/.combo_cache.json`, returning `null` if the file is missing or if `Date.now() - Date.parse(generatedAt) > ttlMs`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `saveCache(shifts: string[], classes: string[]): void` that writes `{ generatedAt: new Date().toISOString(), ttlMs: 86400000, shifts, classes }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] In `accountsReceivable.ts`, call `loadCache()` before `readDropdownOptions()`. Skip DOM discovery and use cached values if the cache is valid. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] After fresh discovery, call `saveCache(discoveredShifts, discoveredClasses)` to persist the result. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--no-cache` as a recognized CLI flag (wired up fully in Phase 21) that sets a `skipCache: boolean` flag and bypasses `loadCache()`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run twice: confirm the second run logs `"Using cached combo options (valid for Xh Xm)"` and skips all dropdown DOM interaction. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 17: P1 WhatsApp Notification Reporter

- [ ] Create `src/reporters/whatsappReporter.ts` with dual-mode message compilers
  - [ ] Scaffold the module and define interfaces
    - [ ] Create the file `src/reporters/whatsappReporter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define `StaffPayrollMessage`: `{ employeeId: string; name: string; designation: string; contact: string; presentDays: number; absentDays: number; lateDays: number; message: string; whatsappLink: string }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define `ParentDuesMessage`: `{ studentId: string; studentName: string; className: string; parentPhone: string; totalDue: number; message: string; whatsappLink: string }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the staff attendance message compiler
    - [ ] Write `compileStaffMessages(records: AttendanceRecord[]): StaffPayrollMessage[]` that groups records by employee ID. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] For each employee, count `presentDays`, `absentDays`, `lateDays`, and `leaveDays` from the grouped records. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Construct the WhatsApp message body using the salary slip layout from the reference `wa2.js` script. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Generate `whatsappLink` as `https://wa.me/<contact>?text=<encodeURIComponent(message)>`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the parent dues notification compiler
    - [ ] Write `compileParentMessages(dues: DuesRecord[]): ParentDuesMessage[]` that maps each due student record to a parent message. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Compose each message using the outstanding dues notice template (school name, student name/ID/class, total due amount). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Generate `whatsappLink` for each parent using `https://wa.me/<parentPhone>?text=<encodeURIComponent(message)>`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Generate `output/wa-data.js`
    - [ ] Write `generateWaDataJs(staff: StaffPayrollMessage[], parents: ParentDuesMessage[]): void`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Build the file content as an ES6 template literal exporting `const staffMessages = [...]` and `const parentMessages = [...]`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write to `output/wa-data.js` using `fs.writeFileSync`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Generate `output/WhatsApp-Links-Dashboard.html`
    - [ ] Write `generateDashboardHtml(staff: StaffPayrollMessage[], parents: ParentDuesMessage[]): void`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Build a self-contained HTML string with two tab buttons: `"Staff Notifications"` and `"Student Due Notices"`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Render each staff member as a card with name, designation, attendance summary, and a `<a href="...">Open WhatsApp</a>` deep link. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Render each parent notice as a card with student name, class, total due, and a clickable WhatsApp link. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Embed TailwindCSS via CDN `<link>` tag in the `<head>` so the file is fully standalone. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write to `output/WhatsApp-Links-Dashboard.html` using `fs.writeFileSync`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Gate the reporter behind `GENERATE_WHATSAPP_DASHBOARD` and wire into `src/main.ts`
    - [ ] Add `GENERATE_WHATSAPP_DASHBOARD=false` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] In `src/main.ts`, check `process.env.GENERATE_WHATSAPP_DASHBOARD === 'true'` before invoking any function from `whatsappReporter`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Set `GENERATE_WHATSAPP_DASHBOARD=true` in `.env`, run a full extraction, and confirm both `wa-data.js` and `WhatsApp-Links-Dashboard.html` are present in `output/`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Open `WhatsApp-Links-Dashboard.html` in a browser and verify the tab toggle works and at least one WhatsApp link is valid (correct format). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 18: P1 Telegram Run-Completion Notifier

- [ ] Create `src/reporters/telegramNotifier.ts`
  - [ ] Add Telegram credentials to `.env.example`
    - [ ] Add `TELEGRAM_BOT_TOKEN=` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] Add `TELEGRAM_CHAT_ID=` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] Add `ENABLE_TELEGRAM_NOTIFICATIONS=false` to `.env.example`. [Verify environment variables match .env.example before proceeding]
  - [ ] Implement the notifier module
    - [ ] Create `src/reporters/telegramNotifier.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define `RunSummary`: `{ durationMs: number; totalDueStudents: number; totalOutstandingBalance: number; attendanceAnomalies: number }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `sendTelegramNotification(summary: RunSummary): Promise<void>` that POSTs to `https://api.telegram.org/bot${token}/sendMessage`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Build a Markdown-formatted message body using all summary fields. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Use Node.js 18+ built-in `fetch` for the HTTP call — no external HTTP library needed. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Wrap the entire function in a `try-catch` so Telegram API failures never crash the main process. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Integrate into `src/main.ts`
    - [ ] At the end of `main()`, check `process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true'` before calling `sendTelegramNotification(summary)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Enable the feature in `.env`, run a full extraction, and confirm the Telegram message arrives in the configured chat within 30 seconds of run completion. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 19: P1 Standalone HTML Summary Dashboard

- [ ] Create `src/reporters/htmlDashboard.ts` with Chart.js visualizations
  - [ ] Scaffold the module
    - [ ] Create the file `src/reporters/htmlDashboard.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define `DashboardData`: `{ byClass: Record<string, number>; totalPaid: number; totalOutstanding: number; monthlyTrend: Record<string, number>; topDefaulters: DuesRecord[] }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement aggregate computation functions
    - [ ] Write `computeByClass(dues: DuesRecord[]): Record<string, number>` that sums outstanding amounts by class name. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write `computeCollectionRate(all: RawRecord[], dues: DuesRecord[]): { totalPaid: number; totalOutstanding: number }` that derives paid-vs-outstanding totals. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write `computeMonthlyTrend(dues: DuesRecord[]): Record<string, number>` that groups outstanding amounts by fee month. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write `getTopDefaulters(dues: DuesRecord[], limit = 10): DuesRecord[]` that sorts by descending due amount and slices the top N records. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Build the self-contained HTML document string
    - [ ] Write `generateDashboardHtml(data: DashboardData): string` that returns a complete HTML document. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Embed TailwindCSS in the `<head>` via CDN `<link>` tag. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Embed Chart.js in the `<head>` via `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `<canvas id="byClassBar">` and a `<script>` block rendering the bar chart using `byClass` data. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `<canvas id="collectionPie">` and a `<script>` block rendering the collection-rate pie chart. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add `<canvas id="monthlyTrendLine">` and a `<script>` block rendering the overdue trend line chart. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add a `<table>` section for the top defaulters with columns: Student ID, Name, Class, Total Due. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Inject all chart data as inline `<script>` variable declarations so the file needs zero external data files. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write the output file and integrate into `src/main.ts`
    - [ ] Implement `writeDashboard(dues: DuesRecord[], allRecords: RawRecord[]): void` that calls all compute functions, builds the HTML, and writes to `output/dues_dashboard_YYYY-MM-DD.html`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log the dashboard file path after writing. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `writeDashboard()` from `src/main.ts` immediately after the XLSX report is generated. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Open `dues_dashboard_YYYY-MM-DD.html` in a browser and confirm all three charts render with real data and the defaulters table is populated. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 20: P1 Diff Engine — Data Change Detection

- [ ] Create `src/utils/diffEngine.ts` with snapshot comparison logic
  - [ ] Scaffold the module and define interfaces
    - [ ] Create the file `src/utils/diffEngine.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Define `DiffResult`: `{ newDefaulters: DuesRecord[]; clearedDues: DuesRecord[]; duesIncreased: Array<{ record: DuesRecord; previousAmount: number; newAmount: number }>; duesDecreased: Array<{ record: DuesRecord; previousAmount: number; newAmount: number }> }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the snapshot loading function
    - [ ] Write `loadPreviousSnapshot(prefix: string): DuesRecord[] | null` that scans `output/` for the most recent JSON file matching `prefix`, excluding today's file. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Return `null` when no prior snapshot exists (first-run scenario). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the core `diffSnapshot` function
    - [ ] Write `diffSnapshot(previous: DuesRecord[], current: DuesRecord[]): DiffResult`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Build ID-keyed lookup maps for both `previous` and `current` arrays. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Detect new defaulters: students present in `current` but absent from `previous`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Detect cleared dues: students present in `previous` but absent from `current`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Detect dues increased: students in both sets where `current.dueAmount > previous.dueAmount`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Detect dues decreased: students in both sets where `current.dueAmount < previous.dueAmount`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write the diff output file
    - [ ] Write `writeDiffReport(diff: DiffResult, date: string): void` that serializes to `output/dues_diff_YYYY-MM-DD.json`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log a console warning when `diff.newDefaulters.length + diff.duesIncreased.length > 0`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Integrate into `src/main.ts`
    - [ ] After saving the current dues JSON, call `loadPreviousSnapshot('dues')` to retrieve the prior day's data. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] When a prior snapshot exists, call `diffSnapshot(previous, current)` and then `writeDiffReport(diff, todayDate)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Run two consecutive extractions with a manually altered due amount on one test student and confirm the diff file shows a `duesIncreased` entry for that student. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 21: P1 CLI Interface (`commander`)

- [ ] Install `commander` and build the CLI entry point
  - [ ] Run `npm install commander`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `src/cli.ts` as the new top-level entry point. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
- [ ] Define all CLI flags
  - [ ] Add `--year <year>` that overrides the `PORTAL_YEAR` env var. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--shift <shift>` that overrides the shift filter. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--class <classes>` (comma-separated) that overrides the class filter array. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--type <type>` (`attendance` | `dues` | `both`) that controls which extractor runs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--whatsapp` boolean flag that enables the WhatsApp dashboard regardless of `.env`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--preview` boolean flag for a dry-run that skips all file writes. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--headed` boolean flag that launches the browser in headed mode, overriding the `HEADLESS` env var. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `--no-cache` boolean flag that bypasses the combo discovery cache. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
- [ ] Merge CLI flags into `CONFIG` and update the npm start script
  - [ ] After parsing, apply overrides sequentially: `if (options.year) CONFIG.filters.year = options.year;` etc. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Update `package.json` `"start"` script to `"tsx src/cli.ts"`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm start -- --help` and confirm all flags appear with descriptions. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm start -- --type dues --preview` and confirm the extraction runs but no files are written to `output/`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 22: P1 Unit Test Coverage

- [ ] Configure the testing framework
  - [ ] Run `npm install -D vitest`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Update `package.json` `"test"` script to `"vitest run"`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `vitest.config.ts` with `include: ['src/**/*.test.ts']`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm test` on an empty test suite and confirm it exits with zero failures. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
- [ ] Write tests for `src/utils/duesFilter.ts`
  - [ ] Create `src/utils/duesFilter.test.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `parseNumeric()` with Unicode (Bangla) numeral strings — assert it returns the correct numeric value. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `parseNumeric()` with a zero-amount value — assert it returns `0`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `isJunkRow()` with a row named `"Grand Total"` — assert it returns `true`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `isJunkRow()` with an empty-string name — assert it returns `true`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `filterDuesRows()` with a mixed array (junk rows, zero-due students, real defaulters) — assert only real defaulters are returned. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm test` and confirm all `duesFilter.test.ts` cases pass. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
- [ ] Write tests for `src/utils/spreadsheetWriter.ts`
  - [ ] Create `src/utils/spreadsheetWriter.test.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `shouldIncludeColumn()` with a column that is in `REPORT_COLUMNS` — assert it returns `true`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for `shouldIncludeColumn()` with a column absent from the list — assert it returns `false`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for summary row computation with a known fixture — assert the summed totals match expected values exactly. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test verifying the sort order places the highest-due student in row 1. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm test` and confirm all `spreadsheetWriter.test.ts` cases pass. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
- [ ] Write tests for `src/utils/fileWriter.ts`
  - [ ] Create `src/utils/fileWriter.test.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for backup logic: when a prior file exists, assert a `.bak` copy is created before the new write occurs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for the empty-data guard: pass `[]` and assert the original file is retained and no new write occurs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write a test for directory creation: if `output/` does not exist, assert it is created before the write. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm test` and confirm all `fileWriter.test.ts` cases pass. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 23: P1 Nightly Scheduler (`node-cron`)

- [ ] Create `src/scheduler.ts` for unattended daily execution
  - [ ] Run `npm install node-cron && npm install -D @types/node-cron`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create the file `src/scheduler.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Import `node-cron` and the `main` function from `src/main.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Read the schedule from env: `const schedule = process.env.CRON_SCHEDULE || '30 8 * * *';`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Register the cron task: `cron.schedule(schedule, async () => { try { await main(); } catch (err) { logger.error('Scheduler caught unhandled error:', err); } });`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Log the scheduler startup message including the next run time. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `"scheduler": "tsx src/scheduler.ts"` to `package.json` `"scripts"`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `CRON_SCHEDULE=30 8 * * *` to `.env.example`. [Verify environment variables match .env.example before proceeding]
  - [ ] Add a cron usage snippet to `README.md` demonstrating `nohup npm run scheduler &` and `pm2 start npm --name scheduler -- run scheduler`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 24: P2 Student-wise Payment Ledger Extraction

- [ ] Implement per-student payment ledger API extraction and Excel tab
  - [ ] Create the API call function
    - [ ] Create `src/extractors/paymentLedger.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `fetchStudentPaymentSummary(page: Page, userId: string, academicYearId: number): Promise<PaymentInstallment[]>` that POSTs to `/site/fee/student-payment-report/get-site-single-student-payment-summary`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Construct the request payload: `{ user_name: userId, academic_year_id: academicYearId, active_status: 1 }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Use `page.evaluate()` with `fetch()` to execute the call inside the authenticated browser context so session cookies are sent automatically. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Parse and return the installment records from the API response body. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Iterate over due students and collect all ledgers
    - [ ] In `src/main.ts`, after dues extraction, iterate over `dueRecords` and call `fetchStudentPaymentSummary` for each student. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Aggregate all installment records into a flat array. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Log progress: `Fetched ledger for N/M due students`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write the `Payment Ledger` Excel tab
    - [ ] Add `writePaymentLedgerTab(workbook: Workbook, data: PaymentInstallment[]): void` to `src/utils/spreadsheetWriter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add a new worksheet named `"Payment Ledger"` to the workbook. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add column headers: `Student ID, Name, Class, Installment, Due Date, Amount, Paid Date, Paid Amount, Balance`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Populate rows from the ledger data array with alternating row fill colors for readability. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `writePaymentLedgerTab()` before saving the workbook. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Open the generated XLSX and confirm the `Payment Ledger` tab is present and populated with at least one real student's installment history. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 25: P2 Class-wise Waiver Tracking

- [ ] Implement waiver data extraction and Excel enrichment
  - [ ] Create the waiver API function
    - [ ] Create `src/extractors/waiverTracker.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `fetchClassWaivers(page: Page, params: ClassParams): Promise<WaiverRecord[]>` that POSTs to `/site/fee/student-payment-report/get-site-class-base-waiver-list`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Construct the full request payload from `ClassParams` with null-defaulting for all optional fields. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Use `page.evaluate()` with `fetch()` to run the call in the authenticated browser session. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Parse and return the `WaiverRecord[]` array from the response. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Collect waivers for all processed class combinations
    - [ ] After dues extraction, iterate over all unique class/shift/year combinations processed. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `fetchClassWaivers()` for each combination and accumulate results. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Build a lookup map keyed by student ID: `{ studentId → { waiverAmount, waiverReason } }`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Enrich the main accounts sheet with waiver columns
    - [ ] Add `"Waiver Amount"` and `"Waiver Reasons"` columns to the accounts receivable worksheet in `src/utils/spreadsheetWriter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] For each data row, look up the student ID in the waiver map and populate both columns. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Leave the columns empty (not zero) for students with no waiver on record. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Open the XLSX and confirm the waiver columns are present with correct values for at least one student known to hold a waiver. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 26: P2 Google Drive & Sheets Sync

- [ ] Create `src/utils/cloudSync.ts` for Google API integration
  - [ ] Install the dependency: `npm install googleapis`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add Google credentials to `.env.example`
    - [ ] Add `GOOGLE_SERVICE_ACCOUNT_JSON=` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] Add `GOOGLE_DRIVE_FOLDER_ID=` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] Add `GOOGLE_SHEETS_ID=` to `.env.example`. [Verify environment variables match .env.example before proceeding]
    - [ ] Add `ENABLE_CLOUD_SYNC=false` to `.env.example`. [Verify environment variables match .env.example before proceeding]
  - [ ] Implement Google Drive upload
    - [ ] Create `src/utils/cloudSync.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Initialize the Google Auth client using the service account JSON file path from the env var. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Implement `uploadToDrive(filePath: string, mimeType: string): Promise<string>` that uploads to `GOOGLE_DRIVE_FOLDER_ID` and returns the uploaded file's Drive URL. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Call `uploadToDrive` for the generated XLSX file after it is saved locally. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement Google Sheets sync
    - [ ] Implement `syncDuesToSheets(dues: DuesRecord[]): Promise<void>` that clears the target sheet range then appends all due records as rows. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Use `spreadsheets.values.clear` followed by `spreadsheets.values.append` from the Sheets API. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Gate behind `ENABLE_CLOUD_SYNC` and integrate into `src/main.ts`
    - [ ] After all local files are written, check `process.env.ENABLE_CLOUD_SYNC === 'true'` before calling cloud sync functions. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Enable cloud sync, run a full extraction, and confirm the XLSX appears in the target Drive folder and the Sheets tab is populated. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 27: P2 TypeScript Strict Mode & Proper Interfaces

- [ ] Enable strict TypeScript compiler options and replace all `any` usages
  - [ ] Open `tsconfig.json` and add `"strict": true`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `"noImplicitAny": true` to `tsconfig.json`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `"strictNullChecks": true` to `tsconfig.json`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npx tsc --noEmit` and collect the full list of type errors produced. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `src/types/AttendanceRecord.ts` and define the `AttendanceRecord` interface with all fields typed. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `src/types/DuesRecord.ts` and define the `DuesRecord` interface. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `src/types/ComboResult.ts` and define the `ComboResult` interface. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace every `Record<string, any>` usage in `accountsReceivable.ts` with the appropriate typed interface. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace every `Record<string, any>` usage in `spreadsheetWriter.ts` with the appropriate typed interface. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace every `Record<string, any>` usage in `fileWriter.ts` with the appropriate typed interface. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npx tsc --noEmit` again and confirm zero errors remain. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run a full end-to-end `npm start` and confirm zero runtime regressions. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 28: P2 Documentation (`docs/`)

- [ ] Create the `docs/` directory and populate all three documentation files
  - [ ] Create `docs/ARCHITECTURE.md`
    - [ ] Create the `docs/` directory. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Create `docs/ARCHITECTURE.md` and write a high-level data flow narrative: CLI entry → auth → health check → extraction → processing → reporting. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Add a Mermaid diagram block showing the module dependency graph. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document the three-layer architecture (extractor / processor / reporter) and the responsibility of each layer. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `docs/TROUBLESHOOTING.md`
    - [ ] Create `docs/TROUBLESHOOTING.md`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document the "Portal login page did not load" error and its step-by-step resolution. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document the "Credentials may be incorrect" error and resolution steps. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document the "Portal UI has changed" selector health check failure and how to update `selectors.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document what the XLSX `INCOMPLETE` banner means and how to investigate the run manifest. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `docs/FILTERS.md`
    - [ ] Create `docs/FILTERS.md`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Explain the `REPORT_COLUMNS` env var: what it is, how it maps to XLSX column visibility, and provide example values. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Explain `PORTAL_DUE_STUDENTS_ONLY` and how it interacts with the raw extraction results. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Explain the combo discovery system: how Year × Shift × Class combinations are enumerated and cached. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Document the `run_history.json` and `run_metrics.json` schemas with field-level descriptions. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 29: P2 `package.json` Metadata Cleanup

- [ ] Update `package.json` with accurate metadata and runtime requirements
  - [ ] Set `"description"` to a concise one-line description of the project's purpose. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Change `"main"` from `"index.js"` to `"src/main.ts"`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add `"engines": { "node": ">=18" }` to enforce the minimum Node.js version. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add the `"author"` field with the project author's name or organization. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add the `"repository"` field with the correct remote git URL. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm install` and confirm no errors from the metadata changes. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npm audit` and document any high/critical vulnerabilities discovered in `docs/TROUBLESHOOTING.md`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 30: P2 Architecture Decoupling — Three-Layer Separation

- [ ] Split `src/extractors/accountsReceivable.ts` into three distinct modules
  - [ ] Create the extractor layer
    - [ ] Create `src/extractors/accountsReceivableExtractor.ts` containing only the Playwright browser interaction code: navigation, dropdown selection, filter state machine, table reading. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Ensure the extractor function signature returns raw `ComboResult[]` JSON with no filtering or XLSX generation. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create the processor layer
    - [ ] Create `src/processors/duesProcessor.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Move `filterDuesRows()`, `isJunkRow()`, `parseNumeric()`, and all enrichment logic into `duesProcessor.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Verify every function in `duesProcessor.ts` is a pure function with no side effects, no file I/O, and no Playwright imports. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create the reporter layer
    - [ ] Move all XLSX generation logic from `accountsReceivable.ts` into `src/reporters/xlsxReporter.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Confirm `xlsxReporter.ts` imports nothing from Playwright — it accepts only plain data arrays as inputs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Wire the three layers together in `src/main.ts`
    - [ ] Import `accountsReceivableExtractor` and call it for raw data. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Pipe the raw output through `duesProcessor` for filtering and enrichment. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Pipe the filtered result into `xlsxReporter` for file generation. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Delete the original monolithic `src/extractors/accountsReceivable.ts` after all call sites are updated. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Run a full end-to-end extraction and confirm the XLSX output is byte-for-byte identical to a pre-refactor reference output. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 31: P2 First-Run Interactive Setup

- [ ] Implement interactive `.env` creation when no configuration file exists
  - [ ] Detect the missing `.env` at startup
    - [ ] In `src/cli.ts`, add `if (!fs.existsSync('.env'))` as the very first runtime check before any other setup code. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement the `readline` interactive prompt flow
    - [ ] Import `readline` from Node.js built-ins. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Create `promptForEnvValues(): Promise<{ baseUrl: string; username: string; password: string }>`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Prompt: `"No .env file found.\nEnter PORTAL_BASE_URL [https://duhais.eduexpert24.com]: "` and capture the response (use the default if the user presses Enter). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Prompt: `"Enter PORTAL_USERNAME: "` and capture the response. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Prompt: `"Enter PORTAL_PASSWORD: "` with muted echo (write to `process.stdout` directly without readline echo) and capture the response. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Write the collected values into a new `.env` file, using `.env.example` as the template (substituting the captured values). [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Validate the portal URL before launching the browser
    - [ ] After writing `.env`, make a `HEAD` request to `PORTAL_BASE_URL` using `fetch`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] If the request fails (non-2xx or network error), log `"Portal URL is unreachable. Verify PORTAL_BASE_URL in .env and check network connectivity."` then call `process.exit(1)`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] If successful, log `"Portal is reachable — launching extraction..."` and proceed. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
    - [ ] Delete `.env`, run `npm start`, follow the interactive prompts with test values, and confirm `.env` is created and extraction proceeds normally. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 32: P2 Human-like Interaction (`ghost-cursor`)

- [ ] Integrate `ghost-cursor` for WAF/Cloudflare bypass on critical clicks
  - [ ] Run `npm install ghost-cursor`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Import and initialize a cursor instance in `src/auth/login.ts`: `const cursor = createCursor(page);`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace the `page.click(selectors.usernameField)` call in `login.ts` with `cursor.click(await page.$(selectors.usernameField))`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace the `page.click(selectors.passwordField)` call with the ghost-cursor equivalent. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Replace the submit button click in `login.ts` with the ghost-cursor equivalent. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Initialize a separate `cursor` instance in `accountsReceivableExtractor.ts` and replace key dropdown `.click()` calls with `cursor.click()`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run the full suite in headed mode (`--headed`) and visually confirm the cursor follows a natural curved path to each element rather than teleporting. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 33: P2 Historical SQLite Data Ledger

- [ ] Implement an append-only SQLite store for every extraction run
  - [ ] Run `npm install better-sqlite3 && npm install -D @types/better-sqlite3`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Create `src/utils/dataLedger.ts`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write and execute the `CREATE TABLE IF NOT EXISTS runs (...)` migration for run-level metadata. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write and execute the `CREATE TABLE IF NOT EXISTS dues_records (...)` migration. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Write and execute the `CREATE TABLE IF NOT EXISTS attendance_records (...)` migration. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `insertRun(runId: string, meta: RunMeta): void` using a prepared `INSERT` statement. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `insertDuesRecords(runId: string, records: DuesRecord[]): void` using a transaction for bulk insert performance. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Implement `insertAttendanceRecords(runId: string, records: AttendanceRecord[]): void` using a transaction. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Call all three insert functions from `src/main.ts` after successful extraction. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Confirm `output/ledger.db` is in `.gitignore`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run two extractions and query `sqlite3 output/ledger.db "SELECT COUNT(*) FROM dues_records;"` to confirm records accumulate correctly across runs. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]

---

### Phase 34: P2 Tauri Desktop App Wrapper

- [ ] Scaffold a Tauri desktop wrapper for the HTML dashboard and scheduler UI
  - [ ] Verify the Rust toolchain is installed: run `rustup --version`. [Verify environment variables match .env.example before proceeding]
  - [ ] Install the Tauri CLI: `npm install -D @tauri-apps/cli`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npx tauri init` and answer the prompts to scaffold the `src-tauri/` directory with the correct app name and identifier. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Configure `src-tauri/tauri.conf.json` `distDir` to point to the `output/` directory where the HTML dashboard is generated. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add a Tauri command `run_extraction` in `src-tauri/src/main.rs` that spawns `npm start` as a child process and streams stdout back to the frontend via Tauri events. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Add a "Run Extraction" button to the HTML dashboard template that calls the `run_extraction` Tauri command via `@tauri-apps/api/tauri`. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npx tauri dev` and confirm the app window opens, the dashboard renders, and clicking "Run Extraction" produces log output in the app. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
  - [ ] Run `npx tauri build` and confirm a distributable native binary is produced for the host operating system. [Loop: Run project 2+ times back-to-back → Check terminal logs for consistency. If OK, proceed. If failed/inconsistent, debug & repeat.]
