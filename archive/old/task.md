# Tasks: School Management Portal Automation Suite

---

## 1. Project Scaffolding & Setup

- [x] **1.1 Initialize project**
  - [x] 1.1.1 Run `npm init -y` in `/home/ticktick/Desktop/playwright`
  - [x] 1.1.2 Install core dependencies: `playwright`, `@playwright/test`, `tsx`, `typescript`
  - [x] 1.1.3 Install utility dependencies: `dotenv`
  - [x] 1.1.4 Run `npx playwright install chromium` to install browser binary
- [x] **1.2 Configure TypeScript**
  - [x] 1.2.1 Create `tsconfig.json` with strict mode, ESNext target, Node module resolution
  - [x] 1.2.2 Set `rootDir` to `src/` and `outDir` to `dist/`
- [x] **1.3 Configure Playwright**
  - [x] 1.3.1 Create `playwright.config.ts`
  - [x] 1.3.2 Set default timeout to 30,000ms
  - [x] 1.3.3 Configure Chromium-only project
  - [x] 1.3.4 Set `userDataDir` base path
- [x] **1.4 Create directory structure**
  - [x] 1.4.1 Create `src/auth/`
  - [x] 1.4.2 Create `src/extractors/`
  - [x] 1.4.3 Create `src/utils/`
  - [x] 1.4.4 Create `output/` with `.gitkeep`
  - [x] 1.4.5 Create `errors/` with `.gitkeep`
  - [x] 1.4.6 Create `user-data/` with `.gitkeep`
- [x] **1.5 Configure `.gitignore`**
  - [x] 1.5.1 Add `user-data/` (session data)
  - [x] 1.5.2 Add `output/*.json` (generated data files)
  - [x] 1.5.3 Add `errors/*.png` (error screenshots)
  - [x] 1.5.4 Add `.env` (credentials)
  - [x] 1.5.5 Add `node_modules/`
  - [x] 1.5.6 Add `dist/`
- [x] **1.6 Create `.env.example`**
  - [x] 1.6.1 Document `PORTAL_USERNAME` with empty value
  - [x] 1.6.2 Document `PORTAL_PASSWORD` with empty value
  - [x] 1.6.3 Document `PORTAL_BASE_URL` with placeholder value
- [x] **1.7 Add npm scripts to `package.json`**
  - [x] 1.7.1 Add `start` script: `tsx src/main.ts`
  - [x] 1.7.2 Add `start:headed` script: `HEADED=true tsx src/main.ts`
  - [x] 1.7.3 Add `test` script: `playwright test`

---

## 2. Configuration Module

- [x] **2.1 Create `src/config.ts`**
  - [x] 2.1.1 Import `dotenv/config` for `.env` loading
  - [x] 2.1.2 Import `path` and `process`
  - [x] **2.1.3 Define CONFIG object**
    - [x] 2.1.3.1 Set `baseUrl` from `process.env.PORTAL_BASE_URL` with fallback
    - [x] 2.1.3.2 Set `credentials.username` from `process.env.PORTAL_USERNAME`
    - [x] 2.1.3.3 Set `credentials.password` from `process.env.PORTAL_PASSWORD`
    - [x] 2.1.3.4 Define `paths` object with `dashboard`, `attendance`, `finance` routes
    - [x] 2.1.3.5 Define `timeouts` object: `navigation` (30s), `element` (15s), `networkIdle` (10s)
    - [x] 2.1.3.6 Define `directories` object with absolute paths for `userData`, `output`, `errors`
  - [x] **2.1.4 Add startup validation**
    - [x] 2.1.4.1 Check that `PORTAL_USERNAME` is defined and non-empty
    - [x] 2.1.4.2 Check that `PORTAL_PASSWORD` is defined and non-empty
    - [x] 2.1.4.3 If missing, log clear error message and call `process.exit(1)`

---

## 3. Utility Modules

- [x] **3.1 Create logger (`src/utils/logger.ts`)**
  - [x] 3.1.1 Implement `log.info(message)` — prefix with `[INFO]` and ISO timestamp
  - [x] 3.1.2 Implement `log.error(message, error?)` — prefix with `[ERROR]` and ISO timestamp
  - [x] 3.1.3 Implement `log.step(stepName)` — prefix with `[STEP]` and ISO timestamp
  - [x] 3.1.4 Implement `log.warn(message)` — prefix with `[WARN]` and ISO timestamp
- [x] **3.2 Create error handler (`src/utils/errorHandler.ts`)**
  - [x] 3.2.1 Import `fs`, `path`, `CONFIG`, and `logger`
  - [x] 3.2.2 Implement `handleFatalError(page, error)` function
    - [x] 3.2.2.1 Create `errors/` directory if it doesn't exist (`fs.mkdirSync recursive`)
    - [x] 3.2.2.2 Generate timestamped filename: `error_YYYY-MM-DDTHH-mm-ss.png`
    - [x] 3.2.2.3 Capture full-page screenshot via `page.screenshot({ path, fullPage: true })`
    - [x] 3.2.2.4 Log error message and screenshot path
    - [x] 3.2.2.5 Call `process.exit(1)`
  - [x] 3.2.3 Ensure no credential values appear in any log or filename
- [x] **3.3 Create file writer (`src/utils/fileWriter.ts`)**
  - [x] 3.3.1 Import `fs`, `path`, `CONFIG`, and `logger`
  - [x] 3.3.2 Implement `writeJsonOutput(prefix, data)` function
    - [x] 3.3.2.1 Create `output/` directory if it doesn't exist
    - [x] 3.3.2.2 Generate filename with ISO date: `{prefix}_{YYYY-MM-DD}.json`
    - [x] 3.3.2.3 Serialize data with `JSON.stringify(data, null, 2)`
    - [x] 3.3.2.4 Write file synchronously using `fs.writeFileSync`
    - [x] 3.3.2.5 Log success message with record count and file path
- [x] **3.4 Create selector registry (`src/utils/selectors.ts`)**
  - [x] 3.4.1 Define `SELECTORS.login` object (username input, password input, submit button)
  - [x] 3.4.2 Define `SELECTORS.dashboard` object (dashboard heading/indicator)
  - [x] 3.4.3 Define `SELECTORS.attendance` object (month dropdown, date picker, data table)
  - [x] 3.4.4 Define `SELECTORS.finance` object (filter controls, data table, expand trigger, phone field)
  - [x] 3.4.5 Define `SELECTORS.pagination` object (next button, page indicator)
  - [x] 3.4.6 Add inline comments noting these must be calibrated against real portal DOM
- [x] **3.5 Create pagination utility (`src/utils/pagination.ts`)**
  - [x] 3.5.1 Import `Page` type from Playwright
  - [x] **3.5.2 Implement `extractPaginatedTable()` function**
    - [x] 3.5.2.1 Accept `page`, `tableSelector`, and optional `rowProcessor` callback
    - [x] 3.5.2.2 Initialize empty results array
    - [x] **3.5.2.3 Implement header extraction**
      - [x] 3.5.2.3.1 Locate all `th` or `role="columnheader"` elements within the table
      - [x] 3.5.2.3.2 Extract text content of each header into an ordered array
    - [x] **3.5.2.4 Implement row extraction loop (per page)**
      - [x] 3.5.2.4.1 Locate all `tr` / `role="row"` elements (excluding header row)
      - [x] 3.5.2.4.2 For each row, extract cell text content
      - [x] 3.5.2.4.3 Map cell values to header keys to create a record object
      - [x] 3.5.2.4.4 If `rowProcessor` is provided, call it and merge returned data
      - [x] 3.5.2.4.5 Push record to results array
    - [x] **3.5.2.5 Implement pagination advancement**
      - [x] 3.5.2.5.1 Look for "Next" button using semantic selector
      - [x] 3.5.2.5.2 Check if button is disabled or absent
      - [x] 3.5.2.5.3 If enabled: click, wait for table data reload, loop back to 3.5.2.4
      - [x] 3.5.2.5.4 If disabled/absent: break loop, return accumulated results
    - [x] 3.5.2.6 Wrap entire function body in try-catch; re-throw with context message

---

## 4. Authentication Module

- [x] **4.1 Create `src/auth/login.ts`**
  - [x] 4.1.1 Import Playwright `chromium`, `BrowserContext`, `Page`
  - [x] 4.1.2 Import `CONFIG`, `logger`, `errorHandler`, `SELECTORS`
  - [x] **4.1.3 Implement `authenticate()` function**
    - [x] **4.1.3.1 Launch persistent browser context**
      - [x] 4.1.3.1.1 Call `chromium.launchPersistentContext(CONFIG.directories.userData, options)`
      - [x] 4.1.3.1.2 Set `headless` based on `HEADED` env var (default `true`)
      - [x] 4.1.3.1.3 Set viewport size (e.g., 1280×720)
      - [x] 4.1.3.1.4 Get or create the first page from context
    - [x] **4.1.3.2 Check for existing session**
      - [x] 4.1.3.2.1 Navigate to dashboard URL with `waitUntil: 'domcontentloaded'`
      - [x] 4.1.3.2.2 Wait briefly (2–3 seconds) for Vue router to settle
      - [x] 4.1.3.2.3 Check if URL still contains `/dashboard` (not redirected to login)
      - [x] 4.1.3.2.4 Check for presence of authenticated UI element (dashboard heading, user avatar, sidebar)
      - [x] 4.1.3.2.5 If both checks pass → log "Session valid" → return `{ browser, page }`
    - [x] **4.1.3.3 Execute login flow (if session expired)**
      - [x] 4.1.3.3.1 Log "Session expired, logging in..."
      - [x] 4.1.3.3.2 Navigate to login URL if not already there
      - [x] 4.1.3.3.3 Wait for login form to render
      - [x] 4.1.3.3.4 Fill username field using `page.getByLabel()` or equivalent semantic selector
      - [x] 4.1.3.3.5 Fill password field using `page.getByLabel()` or equivalent semantic selector
      - [x] 4.1.3.3.6 Click the login/submit button
      - [x] 4.1.3.3.7 Wait for navigation to dashboard URL (`page.waitForURL`)
      - [x] 4.1.3.3.8 Wait for dashboard content to render (heading or key element visible)
      - [x] 4.1.3.3.9 Log "Login successful"
      - [x] 4.1.3.3.10 Return `{ browser, page }`
    - [x] **4.1.3.4 Error handling**
      - [x] 4.1.3.4.1 Wrap all of 4.1.3.2 and 4.1.3.3 in try-catch
      - [x] 4.1.3.4.2 On error: call `handleFatalError(page, error)`

---

## 5. Attendance Extraction Module

- [x] **5.1 Create `src/extractors/attendance.ts`**
  - [x] 5.1.1 Import `Page` type, `CONFIG`, `logger`, `SELECTORS`, `extractPaginatedTable`, `writeJsonOutput`
  - [x] **5.1.2 Implement `extractAttendance(page)` function**
    - [x] **5.1.2.1 Navigate to attendance page**
      - [x] 5.1.2.1.1 Call `page.goto(CONFIG.baseUrl + CONFIG.paths.attendance)`
      - [x] 5.1.2.1.2 Wait for attendance page heading/indicator to render
      - [x] 5.1.2.1.3 Log "Navigated to attendance module"
    - [x] **5.1.2.2 Select current month**
      - [x] 5.1.2.2.1 Locate the month dropdown/selector via semantic selector
      - [x] 5.1.2.2.2 Determine the current month name/value programmatically
      - [x] 5.1.2.2.3 Select the current month option
      - [x] 5.1.2.2.4 Wait for table data to reload (network response or `networkidle`)
      - [x] 5.1.2.2.5 Log "Selected month: {monthName}"
    - [x] **5.1.2.3 Handle optional date picker**
      - [x] 5.1.2.3.1 Check if a date picker element exists
      - [x] 5.1.2.3.2 If present, set appropriate date range for the month
      - [x] 5.1.2.3.3 Wait for table data to reload
    - [x] **5.1.2.4 Extract table data**
      - [x] 5.1.2.4.1 Call `extractPaginatedTable(page, { tableSelector })` with attendance table selector
      - [x] 5.1.2.4.2 Log "Extracted {N} attendance records across {P} pages"
    - [x] **5.1.2.5 Write output**
      - [x] 5.1.2.5.1 Call `writeJsonOutput('attendance', data)`
      - [x] 5.1.2.5.2 Log "Attendance data saved"
    - [x] **5.1.2.6 Error handling**
      - [x] 5.1.2.6.1 Wrap entire function in try-catch
      - [x] 5.1.2.6.2 On error: re-throw with descriptive message for orchestrator to handle

---

## 6. Accounts Receivable Extraction Module

- [x] **6.1 Create `src/extractors/accountsReceivable.ts`**
  - [x] 6.1.1 Import `Page` type, `CONFIG`, `logger`, `SELECTORS`, `extractPaginatedTable`, `writeJsonOutput`
  - [x] **6.1.2 Implement `extractAccountsReceivable(page)` function**
    - [x] **6.1.2.1 Navigate to finance module**
      - [x] 6.1.2.1.1 Call `page.goto(CONFIG.baseUrl + CONFIG.paths.finance)`
      - [x] 6.1.2.1.2 Wait for finance module heading/indicator to render
      - [x] 6.1.2.1.3 Log "Navigated to finance module"
    - [x] **6.1.2.2 Apply outstanding balance filter**
      - [x] 6.1.2.2.1 Locate the filter control (dropdown, checkbox, or toggle)
      - [x] 6.1.2.2.2 Select/check the "outstanding" / "due" filter option
      - [x] 6.1.2.2.3 If a "Search" / "Apply" button exists, click it
      - [x] 6.1.2.2.4 Wait for table data to reload
      - [x] 6.1.2.2.5 Log "Applied outstanding balance filter"
    - [x] **6.1.2.3 Define row processor for phone extraction**
      - [x] **6.1.2.3.1 Implement `extractPhoneFromRow(row, page)` callback**
        - [x] 6.1.2.3.1.1 Locate the "expand" / "details" / "view" trigger within the row
        - [x] 6.1.2.3.1.2 Click the trigger element
        - [x] 6.1.2.3.1.3 Wait for the phone number element to appear in the DOM
        - [x] 6.1.2.3.1.4 Extract the phone number text content
        - [x] 6.1.2.3.1.5 Close/collapse the expanded view (click close button or toggle)
        - [x] 6.1.2.3.1.6 Wait briefly for Vue reactivity to settle (150–300ms)
        - [x] 6.1.2.3.1.7 Return `{ parentPhone: extractedNumber }`
        - [x] 6.1.2.3.1.8 If phone extraction fails for a row, log warning and return `{ parentPhone: 'N/A' }`
    - [x] **6.1.2.4 Extract table data with phone enrichment**
      - [x] 6.1.2.4.1 Call `extractPaginatedTable(page, { tableSelector, rowProcessor: extractPhoneFromRow })`
      - [x] 6.1.2.4.2 Log "Extracted {N} accounts receivable records"
    - [x] **6.1.2.5 Write output**
      - [x] 6.1.2.5.1 Call `writeJsonOutput('accounts_receivable', data)`
      - [x] 6.1.2.5.2 Log "Accounts receivable data saved"
    - [x] **6.1.2.6 Error handling**
      - [x] 6.1.2.6.1 Wrap entire function in try-catch
      - [x] 6.1.2.6.2 On error: re-throw with descriptive message

---

## 7. Orchestrator / Entry Point

- [ ] **7.1 Create `src/main.ts`**
  - [ ] 7.1.1 Import `authenticate`, `extractAttendance`, `extractAccountsReceivable`, `handleFatalError`, `logger`
  - [ ] **7.1.2 Implement `main()` function**
    - [ ] 7.1.2.1 Log "Starting School Portal Automation Suite"
    - [ ] 7.1.2.2 Call `authenticate()` to get `{ browser, page }`
    - [ ] 7.1.2.3 Call `extractAttendance(page)` inside try block
    - [ ] 7.1.2.4 Call `extractAccountsReceivable(page)` inside try block
    - [ ] 7.1.2.5 Log "All extractions completed successfully"
    - [ ] 7.1.2.6 In catch block: call `handleFatalError(page, error)`
    - [ ] 7.1.2.7 In finally block: call `browser.close()`
  - [ ] 7.1.3 Invoke `main()` at module level

---

## 8. Error Handling & Hardening

- [ ] **8.1 Validate timeout configuration**
  - [ ] 8.1.1 Verify all `waitFor`, `waitForSelector`, `waitForURL` calls use explicit timeouts from `CONFIG.timeouts`
  - [ ] 8.1.2 Verify no implicit infinite waits exist
- [ ] **8.2 Validate selector resilience**
  - [ ] 8.2.1 Audit all selectors to confirm they use `getByRole`, `getByLabel`, `getByText`, or `data-testid` — no CSS class or XPath selectors
  - [ ] 8.2.2 Document any necessary fallback selectors
- [ ] **8.3 Validate credential security**
  - [ ] 8.3.1 Grep entire project for any hardcoded credential strings
  - [ ] 8.3.2 Verify logger never outputs credential values
  - [ ] 8.3.3 Verify error screenshots don't capture login form with filled credentials
- [ ] **8.4 Validate clean exit behavior**
  - [ ] 8.4.1 Test error path: disconnect network mid-run → verify screenshot saved, clean exit
  - [ ] 8.4.2 Test error path: invalid credentials → verify clean exit, no infinite retry
  - [ ] 8.4.3 Test error path: element not found → verify timeout fires, screenshot saved

---

## 9. Testing & Verification

- [ ] **9.1 End-to-end smoke test**
  - [ ] 9.1.1 Run `npm start` with valid credentials
  - [ ] 9.1.2 Verify login succeeds (or session is reused)
  - [ ] 9.1.3 Verify attendance JSON is written to `output/`
  - [ ] 9.1.4 Verify accounts receivable JSON is written to `output/`
  - [ ] 9.1.5 Verify JSON files are valid (parseable, correct structure)
- [ ] **9.2 Session reuse test**
  - [ ] 9.2.1 Run suite once to establish session
  - [ ] 9.2.2 Run suite again immediately
  - [ ] 9.2.3 Verify second run skips login (check log output)
- [ ] **9.3 Data completeness test**
  - [ ] 9.3.1 Manually count total rows in attendance table (all pages) in the portal
  - [ ] 9.3.2 Compare against extracted JSON array length
  - [ ] 9.3.3 Manually count total rows in accounts receivable table
  - [ ] 9.3.4 Compare against extracted JSON array length
- [ ] **9.4 Error handling test**
  - [ ] 9.4.1 Run with missing environment variables → verify clean error message
  - [ ] 9.4.2 Run with incorrect credentials → verify clean exit, screenshot saved
  - [ ] 9.4.3 Simulate network timeout → verify screenshot saved, no data corruption

---

## 10. Documentation

- [ ] **10.1 Create `README.md`**
  - [ ] 10.1.1 Write project description and purpose
  - [ ] 10.1.2 Document prerequisites (Node.js version, Playwright)
  - [ ] 10.1.3 Document installation steps
  - [ ] 10.1.4 Document environment variable setup
  - [ ] 10.1.5 Document usage commands (`npm start`, `npm run start:headed`)
  - [ ] 10.1.6 Document output file structure and locations
  - [ ] 10.1.7 Document error handling behavior
  - [ ] 10.1.8 Document selector maintenance process
