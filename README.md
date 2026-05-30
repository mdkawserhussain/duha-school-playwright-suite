# School Management Portal Automation Suite

A simple, reliable, local browser automation tool powered by Playwright and TypeScript, designed to extract attendance tracking and outstanding financial account receivables from Laravel/Vue.js school management portals.

## Features

- **Persistent Session Reuse:** Uses a local user data directory to store authenticated context, minimizing login cycles and avoiding account locks.
- **Robust Locators:** Employs semantic role and label accessibility selectors, maintaining resilience against UI structural updates.
- **Aggressive Error Handling:** Captures a full-screen emergency PNG on any uncaught timeout or exception and exits cleanly with diagnostic records.
- **Secure by Design:** Credentials are strictly sourced via local environment variables at runtime and redacted automatically from log outputs.
- **Spreadsheet Generation:** Auto-compiles extracted dues data into cleanly-formatted Excel spreadsheets.

---

## Getting Started

### Prerequisites

- **Node.js:** v18+ (tested with v20+)
- **NPM**

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Download the required browser binary (Chromium):
   ```bash
   npx playwright install chromium
   ```

---

## Configuration

Duplicate `.env.example` to create your own `.env` file in the project root:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORTAL_BASE_URL` | Base URL of the target school management portal | `https://duhais.eduexpert24.com` |
| `PORTAL_USERNAME` | Administrator email/username | `e232290012` |
| `PORTAL_PASSWORD` | Administrator password | `01889534420` |
| `LOGIN_URL` | Explicit path to the login screen (e.g. `/login`) | (None) |
| `PORTAL_YEAR` | Target academic year(s) to process (comma-separated) | `2026` |
| `PORTAL_SHIFT` | Target shift(s) (comma-separated, e.g. `Day Shift`) | (All shifts) |
| `PORTAL_CLASS` | Target class(es) (comma-separated, e.g. `One,Two`) | (All classes) |
| `PORTAL_DUE_STUDENTS_ONLY` | If `true`, filters the spreadsheet report to only include students with outstanding dues | `true` |
| `EXTRACT_ATTENDANCE` | Enable/disable attendance monitoring extraction (`true`/`false`) | `false` |
| `EXTRACT_ACCOUNTS_RECEIVABLE` | Enable/disable accounts receivable extraction (`true`/`false`) | `true` |
| `REPORT_COLUMNS` | Comma-separated list of column substrings to include in output (e.g., `january,session`) | (All columns) |
| `NAVIGATE_CONSOLE_MODE` | Set to `true` to use DOM/console clicking helper actions for custom navigation | `false` |
| `HEADED` | Set to `true` to run the browser visible for debugging | `false` |

---

## Usage

### Run Extraction (Headless)
Executes data collection cleanly in the background:
```bash
npm start
```

### Run Extraction (Headed / Visible)
Launches Chromium visibly to audit layout selections or debug workflows:
```bash
npm run start:headed
```

---

## Directories & Output Layout

All files are structured locally within the workspace directory:

- **`src/`**: TypeScript application source code.
- **`output/`**: Contains generated flat JSON datasets and formatted Excel spreadsheets (`.xlsx`) named with the execution date (`YYYY-MM-DD`):
  - `accounts_receivable_raw_YYYY-MM-DD.json`
  - `accounts_receivable_dues_enriched_YYYY-MM-DD.json`
  - `dues_report_class_<name>_YYYY-MM-DD.xlsx`
- **`errors/`**: Stores emergency diagnostic screenshots (`error_YYYY-MM-DDTHH-MM-SS.png`) generated when operations fail.
- **`user-data/`**: Scoped browser profile data (persistent storage, state cookies, and Vue layout cache). **Keep this directory local and secure; do not check it into version control.**

---

## Customizing Selectors

Select definitions are centralized in [selectors.ts](file:///home/ticktick/Desktop/playwright/src/utils/selectors.ts). If the portal layout changes, update the selectors in this file to match:

```typescript
export const SELECTORS = {
  login: {
    usernameInput: { name: 'Email Address' },
    passwordInput: { name: 'Password' },
    submitButton: { role: 'button', name: /log\s*in/i },
  },
  // ...
};
```

