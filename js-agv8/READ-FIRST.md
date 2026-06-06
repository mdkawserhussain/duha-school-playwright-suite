### **Pre-Processing Checklist & Note**

**Important Note Before Starting:** 
Before initiating this cycle, verify that all system configurations are current. Crucially, ensure that all calculation logic strictly utilizes the **most recent per-day salary figures** for every staff member. Do not carry over or rely on previous outputs for deduction calculations to ensure absolute accuracy in final payouts.

---

### **Salary Processing Phase List**
*   **Phase 00:** Answer Pre-Flight Checklist & cover read-first.md and guide-modular.md  
*   **Phase 0:** Update `config.json` (log exceptions, apply increments, adjust parameters).
*   **Phase 1:** Run `parse.js` to extract data from `att.docx`.
*   **Phase 2:** Cross-check and manually update the new `parsed.docx` against the physical printed attendance report.
*   **Phase 3:** Run `all.js` to generate the monthly master spreadsheet from `parsed.docx`.
*   **Phase 4:** Update the master spreadsheet. Ensure formulas are active and input data for late dates/minutes, absent dates, and calculation explanations. 
*   **Phase 5:** Run `math.sh` on the spreadsheet to scan for calculation errors. Fix any mistakes found.
*   **Phase 6:** Export a CSV copy (optional for ease), then run `bank.js` to generate the bank statement. Immediately run `audit.js` to cross-check and resolve any mismatches.
*   **Phase 7:** Run `wa.js` / `wa2.js` or `email.js` to distribute individual payroll summaries from the master spreadsheet.



------------


# Modular Usage Guide: DUHA Payroll System

This guide explains how to use the DUHA Payroll System by running each modular script individually. This approach gives you granular control over every step of the process, allowing you to stop, inspect, and modify data between phases.

---

## Prerequisites

Before starting any payroll cycle, ensure you have updated the **`config.json`** file.
1. Set the correct `"month"` and `"year"`.
2. Update `"holidays"` and `"tiffinExclusionDays"` arrays.
3. Update any per-staff `"exceptions"` (e.g., OT, increment, bonus, PF).
4. Ensure `"locked": false` so reports can be generated.

---

## Phase 1: Parse Raw Biometric Data

**Command:**
```bash
node parse.js
```

**What it does:**
- Reads the raw exported biometric attendance from `input/att.docx`.
- Calculates working days, present days, leaves, absents, and late penalties based on your `config.json` policies.
- Automatically applies any attendance overrides set in staff exceptions.

**Outputs:**
- `temp/parsed.json`: The raw computed data for the next scripts.
- `temp/parsed.docx`: A human-readable and **editable** table of the attendance calculations.
- `temp/parse-summary.txt`: A quick text file showing if any staff are missing from the configuration or from the attendance machine.

---

## Phase 2: Manual Review (Human Step)

1. Open `temp/parsed.docx`.
2. Cross-reference the calculated "P" (Present), "L" (Leave), and "Ab" (Absent) columns against your printed attendance report.
3. If you need to make a correction, edit the number directly in `parsed.docx` and **Save the file**. The system will prioritize your manual edits over its own auto-calculations in the next phase.

---

## Phase 3: Generate Master Reports

**Command:**
```bash
node all.js
```

**What it does:**
- Reads the auto-calculated `temp/parsed.json` and merges it with your manual edits from `temp/parsed.docx`.
- Computes gross salary, late fines, absent deductions, tiffin allowances, and all financial exceptions (OT, bonuses, PF).
- Generates the final, formatted Word documents.

**Outputs (in `output/`):**
- `Monthly-All-[Month]-[Year].docx`: The master spreadsheet for school records.
- `Salary-Report-[Month]-[Year].docx`: Multi-page document with individual payslips for staff.
- `Bank-Transfer-[Month]-[Year].docx`: The official letter to the bank for staff with accounts, plus a list of cash disbursements.
- `Bank-Transfer-[Month]-[Year].csv`: A CSV copy of the bank list for easy importing.

---

## Phase 4: Spreadsheet Annotation (Human Step)

1. Open the newly generated `output/Monthly-All-[Month]-[Year].docx`.
2. Verify the auto-generated `Details` column (e.g., "Ab:3,10 Lt:5(2m)").
3. Fill in the `Markings` column with any special, human-readable notes (e.g., "Resigned on 15th", "Advance deducted").
4. **Do not alter the Math/Net columns directly.** If the math is wrong, fix `config.json` or `parsed.docx` and run Phase 3 again.

---

## Phase 5: Intermediate Verification

**Command:**
```bash
node verify.js
```

**What it does:**
- Acts as an automated auditor. It reads the actual generated `Monthly-All` document.
- Recalculates the math row-by-row (`Basic + Allowance + Tiffin + OT + Increment + Bonus - PF Deduction + PF Return - Deductions = Net`).
- Checks if the Net Pay exactly matches what is written in the Bank Transfer document.

**Outputs:**
- Console report showing `✅ OK` or `❌ ERR` for every staff member.
- Flags any missing staff, math errors, or file sync discrepancies.
- `output/audit-report.txt`: A saved copy of the terminal output.

---

## Phase 6: Legacy Bank Letter (Optional Alternative)

If you are **not** using the automated pipeline (Phases 1-3) and are relying on a manually updated spreadsheet (`input/monthly2.docx`), use this script to generate the Bank Transfer letter.

**Command:**
```bash
node bank2.js
node bank2.js --dry-run
```

**What it does:**
- Reads the manual `monthly2.docx` file.
- Separates staff with bank accounts from staff paid in cash.
- The `--dry-run` flag prints the Bank vs. Cash split to the console without creating a file.

**Outputs:**
- `output/bank2.docx` and a `.csv` copy.

---

## Phase 7: Final Verification

**Command:**
```bash
node verify.js --final
```

**What it does:**
- Runs the same audit as Phase 5, but enables **Grand Total Reconciliation**.
- It verifies that `(Total Bank Output) + (Total Cash Output) == Grand Total on Monthly-All`.
- Detects if any staff member accidentally appears in both lists.
- Detects anomalies (e.g., "Warning: John's salary increased by 25% compared to last month").

**Outputs:**
- `output/audit-snapshot-[Month]-[Year].json`: Saves the final verified totals to track anomalies in the future.

---

## Phase 8: WhatsApp Notifications

**Commands:**
```bash
node wa.js --preview
node wa.js
```

**What it does:**
- Reads the finalized `Monthly-All` document.
- Generates individualized WhatsApp salary slip messages incorporating basic pay, deductions, attendance details, and any exception notes.
- The `--preview` flag allows you to safely view the first 3 generated messages in your console to ensure the formatting looks correct before creating the dashboard.

**Outputs:**
- `output/WhatsApp-Links-[Month].html`: An interactive HTML dashboard. Open this in Chrome/Edge, click the button next to a staff member's name, and it will open a pre-filled WhatsApp Web chat.

*(Note: Use `node wa2.js` instead if you used the legacy `monthly2.docx` manual path in Phase 6).*

---

## Phase 9: Lock Configuration

Once payroll is distributed and finalized, open `config.json` and change `"locked": false` to `"locked": true`. 

This prevents `all.js` from accidentally overwriting your finalized, audited documents.


-----------

# All-in-One Orchestrator Guide: DUHA Payroll System

This guide explains how to use the **`run.js`** Orchestrator. Instead of remembering the sequence of 8 different scripts, the orchestrator handles the entire payroll pipeline automatically. It runs scripts in the correct order, manages intermediate file states, and provides advanced command-line flags.

---

## The Basic Pipeline Command

The simplest way to run payroll is to execute:

```bash
node run.js
```

### What happens when you type `node run.js`:

1. **Config Validation:** It instantly checks `config.json` for errors, lock status, and missing data.
2. **Phase 1 (Parse):** It reads `att.docx`, processes biometric logs, and creates the editable `parsed.docx`.
3. **⏸️ Manual Pause:** The script pauses and prints:
   `Review temp/parsed.docx now. Edit P/L/Ab/Late values if needed, then save. Press ENTER to continue...`
4. **Phase 3 (Reports):** Once you press ENTER, it generates the Monthly-All, Salary-Report, and Bank-Transfer documents.
5. **Phase 5 (Verify):** It runs an automated mathematical audit on the newly generated documents.
6. **Phase 7 (Final Verify):** It cross-checks bank vs. cash totals and checks for 20% anomalies against last month.
7. **Phase 8 (WhatsApp):** It generates the HTML dashboard for sending WhatsApp salary slips.

---

## Orchestrator Command-Line Flags

You can customize how `run.js` behaves by appending flags to the command. You can combine multiple flags.

### `--phase [Number]`
Runs **only** a specific phase of the pipeline. Use this if you only need to regenerate one piece of the payroll (for example, if you manually fixed the Monthly-All document and just want to re-run WhatsApp generation).

*Examples:*
- `node run.js --phase 1` (Only parses raw attendance)
- `node run.js --phase 3` (Only generates Word Doc reports)
- `node run.js --phase 5` (Only runs the math audit)
- `node run.js --phase 8` (Only creates the WhatsApp dashboard)

### `--no-pause`
By default, the script pauses after Phase 1 so you can manually review and edit `parsed.docx`. Use this flag to run the entire pipeline seamlessly without waiting for human input. Useful if you trust the raw biometric data 100%.

*Example:* `node run.js --no-pause`

### `--skip-wa`
Skips Phase 8 (WhatsApp generation). Use this if you are just generating reports and auditing math, and don't want to clutter the `output/` folder with HTML dashboards yet.

*Example:* `node run.js --skip-wa`

### `--dry-run`
Runs the pipeline normally, but when generating bank files, it simply prints the Bank vs. Cash staff split to your console. It will **not** generate the final `Bank-Transfer.docx` or CSV files. Useful for previewing who is getting paid by what method.

*Example:* `node run.js --dry-run`

### `--preview`
Modifies Phase 8 (WhatsApp generation). Instead of building the HTML dashboard, it simply prints the text of the first three staff messages directly to your console. Extremely useful to verify formatting, exception notes, and overtime lines before you finalize.

*Example:* `node run.js --phase 8 --preview`

---

## Practical Examples & Workflows

**Scenario A: The "Trust the System" Run**
You want to run everything from start to finish automatically without stopping.
```bash
node run.js --no-pause
```

**Scenario B: The Careful Auditor**
You want to parse attendance, preview the WhatsApp texts to make sure bonuses look right, and then stop without generating bank files.
```bash
node run.js --phase 1
node run.js --phase 3
node run.js --phase 8 --preview
```

**Scenario C: End of Month Finalization**
You fixed a typo in the `Monthly-All` document manually. You just want to do the final mathematical reconciliation and generate the WhatsApp dashboard.
```bash
node run.js --phase 5
node run.js --phase 8
```

---

## Handling Errors

If the orchestrator encounters a fatal error (e.g., missing input files, mathematical mismatch, locked configuration), it will immediately halt the pipeline, print a `❌ FAILED` message, and prevent downstream scripts from generating faulty reports. Resolve the issue printed on the screen, and run the pipeline (or the specific `--phase`) again.

