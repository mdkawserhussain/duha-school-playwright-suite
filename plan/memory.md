# Memory: duha-playwright

## Critical Rules

### Rule 1: ALWAYS Use Brainstorming Skill

**Every single prompt MUST use the brainstorming skill first, no exceptions.**
- This applies to ALL tasks: simple questions, fixes, features, refactoring, etc.
- The brainstorming skill helps explore intent, requirements, and design before implementation.
- Never skip brainstorming even if the task seems straightforward.
- Load the skill at the START of every conversation/task.

### Rule 2: Always Check Available Skills

**For every prompt, check what skills are available and use them.**
- Before responding, check if any superpowers-ecc skill applies to the task.
- Use the `skill` tool to load relevant skills.
- Available skills (24 total from superpowers-ecc):
  - `api-design` - API design patterns
  - `brainstorming` - Design exploration
  - `continuous-learning-v2` - Learning workflows
  - `deployment-patterns` - Deployment strategies
  - `dispatching-parallel-agents` - Parallel execution
  - `e2e-testing` - End-to-end testing
  - `eval-harness` - Evaluation harness
  - `executing-plans` - Plan execution with checkpoints
  - `finishing-a-development-branch` - Merge/PR decisions
  - `receiving-code-review` - Handle review feedback
  - `requesting-code-review` - Request reviews
  - `search-first` - Search before coding
  - `security-review` - Security analysis
  - `strategic-compact` - Token optimization
  - `subagent-driven-development` - Subagent workflows
  - `systematic-debugging` - Bug investigation
  - `test-driven-development` - TDD workflow
  - `token-optimization` - Reduce token usage
  - `using-git-worktrees` - Isolated workspaces
  - `using-superpowers-ecc` - Bootstrap/entry point
  - `verification-before-completion` - Pre-merge checks
  - `verification-loop` - Verification cycles
  - `writing-plans` - Create implementation plans
  - `writing-skills` - Create/edit skills

## Project Identity

- **Name**: School Portal Automation Suite (duha-playwright)
- **Purpose**: Extract attendance and financial data from eduexpert24 school management portals
- **Target**: DUHA International School
- **Repo**: `mdkawserhussain/duha-school-playwright-suite`

## Key Architectural Decisions

1. **API interception over DOM scraping** - Uses `page.evaluate(fetch(...))` for data extraction (faster, more reliable)
2. **Combo loop pattern** - Iterates Year×Shift×Class systematically
3. **Fail-soft on combos** - Individual failures logged and skipped, not fatal
4. **Single source of truth** - `PORTAL_COLUMNS` env var controls columns for both CLI and web UI
5. **Env-gated features** - All new features behind env flags for backward compatibility

## Critical Files

| File | Role |
|------|------|
| `src/main.ts` | Orchestrator - wires all modules, entry point |
| `src/config.ts` | Config from env vars with validation |
| `src/extractors/accountsReceivable.ts` | Main extractor (625 lines) |
| `src/server/index.ts` | Express API server |
| `src/utils/selectors.ts` | Centralized CSS/ARIA selectors |
| `src/utils/dropdownCache.ts` | 24h TTL dropdown cache |
| `web/src/App.tsx` | React frontend entry |

## Module Dependencies

```
main.ts
├── auth/authenticate.ts → auth/login.ts
├── extractors/accountsReceivable.ts
│   ├── utils/selectors.ts
│   ├── utils/dropdownCache.ts
│   ├── utils/fileWriter.ts
│   ├── utils/duesFilter.ts
│   └── utils/spreadsheetWriter.ts
├── extractors/attendance.ts
├── extractors/leaveExtractor.ts
├── extractors/paymentLedger.ts
├── extractors/waiverExtractor.ts
├── reporters/htmlDashboard.ts
├── reporters/whatsappReporter.ts
├── reporters/telegramNotifier.ts
└── utils/ (logger, fileWriter, metricsCollector, historyDb, etc.)
```

## Known Patterns

### Dropdown Selection
- Try exact label first → fuzzy substring match → click fallback
- Cache discovered IDs in `dropdownCache.ts` with 24h TTL

### Error Handling
- `handleFatalError()` captures screenshots and logs
- Process-level `unhandledRejection` and `uncaughtException` listeners
- Individual combo failures are logged and skipped

### Output Generation
- JSON: `writeJsonOutput()` with backup logic
- XLSX: `writeXlsxOutput()` with custom sort and summary rows
- HTML: Chart.js standalone dashboard
- WhatsApp: Per-column dues breakdown

## Web UI Pages

| Page | Component | Purpose |
|------|-----------|---------|
| Dashboard | `Dashboard.tsx` | Summary cards, student search, period selector |
| Controls | `Controls.tsx` | Filter strip, extraction, export |
| WhatsApp | `WhatsApp.tsx` | Per-column dues, Send All |
| Logs | `Logs.tsx` | System info, error screenshots, extraction logs |
| Settings | `Settings.tsx` | Collapsible config, PORTAL_COLUMNS |
| RunHistory | `RunHistory.tsx` | Full extraction log from SQLite |
| Trends | `Trends.tsx` | Dues over time line charts |
| Payroll | `Payroll.tsx` | Payroll computation |
| Leave | `Leave.tsx` | Leave management |

## Testing

- Vitest for unit tests
- 38+ unit tests for pure-function modules
- Test files: `*.test.ts` co-located with source

## Desktop App (Tauri)

- ~8MB native binary
- Sidecar Express server
- GitHub Actions CI for Windows (.msi), macOS (.dmg), Linux (.deb)
- Build: `npm run tauri:build`

## Payroll Integration

- Bridge module: `src/utils/attendanceToPayroll.ts`
- CLI script: `scripts/payroll.ts`
 - Transforms portal attendance → payroll format
- Name matching between portal and config.json staff

## Leave System

- Extractor: `src/extractors/leaveExtractor.ts`
- DB: `src/utils/leaveHistoryDb.ts`
- Types: `src/types/LeaveRecord.ts`
- Route: `src/server/routes/leave.ts`

## Common Issues

1. **Port conflict** - Set `WEB_PORT` env var if 3001 is occupied
2. **Selector changes** - Run `npm run check:selectors` to verify
3. **Dropdown cache** - Use `--no-cache` flag to force refresh
4. **Timeout** - Set `MAX_TOTAL_RUNTIME_MS` for slow connections

## Environment Variables (Critical)

```bash
# Required
PORTAL_BASE_URL=https://duhais.eduexpert24.com
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_password

# Optional
PORTAL_YEAR=2026
PORTAL_DUE_STUDENTS_ONLY=true
EXTRACT_ATTENDANCE=false
GENERATE_WHATSAPP_DASHBOARD=false
WEB_PORT=3001
```

## Git Ignore Patterns

- `user-data/` (browser profile, DB)
- `output/` (generated reports)
- `errors/` (screenshots)
- `node_modules/`
- `.env` (secrets)

## Financial Report Extractor

- API endpoint: `/site/accounts/report/ledger-details-list`
- Response format: Array of arrays (not array of objects) - must flatten
- Ledger accounts: Income (Tuition, Session, Admission, Books, Exam, etc.), Expense (Salary, Meal, etc.), Assets (Cash, Bank)
- **Opening balance is completely ignored** - only period transactions are counted
- Uses `total_credit_for_opening_balance` and `upto_date_for_opening_balance` fields to exclude opening balance
- Outputs: JSON files + Excel report (3 sheets: Cash Flow, Fee Collection, Ledger Details)
- Script: `scripts/run-financial.ts` - standalone runner with dotenv
- Web UI: `web/src/pages/Financial.tsx` - state-based navigation
- Status: ✅ Working - successfully extracts data and generates Excel reports
