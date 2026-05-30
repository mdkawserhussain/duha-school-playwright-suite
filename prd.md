# Product Requirements Document: School Management Portal Automation Suite

## 1. Executive Summary

### 1.1 Problem Statement

School administrators currently perform repetitive manual exports from a Laravel/Vue.js school management portal to retrieve staff attendance records and outstanding student financial data. This process is time-consuming, error-prone, and blocks downstream payroll and accounting pipelines.

### 1.2 Solution

A local Playwright-based browser automation suite that securely authenticates into the school portal, navigates the Vue.js SPA, extracts attendance and accounts receivable data, and outputs structured JSON files ready for automated processing.

### 1.3 Goals

| Goal | Metric |
|------|--------|
| Eliminate manual data exports | Zero manual portal interactions for supported data types |
| Maintain security posture | No credentials stored in source code; session reuse via persistent browser context |
| Ensure data completeness | 100% row extraction across all paginated tables |
| Enable pipeline integration | Structured JSON output with ISO-dated filenames |

---

## 2. User Personas

### 2.1 Primary: School IT Administrator

- **Context:** Runs the automation suite on a local workstation on a recurring schedule (daily/weekly/monthly).
- **Need:** Reliable, hands-off data extraction that doesn't trigger account lockouts or require credential re-entry.
- **Constraint:** Must not expose credentials; must work within school network policies.

### 2.2 Secondary: Payroll / Finance Officer

- **Context:** Consumes the output JSON files for payroll calculation and accounts receivable follow-up.
- **Need:** Clean, predictable data structures with consistent field naming and date formatting.

---

## 3. Target System Profile

| Attribute | Detail |
|-----------|--------|
| **Backend** | Laravel (PHP) with CSRF protection, session-based auth, session timeouts |
| **Frontend** | Vue.js SPA with Vue Router, dynamic table rendering, asynchronous API-driven data loading |
| **Navigation** | Client-side routing — no full-page reloads on state transitions |
| **Data Tables** | Server-side paginated, rendered asynchronously after API response |
| **UI Patterns** | Dropdowns, date pickers, accordions, modals — all Vue component-driven |

---

## 4. Functional Requirements

### FR-1: Persistent Session Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | The suite SHALL use a dedicated local user data directory (`userDataDir`) to persist cookies, localStorage, and session tokens across runs. | P0 |
| FR-1.2 | On launch, the suite SHALL navigate to the portal dashboard and check for an active authenticated session by verifying the presence of authenticated-state DOM elements. | P0 |
| FR-1.3 | If the session is valid, the suite SHALL skip the login flow and proceed directly to data extraction URLs. | P0 |
| FR-1.4 | If the session has expired, the suite SHALL read `PORTAL_USERNAME` and `PORTAL_PASSWORD` from local environment variables. | P0 |
| FR-1.5 | The suite SHALL populate the login form, submit credentials, and wait for the dashboard to fully render (Vue hydration complete) before proceeding. | P0 |
| FR-1.6 | The suite SHALL NOT store credentials in any source file, configuration file, or log output. | P0 |

### FR-2: Academic Attendance Data Extraction

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | The suite SHALL navigate to the internal attendance monitoring view via direct URL. | P0 |
| FR-2.2 | The suite SHALL interact with Vue-based dropdown components and date pickers to select the current operational month. | P0 |
| FR-2.3 | The suite SHALL wait for the attendance data table to finish loading (network idle or specific API response intercept) before parsing. | P0 |
| FR-2.4 | The suite SHALL extract all visible columns from each row of the attendance table. | P0 |
| FR-2.5 | The suite SHALL handle multi-page tables by detecting and clicking through pagination controls until no further pages remain. | P0 |
| FR-2.6 | The suite SHALL aggregate all pages into a single unified data array. | P0 |

### FR-3: Accounts Receivable Extraction

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | The suite SHALL navigate to the financial tracking module. | P0 |
| FR-3.2 | The suite SHALL apply filter controls to display only records with outstanding (due) balances. | P0 |
| FR-3.3 | For each matching row, the suite SHALL extract: student name, student ID, and due amount. | P0 |
| FR-3.4 | When parent contact information is hidden behind accordions, expandable rows, or modal dialogs, the suite SHALL trigger the UI interaction, wait for DOM injection, extract the phone number, and reset the view state. | P0 |
| FR-3.5 | The suite SHALL handle pagination identically to FR-2.5. | P0 |

### FR-4: Data Output

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | All extracted data SHALL be structured as arrays of flat JSON objects. | P0 |
| FR-4.2 | Output files SHALL be written to a local `./output/` directory. | P0 |
| FR-4.3 | Output filenames SHALL use ISO 8601 date formatting (e.g., `attendance_2026-05-28.json`). | P0 |
| FR-4.4 | The suite SHALL create the output directory if it does not exist. | P1 |

---

## 5. Non-Functional Requirements

### NFR-1: Security

| ID | Requirement |
|----|-------------|
| NFR-1.1 | Credentials SHALL be sourced exclusively from environment variables at runtime. |
| NFR-1.2 | The `userDataDir` path SHALL be an absolute path scoped to the execution profile. |
| NFR-1.3 | No credential values SHALL appear in console logs, error logs, or screenshot filenames. |

### NFR-2: Reliability & Resilience

| ID | Requirement |
|----|-------------|
| NFR-2.1 | All element selectors SHALL use semantic text content, `role` attributes, `aria-label`, `data-testid`, or other accessibility markers — NOT structural CSS/XPath selectors. |
| NFR-2.2 | Every navigation and interaction step SHALL be wrapped in try-catch blocks with explicit timeout parameters. |
| NFR-2.3 | The maximum timeout for any single wait operation SHALL be 30 seconds. |
| NFR-2.4 | On unrecoverable timeout or error, the suite SHALL capture a timestamped screenshot to `./errors/` and terminate cleanly without corrupting existing output files. |
| NFR-2.5 | The suite SHALL log structured status messages (start, step completion, error, finish) to stdout. |

### NFR-3: Performance

| ID | Requirement |
|----|-------------|
| NFR-3.1 | A full extraction cycle (login check + attendance + accounts receivable) SHOULD complete in under 5 minutes under normal network conditions. |
| NFR-3.2 | The suite SHALL avoid unnecessary page reloads by leveraging direct URL navigation. |

---

## 6. Out of Scope

- Modifying any data in the school portal (read-only operations only).
- Scheduling or cron job management (the suite is invoked manually or by external scheduler).
- Multi-browser support (Chromium via Playwright only).
- Data transformation beyond structured JSON output.
- Email or notification delivery of extracted data.

---

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Portal UI restructuring breaks selectors | High | Medium | Use semantic/accessible selectors; maintain a selector registry for easy updates |
| Session token format changes | Medium | Low | Validate session by DOM state, not cookie introspection |
| Rate limiting / account lockout | High | Low | Session reuse minimizes login attempts; add configurable delay between requests |
| Network instability causes partial extraction | High | Medium | Per-page error handling; write partial data with error flags rather than discarding |
| CSRF token rotation mid-session | Medium | Low | Playwright maintains full browser context including CSRF cookies automatically |

---

## 8. Success Criteria

1. The suite successfully authenticates (or reuses session) and reaches the dashboard in < 10 seconds.
2. All attendance records for the selected month are extracted with zero row loss across all pages.
3. All outstanding balance records are extracted with parent phone numbers successfully revealed and captured.
4. Output JSON files are valid, correctly named, and written to the output directory.
5. On error, a screenshot is saved and the process exits cleanly with a non-zero exit code.

---

## 9. Timeline Estimate

| Phase | Duration |
|-------|----------|
| Project scaffolding & auth module | 1 day |
| Attendance extraction module | 1 day |
| Accounts receivable module | 1–2 days |
| Error handling, logging, & hardening | 0.5 day |
| Integration testing & documentation | 0.5 day |
| **Total** | **4–5 days** |
