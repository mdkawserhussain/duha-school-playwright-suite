/**
 * Centralized Selector Registry
 * 
 * All selectors used by the automation suite are stored here.
 * This ensures that if the portal UI changes, we only need to update this file.
 * 
 * IMPORTANT: These use standard semantic and accessibility-based selector patterns
 * (getByRole, getByLabel, etc.) and should be calibrated against the actual portal DOM.
 */

export const SELECTORS = {
  // Authentication Module
  login: {
    // Label or placeholder for the username/email input field
    usernameInput: { name: 'Email or Username', placeholder: 'Email or Username' },
    // Label or placeholder for the password input field
    passwordInput: { name: 'Password', placeholder: 'Password' },
    // Role button text or regex pattern for the login submit action
    submitButton: { role: 'button' as const, name: /log\s*in/i },
  },

  // Post-auth verification
  dashboard: {
    // Header indicating successful dashboard state
    heading: { role: 'heading' as const, name: /dashboard/i },
    // Alternative sidebar link or element indicating authenticated state
    userAvatar: { role: 'img' as const, name: /profile|avatar/i },
  },

  // Attendance Module
  attendance: {
    // Dropdown container label
    monthDropdown: { role: 'combobox' as const, name: /select\s*month/i },
    // Secondary date picker if needed
    datePicker: { role: 'textbox' as const, name: /date|from|start/i },
    // Dynamic Vue element representing the main attendance list/table
    dataTable: { role: 'table' as const },
  },

  // Accounts Receivable / Finance Module
  finance: {
    // Report criteria filters
    yearDropdown: 'select:has(option:has-text("Select Year"))',
    shiftDropdown: 'select:has(option:has-text("Select Shift"))',
    classDropdown: 'select:has(option:has-text("Select Class"))',
    dueOnlyCheckbox: { role: 'checkbox' as const, name: /due student/i },
    getReportButton: { role: 'button' as const, name: /get report/i },
    // Dynamic element representing the financial receivables list/table
    dataTable: { role: 'table' as const },
  },

  // Generic Pagination
  pagination: {
    // Next page button locator
    nextButton: { role: 'button' as const, name: /next|chevron-right/i },
    // Secondary selector for page tracking if needed
    pageIndicator: { role: 'status' as const, name: /page/i },
  },

  // Student Profile Enrichment
  studentProfile: {
    // Selector/pattern to identify student profile link in the data table
    studentLink: 'a[href*="profile"], a[href*="detail"], td:nth-child(2) a, td:nth-child(3) a',
    // Text patterns or labels to extract parent contact details on the profile page
    labels: {
      guardianName: /Guardian(?:'s)?\s*Name/i,
      fatherName: /Father(?:'s)?\s*Name|Father\s*Name/i,
      motherName: /Mother(?:'s)?\s*Name|Mother\s*Name/i,
      guardianPhone: /Guardian(?:'s)?\s*(?:Mobile|Phone|Contact)/i,
      fatherPhone: /Father(?:'s)?\s*(?:Mobile|Phone|Contact)/i,
      motherPhone: /Mother(?:'s)?\s*(?:Mobile|Phone|Contact)/i,
      primaryPhone: /(?:Mobile|Phone|Contact\s*No)/i,
    }
  },
};
