# School Management Portal Automation Suite — Implementation Plan

## Overview

Build a Playwright (Node.js) automation suite that authenticates into a Laravel/Vue.js school management portal, extracts staff/student attendance data and accounts receivable records, and writes structured JSON output files. The suite prioritizes session reuse, semantic selectors, robust error handling, and credential security.

---

## Project Structure

```
playwright/
├── package.json
├── playwright.config.ts
├── .env.example                  # Documents required env vars (no values)
├── README.md
├── src/
│   ├── config.ts                 # Centralized config: URLs, timeouts, paths
│   ├── main.ts                   # Entry point / orchestrator
│   ├── auth/
│   │   └── login.ts              # Session check + login flow
│   ├── extractors/
│   │   ├── attendance.ts         # Attendance data extraction
│   │   └── accountsReceivable.ts # Due payments extraction
│   ├── utils/
│   │   ├── pagination.ts         # Generic paginated table extractor
│   │   ├── selectors.ts          # Selector registry (semantic / a11y)
│   │   ├── fileWriter.ts         # JSON file writer with ISO dating
│   │   ├── errorHandler.ts       # Screenshot capture + clean exit
│   │   └── logger.ts             # Structured console logging
├── output/                       # Generated JSON files (git-ignored)
├── errors/                       # Timestamped error screenshots (git-ignored)
└── user-data/                    # Persistent browser context (git-ignored)
```

---

## Proposed Changes

### Core Infrastructure

#### [NEW] [package.json](file:///home/ticktick/Desktop/playwright/package.json)

- Initialize with `@playwright/test` and `playwright` dependencies.
- Add `dotenv` for `.env` loading (development convenience — production uses real env vars).
- Scripts: `start` (runs `src/main.ts` via `tsx`), `test` (Playwright test runner).

#### [NEW] [playwright.config.ts](file:///home/ticktick/Desktop/playwright/playwright.config.ts)

- Configure Chromium-only project.
- Set default timeout to 30 seconds (NFR-2.3).
- Configure `userDataDir` base path.

#### [NEW] [.env.example](file:///home/ticktick/Desktop/playwright/.env.example)

- Document `PORTAL_USERNAME`, `PORTAL_PASSWORD`, `PORTAL_BASE_URL`.
- No actual values — serves as a template.

---

### Configuration Module

#### [NEW] [src/config.ts](file:///home/ticktick/Desktop/playwright/src/config.ts)

Centralized configuration object:

```typescript
export const CONFIG = {
  baseUrl: process.env.PORTAL_BASE_URL || 'https://school-portal.example.com',
  credentials: {
    username: process.env.PORTAL_USERNAME,
    password: process.env.PORTAL_PASSWORD,
  },
  paths: {
    dashboard: '/dashboard',
    attendance: '/attendance/monitoring',
    finance: '/finance/due-payments',
  },
  timeouts: {
    navigation: 30_000,
    element: 15_000,
    networkIdle: 10_000,
  },
  directories: {
    userData: path.resolve(__dirname, '..', 'user-data'),
    output: path.resolve(__dirname, '..', 'output'),
    errors: path.resolve(__dirname, '..', 'errors'),
  },
};
```

- Validates that credentials exist at startup; exits with clear error message if missing.

---

### Authentication Module

#### [NEW] [src/auth/login.ts](file:///home/ticktick/Desktop/playwright/src/auth/login.ts)

**Session check flow:**

1. Launch persistent Chromium context using `userDataDir`.
2. Navigate to `CONFIG.paths.dashboard`.
3. Check for an authenticated-state indicator (e.g., a user avatar, sidebar menu, or dashboard heading via `getByRole` / `getByText`).
4. If found → session is valid → return `page` handle.
5. If redirected to login page → execute login flow.

**Login flow:**

1. Read `CONFIG.credentials.username` and `CONFIG.credentials.password`.
2. Locate the email/username input via `getByLabel('Email')` or `getByPlaceholder`.
3. Locate the password input via `getByLabel('Password')`.
4. Fill both fields.
5. Click the login button via `getByRole('button', { name: /log\s*in/i })`.
6. Wait for dashboard to render: `page.waitForURL('**/dashboard**')` + `page.getByRole('heading', { name: /dashboard/i }).waitFor()`.
7. Return `page` handle.

**Error handling:**

- Wrap in try-catch.
- On failure: log error, capture screenshot, exit with code 1.

---

### Attendance Extraction Module

#### [NEW] [src/extractors/attendance.ts](file:///home/ticktick/Desktop/playwright/src/extractors/attendance.ts)

**Navigation:**

1. Navigate to `CONFIG.baseUrl + CONFIG.paths.attendance`.
2. Wait for the attendance page heading / key element to render.

**Month/date selection:**

1. Locate the month dropdown via semantic selector (`getByLabel('Month')` or `getByRole('combobox', { name: /month/i })`).
2. Select the current month using `selectOption()` or by clicking the dropdown and selecting the matching text option.
3. If a date picker is present, interact similarly using `getByLabel` / `getByRole`.
4. Wait for the table to reload — use `page.waitForResponse()` intercepting the attendance API endpoint, or `page.waitForLoadState('networkidle')`.

**Table extraction (paginated):**

1. Call the shared `extractPaginatedTable()` utility (see pagination module below).
2. The table parser identifies column headers from `<th>` or `role="columnheader"` elements.
3. For each `<tr>` / `role="row"`, extract cell text content into a keyed object.

**Output:**

- Pass the collected array to `writeJsonOutput('attendance', data)`.

---

### Accounts Receivable Extraction Module

#### [NEW] [src/extractors/accountsReceivable.ts](file:///home/ticktick/Desktop/playwright/src/extractors/accountsReceivable.ts)

**Navigation:**

1. Navigate to `CONFIG.baseUrl + CONFIG.paths.finance`.
2. Wait for the finance module to render.

**Filtering:**

1. Locate filter controls (e.g., status dropdown, "Due" checkbox, or filter button).
2. Apply the "outstanding balances only" filter using semantic selectors.
3. Wait for table data to reload.

**Row extraction with hidden contact reveal:**

For each row across all pages:

1. Extract visible fields: student name, student ID, due amount.
2. For parent phone number:
   - Attempt to find a "details" / "expand" / "view" trigger element within the row.
   - Click to expand the accordion or open the modal.
   - Wait for the phone number element to appear in the DOM (`waitForSelector` with timeout).
   - Extract the phone number text.
   - Close/collapse the expanded state (click the close button or the same trigger).
   - Brief delay to allow Vue reactivity to settle.
3. Append the complete record to the results array.

**Pagination:**

- Use the shared `extractPaginatedTable()` utility, but with the custom per-row phone extraction hook.

**Output:**

- Pass the collected array to `writeJsonOutput('accounts_receivable', data)`.

---

### Utility Modules

#### [NEW] [src/utils/pagination.ts](file:///home/ticktick/Desktop/playwright/src/utils/pagination.ts)

Generic paginated table extractor:

```typescript
async function extractPaginatedTable(
  page: Page,
  options: {
    tableSelector: string;       // Semantic selector for the table
    rowProcessor?: (row, page) => Promise<Record<string, string>>;  // Custom per-row hook
  }
): Promise<Record<string, string>[]>
```

1. Extract column headers from the first header row.
2. Extract all data rows from the current page.
3. For each row, either use default cell-text extraction or call `rowProcessor` if provided.
4. Check for a "Next" pagination button (`getByRole('button', { name: /next/i })` or `getByLabel('Next page')`).
5. If enabled (not disabled / not absent): click it, wait for table data to reload, repeat.
6. If disabled or absent: pagination complete, return accumulated results.

#### [NEW] [src/utils/selectors.ts](file:///home/ticktick/Desktop/playwright/src/utils/selectors.ts)

Centralized selector registry:

```typescript
export const SELECTORS = {
  login: {
    usernameInput: 'getByLabel("Email")',
    passwordInput: 'getByLabel("Password")',
    submitButton: 'getByRole("button", { name: /log in/i })',
  },
  dashboard: {
    heading: 'getByRole("heading", { name: /dashboard/i })',
  },
  attendance: {
    monthDropdown: 'getByLabel("Month")',
    dataTable: 'getByRole("table")',
  },
  finance: {
    filterDropdown: 'getByLabel("Status")',
    dataTable: 'getByRole("table")',
    expandButton: 'getByRole("button", { name: /details|view|expand/i })',
    phoneField: 'getByLabel("Phone")',
  },
  pagination: {
    nextButton: 'getByRole("button", { name: /next/i })',
  },
};
```

> [!IMPORTANT]
> These selectors are **placeholders** based on common patterns. They must be calibrated against the actual portal DOM during initial development. The registry pattern ensures all selectors live in one file for easy maintenance.

#### [NEW] [src/utils/fileWriter.ts](file:///home/ticktick/Desktop/playwright/src/utils/fileWriter.ts)

- `writeJsonOutput(prefix: string, data: any[]): void`
- Creates `CONFIG.directories.output` if it doesn't exist.
- Writes to `output/{prefix}_{YYYY-MM-DD}.json`.
- Uses `JSON.stringify(data, null, 2)` for readability.

#### [NEW] [src/utils/errorHandler.ts](file:///home/ticktick/Desktop/playwright/src/utils/errorHandler.ts)

- `handleFatalError(page: Page, error: Error): Promise<never>`
- Creates `CONFIG.directories.errors` if it doesn't exist.
- Captures screenshot: `errors/error_{YYYY-MM-DDTHH-mm-ss}.png`.
- Logs error message and screenshot path.
- Calls `process.exit(1)`.

#### [NEW] [src/utils/logger.ts](file:///home/ticktick/Desktop/playwright/src/utils/logger.ts)

- Simple structured logger: `log.info()`, `log.error()`, `log.step()`.
- Prefixes with timestamp and step name.
- Outputs to stdout (no file logging for now).

---

### Orchestrator

#### [NEW] [src/main.ts](file:///home/ticktick/Desktop/playwright/src/main.ts)

Entry point that ties all modules together:

```typescript
async function main() {
  log.info('Starting School Portal Automation Suite');

  // 1. Authenticate
  const { browser, page } = await authenticate();

  try {
    // 2. Extract attendance
    log.step('Attendance Extraction');
    await extractAttendance(page);

    // 3. Extract accounts receivable
    log.step('Accounts Receivable Extraction');
    await extractAccountsReceivable(page);

    log.info('All extractions completed successfully');
  } catch (error) {
    await handleFatalError(page, error);
  } finally {
    await browser.close();
  }
}
```

---

## Open Questions

> [!IMPORTANT]
> The following details depend on the actual portal and must be resolved during development:

1. **Exact portal URL and route paths** — The `CONFIG.paths` values are illustrative. What are the real URLs for the attendance and finance modules?
2. **Login form field labels** — Are the inputs labeled "Email" and "Password", or something else?
3. **How is the parent phone number hidden?** — Is it behind an accordion, a modal, a tooltip, or a separate detail page? This determines the reveal/reset interaction pattern.
4. **Table column names** — What are the exact column headers in the attendance and finance tables?
5. **Filter mechanism for outstanding balances** — Is it a dropdown, checkbox, toggle, or URL parameter?
6. **Pagination style** — Does the portal use numbered pages, "Next" buttons, infinite scroll, or "Load More"?

---

## Verification Plan

### Automated Tests

```bash
# Run the full suite in headed mode for visual verification
npx tsx src/main.ts

# Validate output files exist and contain valid JSON
node -e "const d = require('./output/attendance_$(date +%Y-%m-%d).json'); console.log(d.length, 'attendance records')"
node -e "const d = require('./output/accounts_receivable_$(date +%Y-%m-%d).json'); console.log(d.length, 'AR records')"
```

### Manual Verification

1. **Session reuse:** Run the suite twice consecutively — the second run should skip login.
2. **Data completeness:** Compare extracted row count against the portal's displayed total record count.
3. **Error handling:** Disconnect network mid-extraction and verify a screenshot is saved and the process exits cleanly.
4. **Credential security:** Grep the entire project for credential values — must return zero matches.
5. **Pagination:** Manually count pages in the portal and verify the suite processes all of them.
