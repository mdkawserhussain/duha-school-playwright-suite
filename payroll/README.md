# DUHA Payroll System

An automated, data-driven payroll processing system for institutional staff management. This project automates the transformation of biometric attendance and manual overrides into production-ready payroll reports, bank transfers, and automated WhatsApp salary slips.

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





## Setup & Infrastructure

### Requirements
- Node.js (v16 or higher)
- npm

### Installation
Run the following command to install necessary dependencies:
```bash
npm install docx adm-zip
```

---

## 🚀 The 9-Phase Master Pipeline

The entire system is orchestrated by a central runner script. You can run the entire pipeline at once or phase-by-phase.

```bash
# Run the complete pipeline interactively
node run.js

# Or run specific phases
node run.js --phase 1
node run.js --phase 3
```

### Phase 0: Configuration (`config.json`)
Before running any scripts, update `config.json` for the new month:
- Update `year` and `month`
- Update `holidays` and `tiffinExclusionDays`
- Set `exceptions` (OT, increment, bonus, PF) for any staff
- Ensure `locked: false` (lock it to prevent accidental overwrites once finalized)

### Phase 1: Parse Attendance (`parse.js`)
Reads `input/att.docx` (raw biometric export).
- Generates `temp/parsed.json` and a human-readable `temp/parsed.docx`
- Outputs `temp/parse-summary.txt` with unmatched staff warnings

### Phase 2: Manual Review
Open `temp/parsed.docx`.
- Review auto-calculated P/L/Ab/Late values against the printed attendance report.
- Make any manual edits directly in the document and save it.

### Phase 3: Generate Reports (`all.js`)
Reads `temp/parsed.docx` (manual overrides) and `temp/parsed.json` (auto-baselines) and computes the payroll.
- Generates `output/Monthly-All-[Month]-[Year].docx`
- Generates `output/Salary-Report-[Month]-[Year].docx`
- Generates `output/Bank-Transfer-[Month]-[Year].docx` (plus a `.csv` copy)

### Phase 4: Spreadsheet Update
(Process step) Open the `Monthly-All` document.
- Fill in the `Markings` column for any special notes.
- Verify the `Details` column (Ab/Lt/Lv dates).

### Phase 5: Verification (`verify.js`)
Performs a strict mathematical audit of the generated reports.
- Checks `basic + allowance + tiffin + ot + increment + bonus - pfDeduction + pfReturn - deduction == net`.
- Cross-checks synchronization across different document sources.
- Outputs `output/audit-report.txt`.

### Phase 6: Legacy Bank Letter (`bank2.js`)
(Optional) Used only if `input/monthly2.docx` is the source of truth instead of the automated pipeline.
- Generates `output/bank2.docx` and a CSV export.
- You can preview the split with `node run.js --phase 6 --dry-run`.

### Phase 7: Final Verification (`verify.js --final`)
Runs the verification engine with grand-total reconciliation enabled.
- Compares total bank payout + total cash payout against the grand total in the Monthly-All document.
- Flags anomalies (>20% net pay change vs previous month).
- Saves a JSON snapshot in `output/` for future comparisons.

### Phase 8: Notifications (`wa.js` / `wa2.js`)
Generates premium WhatsApp salary slips for all staff.
- Reads final payout data and builds an HTML dashboard: `output/WhatsApp-Links-[Month].html`.
- Click "Send WhatsApp" in the browser to open a pre-filled, formatted message.
- You can preview messages in the terminal using `node run.js --phase 8 --preview`.

---

## 📂 Project Structure

```
project/
├── config.json           ← Source of truth (staff, policies, exceptions)
├── utils.js              ← Shared helper functions
├── input/
│   ├── att.docx          ← Raw biometric export
│   └── monthly2.docx     ← (Optional) Legacy manual spreadsheet
├── temp/
│   ├── parsed.json       ← Auto-extracted attendance
│   ├── parsed.docx       ← Editable attendance table
│   └── parse-summary.txt ← Warnings & stats
├── output/               ← All generated reports, CSVs, audits, and WA dashboards
├── archived_scripts/     ← Deprecated legacy scripts
├── run.js                ← All-in-one orchestrator script
├── parse.js              ← Phase 1 script
├── all.js                ← Phase 3 script
├── verify.js             ← Phase 5/7 audit script
├── bank2.js              ← Phase 6 script
├── wa.js                 ← Phase 8 script
└── wa2.js                ← Phase 8 script (legacy path)
```

---

## ⚙️ Configuration Rules

### 1. The `exceptions` System
Every staff member in `config.json` supports an `exceptions` block. This is how you apply one-off monthly adjustments:
```json
"exceptions": {
  "ot": 200,                // BDT overtime
  "increment": 0,           // BDT one-time increment
  "bonus": 3000,            // BDT bonus
  "pfDeduction": 0,         // BDT deducted for Provident Fund
  "pfReturn": 0,            // BDT added back from Provident Fund
  "note": "Festival Bonus", // Appears in WA message & markings
  "skipLateCheck": false,   // If true, late penalties are ignored
  "skipAbsentDeduction": false, // If true, absent penalties are ignored
  "overridePdays": null,    // Hardcode present days (bypasses att.docx)
  "overrideAbsent": null    // Hardcode absent days (bypasses att.docx)
}
```

### 2. Lock the Pipeline
When payroll is finalized, set `"locked": true` in `config.json`. This prevents `all.js` from accidentally overwriting the finalized `Monthly-All` documents.

### 3. CLI Orchestrator Flags
The `run.js` orchestrator supports several flags:
- `--phase N` : Run a specific phase (1, 3, 5, 6, 8)
- `--skip-wa` : Skip Phase 8 WhatsApp generation
- `--dry-run` : Do not write Bank files, just print the Bank vs Cash split
- `--final`   : Run Phase 7's final verification with total reconciliation
- `--no-pause`: Do not wait for user input after Phase 1
- `--preview` : For Phase 8, print the first 3 WA messages instead of generating HTML

## Policy Rules Applied
- **Per Day Salary**: Basic ÷ 25
- **Absent Deduction**: Absent Days × Per Day Salary
- **Late >20 min**: BDT 300 per occurrence
- **3rd Late Day**: Deducts 1 full day salary
- **Late Penalties**: Graduated fines for 1-5m, 6-10m, and 11-20m arrivals after the 4th occurrence.
