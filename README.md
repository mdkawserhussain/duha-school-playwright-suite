# School Management Portal Automation Suite

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

### Notifications & Reporting
- **WhatsApp Dashboard** — One-click links for parent dues reminders and staff salary slips
- **Telegram Bot** — Post-run summary to any Telegram chat
- **HTML Dashboard** — Interactive charts (Chart.js) for dues by class, collection rate, trends
- **XLSX Reports** — Formatted Excel spreadsheets with custom column filtering
- **Desktop Notifications** — OS notifications on run completion

### Web UI
- **Dashboard** — Summary cards, charts, student search
- **Run History** — Full extraction log from SQLite
- **Trends** — Dues over time with line charts
- **Controls** — Trigger extractions, live log viewer, export buttons
- **Settings** — Edit configuration from the browser

### Desktop App
- **Tauri** — Native cross-platform app (~8MB)
- **Sidecar** — Express server runs automatically inside the app
- **GitHub Actions** — Automated builds for Windows (.msi), macOS (.dmg), Linux (.deb)

### Reliability
- **38 unit tests** for pure-function modules
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
npm start -- --whatsapp                      # Generate WhatsApp dashboard
npm start -- --preview                       # Dry-run (no file writes)
npm start -- --headed                        # Visible browser
npm start -- --no-cache                      # Force fresh dropdown discovery
npm start -- --min-due 5000                  # Only students with ≥ 5000 due
npm start -- --setup                         # Re-run setup wizard
```

## Web UI

```bash
npm run web            # Start server (3000) + Vite dev (5173)
npm run web:server     # API server only
npm run web:build      # Build frontend for production
```

Open `http://localhost:5173` (dev) or `http://localhost:3000` (production).

## Desktop App

```bash
npm run tauri          # Development mode with hot reload
npm run tauri:build    # Build production binary + packages
```

Output in `src-tauri/target/release/bundle/`:
- `School Portal Scraper_1.0.0_amd64.deb` — Debian/Ubuntu
- `School Portal Scraper-1.0.0-1.x86_64.rpm` — Fedora/RHEL

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
| `REPORT_COLUMNS` | (all) | Column substrings to include (e.g., `january,session`) |

### Feature Toggles

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTRACT_ATTENDANCE` | `false` | Extract staff attendance |
| `EXTRACT_ACCOUNTS_RECEIVABLE` | `true` | Extract student dues |
| `EXTRACT_PAYMENT_LEDGER` | `false` | Extract payment installments |
| `EXTRACT_WAIVERS` | `false` | Extract fee waivers |
| `GENERATE_HTML_DASHBOARD` | `false` | Generate Chart.js dashboard |
| `GENERATE_WHATSAPP_DASHBOARD` | `false` | Generate WhatsApp links |
| `ENABLE_TELEGRAM_NOTIFICATIONS` | `false` | Send Telegram post-run summary |
| `ENABLE_DESKTOP_NOTIFICATIONS` | `false` | OS notifications |
| `ENABLE_CLOUD_SYNC` | `false` | Google Drive/Sheets upload |
| `ENABLE_HISTORY_DB` | `false` | SQLite historical ledger |
| `ENABLE_GHOST_CURSOR` | `false` | Anti-bot mouse movements |

### Notifications

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |
| `HEARTBEAT_URL` | Uptime monitoring ping URL |

### Cloud Sync

| Variable | Description |
|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to service account JSON key |
| `GOOGLE_DRIVE_FOLDER_ID` | Target Drive folder |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Target Sheets spreadsheet |

### Advanced

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHOOL_PROFILE` | `duha` | Selector profile for multi-school |
| `MAX_OUTPUT_AGE_DAYS` | `30` | PII cleanup threshold |
| `MAX_TOTAL_RUNTIME_MS` | `600000` | Global execution timeout |
| `LOG_FORMAT` | (colorized) | Set to `json` for structured logs |
| `HEADED` | `false` | Run browser visibly |

See [docs/FILTERS.md](docs/FILTERS.md) for detailed filter interaction.

## Project Structure

```
src/
  main.ts                  # Orchestrator
  cli.ts                   # Commander CLI
  scheduler.ts             # Nightly scheduler
  config.ts                # Configuration
  auth/                    # Login & session
  extractors/              # Data extraction (accounts, attendance, payments, waivers)
  processors/              # Pure-function data processing
  reporters/               # Output generation (HTML, WhatsApp, Telegram)
  utils/                   # Shared utilities (logger, file writer, cache, etc.)
  server/                  # Express API server
  types/                   # TypeScript interfaces
web/                       # React frontend (Vite + Tailwind)
src-tauri/                 # Tauri desktop wrapper (Rust)
docs/                      # Architecture, troubleshooting, filter reference
```

## Output Files

| File | Description |
|------|-------------|
| `output/accounts_receivable_raw_*.json` | Raw extracted dues data |
| `output/accounts_receivable_dues_enriched_*.json` | Filtered dues (students only) |
| `output/attendance_*.json` | Staff attendance records |
| `output/payment_ledger_*.json` | Payment installment histories |
| `output/waivers_*.json` | Fee waivers and concessions |
| `output/accounts_receivable_report_*.xlsx` | Excel spreadsheet |
| `output/dues_dashboard_*.html` | Interactive HTML dashboard |
| `output/WhatsApp-Links-Dashboard.html` | WhatsApp notification links |
| `output/run_manifest_*.json` | Run results and failed combos |
| `output/run_metrics.json` | Execution timing metrics |
| `user-data/history.db` | SQLite historical database |

## Useful Commands

```bash
npm test                           # Run unit tests
npx tsc --noEmit                   # Type-check
npm run check:selectors            # Verify portal selectors
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Data flow and module map
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Common errors and fixes
- [docs/FILTERS.md](docs/FILTERS.md) — REPORT_COLUMNS and DUE_STUDENTS_ONLY reference

## License

ISC
