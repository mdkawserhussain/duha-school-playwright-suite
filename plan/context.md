# Project Context: duha-playwright

## Overview

A browser automation toolkit for extracting attendance and financial data from eduexpert24 school management portals. Features CLI, web dashboard, desktop app (Tauri), and automated scheduling.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥18, TypeScript 6.x |
| Browser Automation | Playwright 1.60 |
| Backend API | Express 5.x |
| Frontend | React 19, Vite 8, Tailwind CSS, react-query |
| Desktop | Tauri 2.x (Rust) |
| Database | SQLite (better-sqlite3) |
| Testing | Vitest 4.x |
| CLI | Commander 15.x |

## Project Structure

```
duha-playwright/
├── src/                    # Backend (TypeScript)
│   ├── main.ts            # Orchestrator - entry point
│   ├── cli.ts             # CLI wrapper (Commander)
│   ├── config.ts          # Config from env vars
│   ├── scheduler.ts       # Nightly cron scheduler
│   ├── auth/              # Login & session management
│   │   ├── authenticate.ts
│   │   └── login.ts
│   ├── extractors/        # Data extraction modules
│   │   ├── accountsReceivable.ts  # Student dues (main)
│   │   ├── attendance.ts          # Staff attendance
│   │   ├── leaveExtractor.ts      # Leave applications
│   │   ├── paymentLedger.ts       # Payment history
│   │   └── waiverExtractor.ts     # Fee waivers
│   ├── processors/        # Pure functions
│   │   └── duesFilter.ts
│   ├── reporters/         # Output generation
│   │   ├── htmlDashboard.ts
│   │   ├── whatsappReporter.ts
│   │   └── telegramNotifier.ts
│   ├── server/            # Express API
│   │   ├── index.ts       # Server entry
│   │   └── routes/        # API routes (dashboard, dues, control, etc.)
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Shared utilities (30+ modules)
├── web/                   # React frontend (Vite)
│   └── src/
│       ├── pages/         # Dashboard, Controls, WhatsApp, Logs, Settings, etc.
│       ├── components/    # SummaryCards, DuesByClass
│       └── lib/api.ts     # API client
├── src-tauri/             # Tauri desktop wrapper (Rust)
├── payroll/               # Payroll system (sibling module)
├── leave/                 # Leave data files
├── output/                # Generated reports (JSON, XLSX, HTML)
├── errors/                # Error screenshots
├── user-data/             # Browser profile, SQLite DB, logs
├── plan/                  # Planning documents
├── docs/                  # Architecture, troubleshooting docs
└── scripts/               # Helper scripts (payroll.ts, start-web.mjs)
```

## Core Data Flow

```
CLI/Env Config → main.ts (orchestrator) → Extractors → Reporters → Output
                        ↓                      ↓              ↓
                    Auth (login)          Processors      JSON/XLSX/HTML
```

## Key Modules

### Extractors
- `accountsReceivable.ts` - Main extractor: combo loop (Year×Shift×Class), API interception, XLSX generation
- `attendance.ts` - Staff attendance via API interception
- `leaveExtractor.ts` - Leave applications
- `paymentLedger.ts` - Per-student payment summaries
- `waiverExtractor.ts` - Class-wide waivers

### API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `/site/fee/student-payment-report/get-site-class-student-subhead-base-fee-collect-list` | Student dues |
| `/site/employee/attendance/report/employee-date-wise-attendance-list` | Staff attendance |
| `/site/fee/student-payment-report/get-site-single-student-payment-summary` | Payment ledger |
| `/site/fee/student-payment-report/get-site-class-base-waiver-list` | Waivers |

### Server Routes
- `/api/dashboard` - Summary data
- `/api/dues` - Dues data with filters
- `/api/control` - Start/stop extraction
- `/api/config` - Configuration management
- `/api/whatsapp` - WhatsApp link generation
- `/api/export` - Excel/JSON export
- `/api/logs` - Log viewing
- `/api/runs` - Run history
- `/api/payroll` - Payroll computation
- `/api/leave` - Leave management

## Configuration

All config via `.env` file (never hardcoded):

| Variable | Description |
|----------|-------------|
| `PORTAL_BASE_URL` | Portal URL |
| `PORTAL_USERNAME` | Admin username |
| `PORTAL_PASSWORD` | Admin password |
| `PORTAL_YEAR` | Academic year (default: 2026) |
| `PORTAL_SHIFT` | Shift filter |
| `PORTAL_CLASS` | Class filter |
| `PORTAL_DUE_STUDENTS_ONLY` | Only dues (default: true) |
| `PORTAL_MIN_DUE` | Minimum due threshold |
| `PORTAL_COLUMNS` | Columns for export |
| `PORTAL_PERIOD_MONTHS` | Period filter |
| `EXTRACT_ATTENDANCE` | Enable attendance (default: false) |
| `EXTRACT_ACCOUNTS_RECEIVABLE` | Enable dues (default: true) |
| `GENERATE_WHATSAPP_DASHBOARD` | Enable WhatsApp (default: false) |

## Design Patterns

1. **API-first** - Direct `page.evaluate(fetch(...))` over DOM scraping
2. **Combo loop** - Year×Shift×Class systematic iteration
3. **Fail-soft** - Individual combo failures logged and skipped
4. **Cache with TTL** - Dropdown discovery cached 24h
5. **Env-gated features** - All features behind env flags

## Output Files

| File | Description |
|------|-------------|
| `output/accounts_receivable_raw_*.json` | Raw dues data |
| `output/accounts_receivable_dues_enriched_*.json` | Filtered dues |
| `output/attendance_*.json` | Attendance records |
| `output/dues_report_*.xlsx` | Excel reports |
| `output/WhatsApp-Links-Dashboard.html` | WhatsApp dashboard |
| `user-data/history.db` | SQLite historical database |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run extraction |
| `npm run web` | Start server + Vite dev |
| `npm run web:server` | API server only |
| `npm run tauri` | Desktop dev mode |
| `npm test` | Run unit tests |
| `npm run payroll` | Run payroll computation |
