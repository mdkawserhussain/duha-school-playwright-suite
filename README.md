# School Management Portal Automation Suite

[![Build Desktop Apps](https://github.com/mdkawserhussain/duha-school-playwright-suite/actions/workflows/build.yml/badge.svg)](https://github.com/mdkawserhussain/duha-school-playwright-suite/actions/workflows/build.yml)

A complete browser automation toolkit for extracting attendance and financial data from eduexpert24 school management portals. Features a CLI, web dashboard, desktop app, and automated scheduling.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Chromium browser
npx playwright install chromium

# 3. Run interactive setup (creates .env)
npm start -- --setup

# 4. Extract data
npm start
```

## Features

### Extraction
- **Accounts Receivable** — Student dues across all classes, shifts, and fee heads
- **Staff Attendance** — Daily attendance via direct API interception (not DOM scraping)
- **Payment Ledger** — Per-student installment payment histories
- **Waiver Tracking** — Class-wide fee concessions and waivers
- **Diff Engine** — Day-over-day comparison (new defaulters, cleared dues, increases)
- **Financial Reports** — Cash flow, fee collection, and ledger details (ignores opening balance)

### Notifications & Reporting
- **WhatsApp Messages** — Per-column dues breakdown (monthly + fee dues) with period filtering
- **XLSX Reports** — Formatted Excel with per-class Paid/Due summary rows and Grand Total
- **HTML Dashboard** — Interactive charts (Chart.js) for dues by class, collection rate, trends
- **Desktop Notifications** — OS notifications on run completion

### Web UI
- **Dashboard** — Summary cards, student search with dropdown, period selector, click-to-expand detail view
- **Controls** — Unified filter strip (Due Only, Min Amount, Class, Shift, Year, Period), column selection, extraction, Excel/JSON/WhatsApp export
- **WhatsApp** — Per-column dues breakdown (monthly + fee badges), Send All, Open Dashboard
- **Financial** — Date range selection, cash flow summary, fee collection, ledger details, Excel export
- **Logs** — System info, error screenshots, extraction logs, error.log viewer
- **Settings** — Collapsible grouped config, PORTAL_COLUMNS management
- **Run History** — Full extraction log from SQLite
- **Trends** — Dues over time with line charts

### Desktop App
- **Tauri** — Native cross-platform app (~8MB)
- **Sidecar** — Express server runs automatically inside the app
- **GitHub Actions** — Automated builds for Windows (.msi), macOS (.dmg), Linux (.deb)

### Reliability
- **90 unit tests** for pure-function modules
- **Selector health check** — Detects portal UI changes before extraction
- **Dropdown cache** — 24-hour TTL avoids redundant browser interactions
- **Global timeout** — Prevents infinite loops on slow portal responses
- **Run manifest** — Tracks failed combos and incomplete extractions

### Security
- **No hardcoded credentials** — All secrets via `.env` file
- **PII auto-cleanup** — Deletes output files older than N days
- **Session isolation** — Browser profile in `user-data/` with restricted permissions
- **Anti-bot** — Optional ghost-cursor for human-like mouse movements

## CLI Usage

```bash
npm start                                    # Normal run
npm start -- --year 2026 --shift "Day"       # Filter by year and shift
npm start -- --class "One,Two,Three"         # Filter by class
npm start -- --type dues                     # Only extract dues
npm start -- --period "January,February"     # Period filter (till latest month)
npm start -- --min-due 5000                  # Only students with ≥ 5000 due
npm start -- --whatsapp                      # Generate WhatsApp dashboard
npm start -- --preview                       # Dry-run (no file writes)
npm start -- --headed                        # Visible browser
npm start -- --no-cache                      # Force fresh dropdown discovery
npm start -- --setup                         # Re-run setup wizard

# Financial reports
npx tsx scripts/run-financial.ts                                          # Default (current month)
FINANCIAL_FROM_DATE=2026-01-01 FINANCIAL_TO_DATE=2026-01-31 npx tsx scripts/run-financial.ts  # Custom range
```

## Web UI

```bash
npm run web            # Start server + Vite dev (dynamic ports)
npm run web:server     # API server only (default port 3001)
npm run web:build      # Build frontend for production
```

Open `http://localhost:5173` (dev) or serve `web/dist` for production.

## Desktop App

```bash
npm run tauri          # Development mode with hot reload
npm run tauri:build    # Build production binary + packages
```

Output in `src-tauri/target/release/bundle/`:
- `bundle/deb/` — Debian/Ubuntu
- `bundle/msi/` — Windows
- `bundle/nsis/` — Windows (NSIS installer)
- `bundle/macos/` — macOS

CI builds all three platforms automatically via GitHub Actions on push to `main` or tag `v*`.

## Nightly Scheduler

```bash
npm run start:scheduler    # Run extraction daily at 11 PM
SCHEDULE="0 8 * * 1-5" npm run start:scheduler  # Weekdays at 8 AM
```

## Configuration

### Required

| Variable | Description |
|----------|-------------|
| `PORTAL_BASE_URL` | Portal URL (e.g., `https://your-school.eduexpert24.com`) |
| `PORTAL_USERNAME` | Admin username |
| `PORTAL_PASSWORD` | Admin password |

### Filters

| Variable | Default | Description |
|----------|---------|-------------|
| `PORTAL_YEAR` | `2026` | Academic year(s), comma-separated |
| `PORTAL_SHIFT` | (all) | Shift filter (e.g., `Day Shift`) |
| `PORTAL_CLASS` | (all) | Class filter (e.g., `One,Two,Three`) |
| `PORTAL_DUE_STUDENTS_ONLY` | `true` | Only students with outstanding dues |
| `PORTAL_MIN_DUE` | `0` | Minimum due amount threshold |
| `PORTAL_COLUMN_FILTER` | (all) | Fee columns to check for dues (comma-separated) |
| `PORTAL_PERIOD_MONTHS` | (all) | Month names for period filter (e.g., `January,February,March`) |
| `PORTAL_COLUMNS` | (all) | Columns for export and WhatsApp (single source of truth for web UI + CLI) |

### Feature Toggles

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTRACT_ATTENDANCE` | `false` | Extract staff attendance |
| `EXTRACT_ACCOUNTS_RECEIVABLE` | `true` | Extract student dues |
| `ENABLE_HISTORY_DB` | `true` | SQLite historical ledger |
| `GENERATE_WHATSAPP_DASHBOARD` | `false` | Generate WhatsApp dashboard |
| `ENABLE_DESKTOP_NOTIFICATIONS` | `false` | OS notifications |
| `ENABLE_GHOST_CURSOR` | `false` | Anti-bot mouse movements |

### Notifications

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |
| `HEARTBEAT_URL` | Uptime monitoring ping URL |

### Financial Reports

| Variable | Default | Description |
|----------|---------|-------------|
| `FINANCIAL_FROM_DATE` | (current month start) | Start date (YYYY-MM-DD) |
| `FINANCIAL_TO_DATE` | (current month end) | End date (YYYY-MM-DD) |
| `FINANCIAL_STATUS` | `approved` | Transaction status filter |

### Advanced

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHOOL_PROFILE` | `duha` | Selector profile for multi-school |
| `MAX_OUTPUT_AGE_DAYS` | `30` | PII cleanup threshold |
| `MAX_TOTAL_RUNTIME_MS` | `600000` | Global execution timeout |
| `LOG_FORMAT` | (colorized) | Set to `json` for structured logs |
| `WEB_PORT` | `3001` | Express server port |
| `HEADED` | `false` | Run browser visibly |

## Project Structure

```
src/
  main.ts                  # Orchestrator
  cli.ts                   # Commander CLI
  scheduler.ts             # Nightly scheduler
  config.ts                # Configuration
  auth/                    # Login & session
  extractors/              # Data extraction (accounts, attendance, payments, waivers, financial)
  processors/              # Pure-function data processing
  reporters/               # Output generation (HTML, WhatsApp, Telegram)
  utils/                   # Shared utilities (logger, file writer, cache, monthlyTotals, financialReports)
  server/                  # Express API server
    routes/                # API routes (control, dashboard, dues, export, logs, runs, whatsapp, financial)
    sse/                   # Server-sent events for live logs
  types/                   # TypeScript interfaces (FinancialReport.ts)
web/                       # React frontend (Vite + Tailwind)
  src/pages/               # Dashboard, Controls, WhatsApp, Financial, Logs, Settings, RunHistory, Trends
src-tauri/                 # Tauri desktop wrapper (Rust)
scripts/                   # CLI scripts (run-financial.ts)
docs/                      # Architecture, troubleshooting, filter reference
```

## Output Files

| File | Description |
|------|-------------|
| `output/accounts_receivable_raw_*.json` | Raw extracted dues data |
| `output/accounts_receivable_dues_enriched_*.json` | Filtered dues (students only) |
| `output/attendance_*.json` | Staff attendance records |
| `output/dues_report_*.xlsx` | Excel spreadsheet with summary rows |
| `output/dues_dashboard_*.html` | Interactive HTML dashboard |
| `output/WhatsApp-Links-Dashboard.html` | WhatsApp notification links |
| `output/wa-data.json` | Cached WhatsApp links with per-column dues |
| `output/financial_raw_*.json` | Raw financial ledger entries |
| `output/financial_cash_flow_*.json` | Cash flow statement (ignores opening balance) |
| `output/financial_fee_collection_*.json` | Fee collection summary by type |
| `output/financial_report_*.xlsx` | Financial Excel report (3 sheets) |
| `output/run_manifest_*.json` | Run results and failed combos |
| `output/run_metrics_*.json` | Execution timing metrics |
| `user-data/history.db` | SQLite historical database |
| `user-data/logs/error.log` | Error log (all `log.error()` calls) |
| `user-data/logs/extraction_*.log` | Extraction run logs |

## Useful Commands

```bash
npm test                           # Run unit tests
npx tsc --noEmit                   # Type-check
npm run check:selectors            # Verify portal selectors
npx tsx scripts/run-financial.ts   # Run financial extractor
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Data flow and module map
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Common errors and fixes
- [docs/FILTERS.md](docs/FILTERS.md) — Filter reference

## License

ISC
