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
- [ ] 1.1 Expand `.gitignore` to cover all PII-containing output files
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

- [ ] 3.0 Configure test runner and write unit tests for pure-function modules
  - [ ] 3.1 Set up Vitest
    - [ ] 3.1.1 Install vitest: `npm install -D vitest`
    - [ ] 3.1.2 Create `vitest.config.ts` in project root
    - [ ] 3.1.3 Add `include: ['src/**/*.test.ts']` inside `defineConfig({ test: { ... } })`
    - [ ] 3.1.4 Replace `"test": "playwright test"` with `"test": "vitest run"` in `package.json`
    - [ ] 3.1.5 Run `npm test` and confirm vitest starts without errors
  - [ ] 3.2 Write `duesFilter.test.ts`
    - [ ] 3.2.1 Create `src/processors/duesFilter.test.ts`
    - [ ] 3.2.2 Import `parseNumeric`, `isJunkRow`, `filterDuesRows`
    - [ ] 3.2.3–3.2.12: Edge case tests (parseNumeric, isJunkRow, filterDuesRows)
    - [ ] 3.2.13 Run `npm test` and confirm all duesFilter tests pass
  - [ ] 3.3 Write `spreadsheetWriter.test.ts`
    - [ ] 3.3.1–3.3.6: Column filtering, sorting, summary row tests
    - [ ] 3.3.7 Run `npm test` and confirm all spreadsheetWriter tests pass
  - [ ] 3.4 Write `fileWriter.test.ts`
    - [ ] 3.4.1–3.4.5: Backup logic, empty-array guard, directory creation tests
    - [ ] 3.4.6 Run `npm test` and confirm all fileWriter tests pass

- [ ] 3.1 Implement structured JSON logging mode in `logger.ts`
  - [ ] 3.1.1–3.1.9: Add `LOG_FORMAT=json` mode, refactor all log methods, verify ANSI output unchanged

- [ ] 3.2 Emit `run_metrics.json` per execution
  - [ ] 3.2.1–3.2.13: Create `metricsCollector.ts`, wire into `accountsReceivable.ts` and `main.ts`

- [ ] 3.3 Add actionable error messages to `login.ts`
  - [ ] 3.3.1–3.3.8: Classify errors (timeout, selector, credentials) and map to human-readable messages

- [ ] 3.4 Add global execution timeout and window state reset between combos
  - [ ] 3.4.1–3.4.11: Add `MAX_TOTAL_RUNTIME_MS`, break loop on timeout, reset `window.__ar*` between combos

- [ ] 3.5 Restrict `user-data/` directory permissions to owner-only
  - [ ] 3.5.1–3.5.4: `chmod 700`, startup permission check

- [ ] 3.6 Build standalone HTML Summary Dashboard (`htmlDashboard.ts`)
  - [ ] 3.6.1–3.6.19: Chart.js bar/pie/trend charts, top defaulters table, self-contained HTML, wire into `main.ts`

- [ ] 3.7 Build WhatsApp notification generator (`whatsappReporter.ts`)
  - [ ] 3.7.1 Create `src/reporters/whatsappReporter.ts`
  - [ ] 3.7.2 Define and export `generateWhatsAppDashboard(attendance: AttendanceRecord[], dues: DuesRecord[]): void`
  - [ ] 3.7.3 Staff compiler: aggregate present/absent/late per employee, compose salary slip message
  - [ ] 3.7.4 Parent dues compiler: compose parent reminder with student name/ID/class/total due
  - [ ] 3.7.5 URL-encode messages, build `wa.me/` deep links
  - [ ] 3.7.6 Generate `output/wa-data.js` with staff and parent link arrays
  - [ ] 3.7.7 Generate `output/WhatsApp-Links-Dashboard.html` with dual-tab interface (Staff / Parents)
  - [ ] 3.7.8 Add `GENERATE_WHATSAPP_DASHBOARD=false` to `.env.example`
  - [ ] 3.7.9 Wire into `main.ts` behind env flag
  - [ ] 3.7.10 Run with flag enabled, verify both tabs render with correct links

- [ ] 3.8 Implement Telegram post-run notifier (`telegramNotifier.ts`)
  - [ ] 3.8.1 Create `src/reporters/telegramNotifier.ts`
  - [ ] 3.8.2–3.8.7: Read tokens, compose Markdown summary, POST to Telegram API
  - [ ] 3.8.8 Wrap in try/catch, never throw on failure
  - [ ] 3.8.9 Add Telegram env vars to `.env.example`
  - [ ] 3.8.10 Wire into `main.ts` behind env flag
  - [ ] 3.8.11 Test with real bot token and chat ID

- [ ] 3.9 Implement Data Change Detection Diff Engine (`diffEngine.ts`)
  - [ ] 3.9.1–3.9.15: Create diff engine, define interfaces, implement `diffSnapshot()`, wire into `main.ts`, write tests

---

### Phase 4: UX, Developer Experience & Scheduling (P1 — Month 2)

**Theme:** Close the loop from extraction to operator UX.

- [ ] 4.0 Add CLI wrapper using `commander`
  - [ ] 4.0.1–4.0.15: Create `src/cli.ts`, define options (--year, --shift, --class, --type, --whatsapp, --preview, --headed, --no-cache, --min-due), merge into CONFIG

- [ ] 4.1 Add combo progress bar with ETA
  - [ ] 4.1.1–4.1.7: Create `formatHelpers.ts`, add per-combo timing and ETA logging

- [ ] 4.2 Cache dropdown discovery with 24-hour TTL
  - [ ] 4.2.1–4.2.8: Create `comboCache.ts`, cache to `output/.combo_cache.json`, add `--no-cache` flag

- [ ] 4.3 Implement automatic PII cleanup
  - [ ] 4.3.1–4.3.7: Add `MAX_OUTPUT_AGE_DAYS`, scan and delete old files on startup

- [ ] 4.4 Add nightly scheduler (`node-cron`)
  - [ ] 4.4.1–4.4.4: Create `src/scheduler.ts`, default `30 8 * * *`

- [ ] 4.5 Add selector health check before extraction runs
  - [ ] 4.5.1–4.5.7: Create `selectorHealthCheck.ts`, verify all critical selectors

---

## Relevant Files (Phase 3 additions)

- `src/reporters/whatsappReporter.ts` — WhatsApp dual-tab HTML dashboard generator *(new)*
- `src/reporters/telegramNotifier.ts` — Telegram post-run summary notifier *(new)*
- `src/reporters/htmlDashboard.ts` — Standalone Chart.js HTML dashboard *(new)*
- `src/utils/diffEngine.ts` — Day-over-day dues diff engine *(new)*
- `src/utils/metricsCollector.ts` — Per-run metrics collection and output *(new)*
- `src/utils/formatHelpers.ts` — Duration formatting helper *(new)*
