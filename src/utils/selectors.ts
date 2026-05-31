/**
 * Centralized Selector Registry
 *
 * All selectors used by the automation suite are stored here.
 * This ensures that if the portal UI changes, we only need to update this file.
 *
 * IMPORTANT: These use standard semantic and accessibility-based selector patterns
 * (getByRole, getByLabel, etc.) and should be calibrated against the actual portal DOM.
 *
 * Multi-school support: Set SCHOOL_PROFILE env var to load school-specific overrides.
 * Profiles: "duha" (default), or custom profile names.
 */

interface SelectorProfile {
  login: {
    usernameInput: { name: string; placeholder: string };
    passwordInput: { name: string; placeholder: string };
    submitButton: { role: 'button'; name: RegExp };
  };
  dashboard: {
    heading: { role: 'heading'; name: RegExp };
    userAvatar: { role: 'img'; name: RegExp };
  };
  attendance: {
    monthDropdown: { role: 'combobox'; name: RegExp };
    datePicker: { role: 'textbox'; name: RegExp };
    dataTable: { role: 'table' };
  };
  finance: {
    yearDropdown: string;
    shiftDropdown: string;
    classDropdown: string;
    dueOnlyCheckbox: { role: 'checkbox'; name: RegExp };
    getReportButton: { role: 'button'; name: RegExp };
    dataTable: { role: 'table' };
  };
  pagination: {
    nextButton: { role: 'button'; name: RegExp };
    pageIndicator: { role: 'status'; name: RegExp };
  };
}

// Default selectors (DUHA school)
const DEFAULT_SELECTORS: SelectorProfile = {
  login: {
    usernameInput: { name: 'Email or Username', placeholder: 'Email or Username' },
    passwordInput: { name: 'Password', placeholder: 'Password' },
    submitButton: { role: 'button' as const, name: /log\s*in/i },
  },
  dashboard: {
    heading: { role: 'heading' as const, name: /dashboard/i },
    userAvatar: { role: 'img' as const, name: /profile|avatar/i },
  },
  attendance: {
    monthDropdown: { role: 'combobox' as const, name: /select\s*month/i },
    datePicker: { role: 'textbox' as const, name: /date|from|start/i },
    dataTable: { role: 'table' as const },
  },
  finance: {
    yearDropdown: 'select:has(option:has-text("Select Year"))',
    shiftDropdown: 'select:has(option:has-text("Select Shift"))',
    classDropdown: 'select:has(option:has-text("Select Class"))',
    dueOnlyCheckbox: { role: 'checkbox' as const, name: /due student/i },
    getReportButton: { role: 'button' as const, name: /get report/i },
    dataTable: { role: 'table' as const },
  },
  pagination: {
    nextButton: { role: 'button' as const, name: /next|chevron-right/i },
    pageIndicator: { role: 'status' as const, name: /page/i },
  },
};

// School-specific overrides
const PROFILES: Record<string, Partial<SelectorProfile>> = {
  // Add more schools here as they're onboarded
  // Example:
  // otherrshool: {
  //   finance: {
  //     yearDropdown: 'select:has(option:has-text("Select Academic Year"))',
  //   },
  // },
};

function getProfile(): SelectorProfile {
  const profileName = (process.env.SCHOOL_PROFILE || 'duha').toLowerCase();
  const overrides = PROFILES[profileName] || {};
  return { ...DEFAULT_SELECTORS, ...overrides };
}

// Export singleton selectors object (resolves profile at import time)
export const SELECTORS: SelectorProfile = getProfile();
