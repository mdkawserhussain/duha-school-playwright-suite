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
- `src/utils/logger.ts` — Structured JSON logging mode (`LOG_FORMAT=json`)
- `src/utils/selectors.ts` — Selector definitions used by health check
- `src/utils/selectorHealthCheck.ts` — Pre-extraction selector health check *(new)*
- `src/utils/metricsCollector.ts` — Per-run metrics collection and output *(new)*
- `src/utils/comboCache.ts` — Dropdown discovery cache with 24-hour TTL *(new)*
- `src/utils/diffEngine.ts` — Day-over-day dues diff engine *(new)*
- `src/utils/outputCleaner.ts` — PII file auto-cleanup by age *(new)*
- `src/utils/cloudSync.ts` — Google Drive and Google Sheets upload *(new)*
- `src/utils/desktopNotifier.ts` — OS notification on run completion *(new)*
- `src/utils/heartbeat.ts` — Uptime heartbeat pings (Better Stack / Cronitor) *(new)*
- `src/utils/formatHelpers.ts` — Duration formatting helper (`formatDuration`) *(new)*
- `src/processors/duesFilter.ts` — Dues filtering pure functions
- `src/reporters/xlsxReporter.ts` — XLSX report generation (refactored out of spreadsheetWriter) *(new)*
- `src/reporters/whatsappReporter.ts` — WhatsApp dual-tab HTML dashboard generator *(new)*
- `src/reporters/telegramNotifier.ts` — Telegram post-run summary notifier *(new)*
- `src/reporters/htmlDashboard.ts` — Standalone Chart.js HTML dashboard *(new)*
- `src/utils/spreadsheetWriter.ts` — Legacy Excel writer; to be refactored into xlsxReporter
- `src/types/AttendanceRecord.ts` — AttendanceRecord interface *(new)*
- `src/types/DuesRecord.ts` — DuesRecord interface *(new)*
- `src/types/ComboResult.ts` — ComboResult interface *(new)*
- `src/types/PaymentInstallment.ts` — PaymentInstallment interface *(new)*
- `src/types/WaiverRecord.ts` — WaiverRecord interface *(new)*
- `src/scheduler.ts` — node-cron nightly scheduler daemon *(new)*
- `src/cli.ts` — Commander CLI wrapper with flag overrides *(new)*
- `src/main.ts` — Main orchestrator; updated with all new integrations
- `package.json` — Metadata, scripts, engines field
- `tsconfig.json` — TypeScript strict mode enablement
- `vitest.config.ts` — Vitest test runner configuration *(new)*
- `docs/ARCHITECTURE.md` — Data flow and module map *(new)*
- `docs/TROUBLESHOOTING.md` — Common errors and fixes *(new)*
- `docs/FILTERS.md` — REPORT_COLUMNS and DUE_STUDENTS_ONLY reference *(new)*

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update the file AND run a git commit covering whats changed (feature/functionality+ filename:lineNumber) in commit message **after completing each atomic sub-sub-task**, not just after completing a parent task.

---

## Tasks

### Phase 0: Setup

- [ ] 0.0 Create feature branch
  - SKIP THIS

---

### Phase 1: Critical Security Hardening (P0)

- [x] 1.0 Remove hardcoded credentials from `config.ts` and purge git history
- [x] 1.1 Expand `.gitignore` to cover all PII-containing output files
- [x] 1.2 Fix misleading `.env.example` comment
- [x] 1.3 Add undocumented env vars to `.env.example`

---

### Phase 2: Core Extraction Architecture (P0)

- [x] 2.0 Replace DOM scraping in `attendance.ts` with API response interception
- [x] 2.1 Add `failedCombos` tracking and `run_manifest.json` to `accountsReceivable.ts`
- [x] 2.2 Harden `errorHandler.ts` screenshot catch and `fileWriter.ts` empty-array guard

---

### Phase 3: Reliability, Observability & Notifications (P1 — Month 1)

**Theme:** Make the tool trustworthy, visible, and connected to stakeholders.

- [x] 3.0 Configure test runner and write unit tests for pure-function modules
  - [x] 3.1 Set up Vitest
    - [x] 3.1.1 Install vitest: `npm install -D vitest`
    - [x] 3.1.2 Create `vitest.config.ts` in project root
    - [x] 3.1.3 Add `include: ['src/**/*.test.ts']` inside `defineConfig({ test: { ... } })`
    - [x] 3.1.4 Replace `"test": "playwright test"` with `"test": "vitest run"` in `package.json`
    - [x] 3.1.5 Run `npm test` and confirm vitest starts without errors
  - [x] 3.2 Write `duesFilter.test.ts`
    - [x] 3.2.1 Create `src/processors/duesFilter.test.ts`
    - [x] 3.2.2 Import `parseNumeric`, `isJunkRow`, `filterDuesRows`
    - [x] 3.2.3–3.2.12: Edge case tests (parseNumeric, isJunkRow, filterDuesRows)
    - [x] 3.2.13 Run `npm test` and confirm all duesFilter tests pass
  - [x] 3.3 Write `spreadsheetWriter.test.ts`
    - [x] 3.3.1–3.3.6: Column filtering, sorting, summary row tests
    - [x] 3.3.7 Run `npm test` and confirm all spreadsheetWriter tests pass
  - [x] 3.4 Write `fileWriter.test.ts`
    - [x] 3.4.1–3.4.5: Backup logic, empty-array guard, directory creation tests
    - [x] 3.4.6 Run `npm test` and confirm all fileWriter tests pass

- [x] 3.1 Implement structured JSON logging mode in `logger.ts`
  - [x] 3.1.1–3.1.9: Add `LOG_FORMAT=json` mode, refactor all log methods, verify ANSI output unchanged

- [x] 3.2 Emit `run_metrics.json` per execution
  - [x] 3.2.1–3.2.13: Create `metricsCollector.ts`, wire into `accountsReceivable.ts` and `main.ts`

- [x] 3.3 Add actionable error messages to `login.ts`
  - [x] 3.3.1–3.3.8: Classify errors (timeout, selector, credentials) and map to human-readable messages

- [x] 3.4 Add global execution timeout and window state reset between combos
  - [x] 3.4.1–3.4.11: Add `MAX_TOTAL_RUNTIME_MS`, break loop on timeout, reset `window.__ar*` between combos

- [x] 3.5 Restrict `user-data/` directory permissions to owner-only
  - [x] 3.5.1–3.5.4: `chmod 700`, startup permission check

- [x] 3.6 Build standalone HTML Summary Dashboard (`htmlDashboard.ts`)
  - [x] 3.6.1–3.6.19: Chart.js bar/pie/trend charts, top defaulters table, self-contained HTML, wire into `main.ts`

- [x] 3.7 Build WhatsApp notification generator (`whatsappReporter.ts`)
  - [x] 3.7.1 Create `src/reporters/whatsappReporter.ts`
  - [x] 3.7.2 Define and export `generateWhatsAppDashboard(attendance: AttendanceRecord[], dues: DuesRecord[]): void`
  - [x] 3.7.3 Staff compiler: aggregate present/absent/late per employee, compose salary slip message
  - [x] 3.7.4 Parent dues compiler: compose parent reminder with student name/ID/class/total due
  - [x] 3.7.5 URL-encode messages, build `wa.me/` deep links
  - [x] 3.7.6 Generate `output/wa-data.js` with staff and parent link arrays
  - [x] 3.7.7 Generate `output/WhatsApp-Links-Dashboard.html` with dual-tab interface (Staff / Parents)
  - [x] 3.7.8 Add `GENERATE_WHATSAPP_DASHBOARD=false` to `.env.example`
  - [x] 3.7.9 Wire into `main.ts` behind env flag
  - [x] 3.7.10 Run with flag enabled, verify both tabs render with correct links

- [x] 3.8 Implement Telegram post-run notifier (`telegramNotifier.ts`)
  - [x] 3.8.1 Create `src/reporters/telegramNotifier.ts`
  - [x] 3.8.2–3.8.7: Read tokens, compose Markdown summary, POST to Telegram API
  - [x] 3.8.8 Wrap in try/catch, never throw on failure
  - [x] 3.8.9 Add Telegram env vars to `.env.example`
  - [x] 3.8.10 Wire into `main.ts` behind env flag
  - [x] 3.8.11 Test with real bot token and chat ID

- [x] 3.9 Implement Data Change Detection Diff Engine (`diffEngine.ts`)
  - [x] 3.9.1–3.9.15: Create diff engine, define interfaces, implement `diffSnapshot()`, wire into `main.ts`, write tests

---

### Phase 4: UX, Developer Experience & Scheduling (P1 — Month 2)

**Theme:** Close the loop from extraction to operator UX.

- [x] 4.0 Add CLI wrapper using `commander`
  - [x] 4.0.1–4.0.15: Create `src/cli.ts`, define options (--year, --shift, --class, --type, --whatsapp, --preview, --headed, --no-cache, --min-due), merge into CONFIG

- [x] 4.1 Add combo progress bar with ETA
  - [x] 4.1.1–4.1.7: Create `formatHelpers.ts`, add per-combo timing and ETA logging

- [x] 4.2 Cache dropdown discovery with 24-hour TTL
  - [x] 4.2.1–4.2.8: Create `comboCache.ts`, cache to `output/.combo_cache.json`, add `--no-cache` flag

- [x] 4.3 Implement automatic PII cleanup
  - [x] 4.3.1–4.3.7: Add `MAX_OUTPUT_AGE_DAYS`, scan and delete old files on startup

- [x] 4.4 Add nightly scheduler (`node-cron`)
  - [x] 4.4.1–4.4.4: Create `src/scheduler.ts`, default `30 8 * * *`

- [x] 4.5 Add selector health check before extraction runs
  - [x] 4.5.1–4.5.7: Create `selectorHealthCheck.ts`, verify all critical selectors

---

### Phase 5: Advanced Features & Commercialization (P2 — Month 3+)

**Theme:** Deepen financial auditing, add cloud sync, and prepare for multi-school commercialization.

#### 5A: Payment Ledger & Waiver Tracking

- [x] 5.0 Student-wise Payment Ledger extraction
  - [x] 5.0.1 Create `src/types/PaymentInstallment.ts` interface
  - [x] 5.0.2 Create `src/extractors/paymentLedger.ts`
  - [x] 5.0.3 For each due student, POST to `/site/fee/student-payment-report/get-site-single-student-payment-summary` with `{ user_name, academic_year_id, active_status: 1 }`
  - [x] 5.0.4 Flatten response into installment records: `{ studentId, studentName, installmentName, amount, dueDate, paidDate, status }`
  - [x] 5.0.5 Wire into main.ts after accounts receivable extraction
  - [x] 5.0.6 Add Payment Ledger as dedicated tab in XLSX workbook
  - [x] 5.0.7 Add `EXTRACT_PAYMENT_LEDGER=true` to `.env.example`
  - [x] 5.0.8 Test with real portal credentials

- [x] 5.1 Class-wise Waiver/Concession tracking
  - [x] 5.1.1 Create `src/types/WaiverRecord.ts` interface
  - [x] 5.1.2 Create `src/extractors/waiverExtractor.ts`
  - [x] 5.1.3 POST to `/site/fee/student-payment-report/get-site-class-base-waiver-list` per class/shift combo
  - [x] 5.1.4 Flatten response: `{ studentId, studentName, waiverType, reason, amount, months, academicYear }`
  - [x] 5.1.5 Enrich accounts receivable records with waiver columns (Waiver Amount, Waiver Reason)
  - [x] 5.1.6 Add "Waiver Amount & Reasons" column to XLSX output
  - [x] 5.1.7 Add `EXTRACT_WAIVERS=true` to `.env.example`
  - [x] 5.1.8 Wire into main.ts behind env flag
  - [x] 5.1.9 Test with real portal credentials

#### 5B: Cloud Sync & Integrations

- [x] 5.2 Google Drive & Google Sheets sync
  - [x] 5.2.1 Create `src/utils/cloudSync.ts`
  - [x] 5.2.2 Implement Google Drive upload for XLSX files using Google Drive API v3
  - [x] 5.2.3 Implement Google Sheets sync for raw dues JSON using Sheets API v4
  - [x] 5.2.4 Add service account credential env vars: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SHEETS_SPREADSHEET_ID`
  - [x] 5.2.5 Add `ENABLE_CLOUD_SYNC=false` to `.env.example`
  - [x] 5.2.6 Wire into main.ts after extraction completes
  - [x] 5.2.7 Handle auth errors gracefully (log warning, never block extraction)
  - [x] 5.2.8 Test with real Google Cloud project

- [x] 5.3 Desktop notifications on run completion
  - [x] 5.3.1 Install `node-notifier`: `npm install node-notifier`
  - [x] 5.3.2 Create `src/utils/desktopNotifier.ts`
  - [x] 5.3.3 Send OS notification with run summary (duration, records extracted, failures)
  - [x] 5.3.4 Add `ENABLE_DESKTOP_NOTIFICATIONS=false` to `.env.example`
  - [x] 5.3.5 Wire into main.ts behind env flag

- [x] 5.4 Uptime heartbeat pings (Better Stack / Cronitor)
  - [x] 5.4.1 Create `src/utils/heartbeat.ts`
  - [x] 5.4.2 Ping heartbeat URL at run start and run end
  - [x] 5.4.3 Add `HEARTBEAT_URL=` to `.env.example`
  - [x] 5.4.4 Wrap in try/catch, never throw on failure
  - [x] 5.4.5 Wire into main.ts behind env flag

#### 5C: Anti-Bot & Human-Like Interaction

- [x] 5.5 Integrate `ghost-cursor` for human-like mouse movements
  - [x] 5.5.1 Install ghost-cursor: `npm install ghost-cursor`
  - [x] 5.5.2 Apply human-like cursor paths to dropdown clicks and login inputs
  - [x] 5.5.3 Add velocity profiles for organic navigation patterns
  - [x] 5.5.4 Test against Cloudflare/WAF-protected portal pages

#### 5D: First-Run Experience & Onboarding

- [x] 5.6 Interactive first-run setup wizard
  - [x] 5.6.1 Detect missing `.env` on startup
  - [x] 5.6.2 Prompt interactively: PORTAL_BASE_URL, PORTAL_USERNAME, PORTAL_PASSWORD
  - [x] 5.6.3 Validate portal URL reachability with HEAD request
  - [x] 5.6.4 Write `.env` file automatically from user input
  - [x] 5.6.5 Add `--setup` flag to `cli.ts` to force re-run of wizard

#### 5E: Architecture Refactoring

- [x] 5.7 Decouple extractors from reporters (three-layer architecture)
  - [x] 5.7.1 Create `src/processors/duesProcessor.ts` for filtering, enrichment, diff computation
  - [x] 5.7.2 Move pure functions from `accountsReceivable.ts` into processors
  - [x] 5.7.3 Refactor `spreadsheetWriter.ts` into `src/reporters/xlsxReporter.ts`
  - [x] 5.7.4 Ensure all processor/reporter modules are testable offline (no browser dependency)
  - [x] 5.7.5 Update imports in `main.ts` to use new module paths

- [x] 5.8 TypeScript strict mode & proper interfaces
  - [x] 5.8.1 Enable `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` in `tsconfig.json`
  - [x] 5.8.2 Define `src/types/AttendanceRecord.ts` interface
  - [x] 5.8.3 Define `src/types/DuesRecord.ts` interface
  - [x] 5.8.4 Define `src/types/ComboResult.ts` interface
  - [x] 5.8.5 Replace `Record<string, any>` with proper types across codebase
  - [x] 5.8.6 Fix all resulting type errors

- [x] 5.9 Documentation
  - [x] 5.9.1 Create `docs/ARCHITECTURE.md` with data flow diagram and module map
  - [x] 5.9.2 Create `docs/TROUBLESHOOTING.md` with common errors and fixes
  - [x] 5.9.3 Create `docs/FILTERS.md` documenting REPORT_COLUMNS and DUE_STUDENTS_ONLY interaction
  - [x] 5.9.4 Update README.md with full CLI usage, env vars, and scheduler setup

#### 5F: Commercialization & Multi-School

- [x] 5.10 Multi-school configurability
  - [x] 5.10.1 Refactor selectors.ts to support school-specific selector profiles
  - [x] 5.10.2 Add `SCHOOL_PROFILE` env var (e.g., "duha", "other-school")
  - [x] 5.10.3 Validate portal UI consistency across 2+ eduexpert24 subdomains
  - [x] 5.10.4 Document onboarding steps for new schools

- [x] 5.11 Historical data ledger (SQLite)
  - [x] 5.11.1 Install `better-sqlite3`: `npm install better-sqlite3`
  - [x] 5.11.2 Create `src/utils/historyDb.ts` with SQLite schema for dues, attendance, runs
  - [x] 5.11.3 Append each run's data to the database
  - [x] 5.11.4 Enable trend queries: "dues by month", "attendance patterns"
  - [x] 5.11.5 Wire into main.ts after extraction
  - [x] 5.11.6 Add `ENABLE_HISTORY_DB=false` to `.env.example`

#### 5G: Packaging & Deployment

- [x] 5.12 Tauri desktop wrapper
  - [x] 5.12.1 Initialize Tauri project: `npm create tauri-app`
  - [x] 5.12.2 Create React/Vue frontend for dashboard and run controls
  - [x] 5.12.3 Wrap CLI runner and local HTML dashboard in Tauri shell
  - [x] 5.12.4 Add system tray icon and auto-update support
  - [x] 5.12.5 Build for Windows, macOS, Linux

- [ ] 5.13 Docker Compose for cloud deployment
  - [ ] 5.13.1 Create `Dockerfile` with Playwright + Node.js base image
  - [ ] 5.13.2 Create `docker-compose.yml` with cron scheduler service
  - [ ] 5.13.3 Mount output volume for report persistence
  - [ ] 5.13.4 Document AWS ECS / GCP Cloud Run deployment steps

---

## Relevant Files (Phase 3 additions)

- `src/reporters/whatsappReporter.ts` — WhatsApp dual-tab HTML dashboard generator *(new)*
- `src/reporters/telegramNotifier.ts` — Telegram post-run summary notifier *(new)*
- `src/reporters/htmlDashboard.ts` — Standalone Chart.js HTML dashboard *(new)*
- `src/utils/diffEngine.ts` — Day-over-day dues diff engine *(new)*
- `src/utils/metricsCollector.ts` — Per-run metrics collection and output *(new)*
- `src/utils/formatHelpers.ts` — Duration formatting helper *(new)*

---

## Relevant Files (Phase 5 additions)

- `src/extractors/paymentLedger.ts` — Per-student payment ledger API extraction *(new)*
- `src/extractors/waiverExtractor.ts` — Class-wide waiver/concession API extraction *(new)*
- `src/types/PaymentInstallment.ts` — PaymentInstallment interface *(new)*
- `src/types/WaiverRecord.ts` — WaiverRecord interface *(new)*
- `src/utils/cloudSync.ts` — Google Drive and Google Sheets upload *(new)*
- `src/utils/desktopNotifier.ts` — OS notification on run completion *(new)*
- `src/utils/heartbeat.ts` — Uptime heartbeat pings (Better Stack / Cronitor) *(new)*
- `src/utils/historyDb.ts` — SQLite historical data ledger *(new)*
- `src/reporters/xlsxReporter.ts` — XLSX report generation (refactored) *(new)*
- `src/processors/duesProcessor.ts` — Pure-function dues processing layer *(new)*
