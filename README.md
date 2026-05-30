# School Management Portal Automation Suite

A reliable, local browser automation tool powered by Playwright and TypeScript, designed to extract attendance tracking and outstanding financial account receivables from Laravel/Vue.js school management portals.

## Features

- **Persistent Session Reuse:** Uses a local user data directory to store authenticated context, minimizing login cycles and avoiding account locks.
- **Robust Locators:** Employs semantic role and label accessibility selectors, maintaining resilience against UI structural updates.
- **Aggressive Error Handling:** Captures a full-screen emergency PNG on any uncaught timeout or exception and exits cleanly with diagnostic records.
- **Secure by Design:** Credentials are strictly sourced via local environment variables at runtime and redacted automatically from log outputs.

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

| Variable | Description | Required |
|----------|-------------|----------|
| `PORTAL_BASE_URL` | Base URL of the target school management portal | Yes |
| `PORTAL_USERNAME` | Administrator email/username | Yes |
| `PORTAL_PASSWORD` | Administrator password | Yes |
| `LOGIN_URL` | Explicit path to the login screen (defaults to `PORTAL_BASE_URL` if omitted) | No |
| `HEADED` | Set to `true` to run the browser visible for debugging (defaults to `false`) | No |

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

- **`output/`**: Contains generated flat JSON datasets named with the execution date (`YYYY-MM-DD`):
  - `attendance_YYYY-MM-DD.json`
  - `accounts_receivable_YYYY-MM-DD.json`
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
