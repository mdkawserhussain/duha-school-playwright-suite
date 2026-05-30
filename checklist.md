## Master Todo List

### ✅ Already Done
- [x] Three-phase table refresh detection for combo extraction
- [x] Phase 2 small-class shortcut with `beforeCount` guard
- [x] Timeout reduction (20s → 15s)
- [x] Custom class sort order in XLSX (Pre Play → Play → Nursery → KG → Reception → One–Eight → Year One–Three → BC classes)
- [x] Column-scoped dues filtering (`REPORT_COLUMNS` × `DUE_STUDENTS_ONLY` interaction)
- [x] Run history tracking (`output/run_history.json`)
- [x] Due-student checkbox handling with retry loop
- [x] Shift dropdown discovery with `minCount=2` guard
- [x] `.env.example` updated with `REPORT_COLUMNS` and `DUE_STUDENTS_ONLY` docs
- [x] `.gitignore` already covers `output/*` (includes `.xlsx`)
- [x] `tsconfig.json` already has `strict: true`

---

### 🔴 P0 — Security (this week)

- [ ] **Remove hardcoded credentials** from `src/config.ts` — change `|| 'e232290012'` and `|| '01889534420'` to `|| ''`; add `process.exit(1)` in `validateConfig()` when empty
- [ ] **Purge credentials from git history** using `git-filter-repo` or BFG
- [ ] **Fix `.env.example` comment** — remove "leave blank to use DUHA defaults", replace with "Required — no defaults"
- [ ] **Add undocumented env vars** to `.env.example`: `NAVIGATE_CONSOLE_MODE`, `LOGIN_URL`, `HEADLESS`

---

### 🟠 P0 — Attendance Module

- [ ] **Replace DOM scraping with API interception** in `src/extractors/attendance.ts` — intercept `POST /employee-date-wise-attendance-list`, parse `employee_list[].date_list[]`, flatten to `{ Employee ID, Name, Designation, Contact, Date, Status, In Time, Out Time, Hours, Late }`

---

### 🟠 P0 — Data Integrity

- [ ] **Track failed combos** — maintain `failedCombos[]` array in combo loop, write `output/run_manifest_YYYY-MM-DD.json` with `{ totalCombos, successfulCombos, failedCombos, totalRawRecords, totalDueRecords, durationMs }`
- [ ] **Add INCOMPLETE banner** in XLSX summary when combos fail

---

### 🟡 P1 — Reliability & Error Handling

- [ ] **Harden `errorHandler.ts`** — wrap `page.screenshot()` in nested try-catch so it never re-throws
- [ ] **Guard empty-array writes** in `fileWriter.ts` — when `data.length === 0` and backup exists, abort write and preserve backup
- [ ] **Add global execution timeout** (`MAX_TOTAL_RUNTIME_MS` in config, default 10 min) — break combo loop if exceeded, write partial results
- [ ] **Reset `window.__ar*` state** at start of each `extractCombo` call via `page.evaluate`
- [ ] **Actionable login error messages** — map timeout/selector errors to human-readable guidance in `login.ts`
- [ ] **Selector health check** — verify all critical selectors exist on page before extraction starts, abort with clear message if any missing

---

### 🟡 P1 — Observability & Metrics

- [ ] **Structured JSON logging mode** (`LOG_FORMAT=json`) — emit `{ timestamp, level, message, context }` instead of ANSI colors
- [ ] **Execution metrics** (`output/run_metrics_YYYY-MM-DD.json`) — per-combo timings, duration, system info
- [ ] **Progress indication with ETA** — `[Combo 12/21] Class "Nursery" (Day) — 43 records | Elapsed: 2m 15s | ETA: ~3m` + final summary table

---

### 🟡 P1 — Output Quality

- [ ] **PII auto-cleanup** (`MAX_OUTPUT_AGE_DAYS=30`) — delete output files older than threshold on startup
- [ ] **Restrict `user-data/` permissions** to `0700` on creation
- [ ] **Dropdown discovery cache** (`output/.combo_cache.json` with 24h TTL) — skip DOM discovery on subsequent runs
- [ ] **Standalone HTML summary dashboard** (`src/reporters/htmlDashboard.ts`) — Chart.js bar/pie/trend charts, top defaulters table, self-contained HTML

---

### 🟡 P1 — Notifications

- [ ] **WhatsApp reporter** (`src/reporters/whatsappReporter.ts`) — compile staff attendance + parent dues messages, generate `WhatsApp-Links-Dashboard.html` with dual-tab interface, gated behind `GENERATE_WHATSAPP_DASHBOARD=true`
- [ ] **Telegram notifier** (`src/reporters/telegramNotifier.ts`) — post-run summary to Telegram chat, gated behind `ENABLE_TELEGRAM_NOTIFICATIONS=true`

---

### 🟡 P1 — Diff & Change Detection

- [ ] **Data change detection engine** (`src/utils/diffEngine.ts`) — compare consecutive run JSONs, detect new defaulters, cleared dues, increased/decreased amounts, output `dues_diff_YYYY-MM-DD.json`

---

### 🟡 P1 — Developer Experience

- [ ] **Unit tests with Vitest** — `duesFilter.test.ts`, `spreadsheetWriter.test.ts`, `fileWriter.test.ts`; replace `playwright test` with `vitest run` in `package.json`
- [ ] **CLI wrapper** (`src/cli.ts`) — `commander`/`yargs` for `--year`, `--shift`, `--class`, `--type dues`, `--headed`, `--preview`, `--no-cache`
- [ ] **Documentation** — `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING.md`, `docs/FILTERS.md`
- [ ] **Fix `package.json`** — set `"main": "src/main.ts"`, add `"engines": { "node": ">=18" }`, fill description

---

### 🔵 P2 — Automation & Scheduling

- [ ] **Nightly scheduler** (`src/scheduler.ts`) — `node-cron` at 8:30 AM, Docker Compose option
- [ ] **Auto-detect portal UI changes** — health-check selectors before each run

---

### 🔵 P2 — Commercialization

- [ ] **Multi-school validation** — test if other eduexpert24 subdomains have same portal structure
- [ ] **Historical data ledger** — SQLite database for longitudinal tracking, enables diff + trend dashboards
- [ ] **Smart dues escalation detection** — flag students with 3+ consecutive increases
- [ ] **Google Drive/Sheets sync** (`src/utils/cloudSync.ts`)
- [ ] **Desktop app wrapper** (Tauri/Electron)
- [ ] **Telegram run notifications**
- [ ] **Uptime heartbeats** (Better Stack/Cronitor)

---

**Total: 5 items done, 35 remaining** (10 P0, 12 P1, 6 P2, plus ~7 smaller items)

Which area would you like to tackle first?
