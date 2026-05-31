# Architecture

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CLI/Env   │────▶│   main.ts    │────▶│  Extractors  │────▶│   Reporters  │
│  (config)   │     │ (orchestrator)│     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                          │                     │                     │
                          ▼                     ▼                     ▼
                    ┌──────────┐         ┌──────────┐         ┌──────────┐
                    │  Auth    │         │ Processors│         │  Output  │
                    │ (login)  │         │ (filter)  │         │(JSON/XLSX│
                    └──────────┘         └──────────┘         │  /HTML)  │
                                                              └──────────┘
```

## Module Map

### Core
- `src/main.ts` — Main orchestrator, wires all modules together
- `src/cli.ts` — Commander CLI wrapper, merges flags into env vars
- `src/config.ts` — Configuration from env vars, validation
- `src/scheduler.ts` — node-cron nightly scheduler daemon

### Authentication
- `src/auth/authenticate.ts` — Browser context launch, session reuse
- `src/auth/login.ts` — Credential entry, error classification

### Extractors (browser → raw JSON)
- `src/extractors/accountsReceivable.ts` — Combo loop, API calls, XLSX generation
- `src/extractors/attendance.ts` — Attendance API interception
- `src/extractors/paymentLedger.ts` — Per-student payment summaries
- `src/extractors/waiverExtractor.ts` — Class-wide waivers

### Processors (pure functions, no browser)
- `src/processors/duesFilter.ts` — Column-scoped dues filtering

### Reporters (raw JSON → output)
- `src/reporters/htmlDashboard.ts` — Chart.js standalone dashboard
- `src/reporters/whatsappReporter.ts` — WhatsApp links dashboard
- `src/reporters/telegramNotifier.ts` — Telegram post-run summary

### Utilities
- `src/utils/logger.ts` — Structured JSON or colorized console logging
- `src/utils/fileWriter.ts` — JSON output with backup logic
- `src/utils/spreadsheetWriter.ts` — XLSX generation with custom sort
- `src/utils/diffEngine.ts` — Day-over-day dues comparison
- `src/utils/metricsCollector.ts` — Per-run timing metrics
- `src/utils/selectors.ts` — Centralized CSS/ARIA selectors
- `src/utils/dropdownCache.ts` — Dropdown ID map cache (24h TTL)
- `src/utils/piiCleanup.ts` — Auto-delete old output files
- `src/utils/cloudSync.ts` — Google Drive & Sheets upload
- `src/utils/desktopNotifier.ts` — OS notifications
- `src/utils/heartbeat.ts` — Uptime monitoring pings
- `src/utils/humanInteraction.ts` — Anti-bot mouse movements
- `src/utils/setupWizard.ts` — First-run credential setup

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/site/fee/student-payment-report/get-site-class-student-subhead-base-fee-collect-list` | Student dues by class |
| `/site/employee/attendance/report/employee-date-wise-attendance-list` | Staff attendance |
| `/site/fee/student-payment-report/get-site-single-student-payment-summary` | Payment ledger |
| `/site/fee/student-payment-report/get-site-class-base-waiver-list` | Waiver tracking |

## Key Design Decisions

1. **API-first over DOM scraping** — Direct `page.evaluate(fetch(...))` for data extraction; faster and more reliable
2. **Combo loop pattern** — Year × Shift × Class combinations iterated systematically
3. **Fail-soft on combos** — Individual combo failures are logged and skipped, not fatal
4. **Cache with TTL** — Dropdown discovery cached 24h to avoid redundant browser interactions
5. **Env-gated features** — All new features behind env flags, backward compatible
