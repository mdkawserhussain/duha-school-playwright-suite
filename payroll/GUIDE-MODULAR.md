# Modular Usage Guide: DUHA Payroll System

This guide explains how to use the DUHA Payroll System by running each modular script individually. This approach gives you granular control over every step of the process, allowing you to stop, inspect, and modify data between phases.

### Detailed Checklist

1. Update leave records. then check notes below and google keep for any adjustment/execptions. and update them if required. (merge keep notes with notes section below)
2. Review and update configuration settings. if any exceptions, update them in config.json.
    
    *In config.json, add* - 
    exceptions:

    [x] 1. add  no tiffin  day (default no tiffin- saturday)
    [x] 2. add no lateness day/customtiming for people/dayspecific timing for day  (default no late- saturday)
    [x] 3. add off saturdays to holiday (default  saturdays are working days if not added to holiday- without tiffin and late )
    [x] 4. set customTiming for warda,subah(+skiplatecheck),rasel,maruf,arafat,irfan,masum,,mili,
    [x] 5. set dayspecificTiming

3. Run `node parse.js` and verify the output.
4. Review and update `parsed.docx`.
5. Run `node all.js` and verify the output.
6. Review and update `monthly-all-formatted.docx`.
7. Update the grand total.
8. Run `verify.js` and review the results.
9. Run `bank2.js` and verify the output.
10. Run `verify.js --final` and confirm final validation.
11. Review and update TA records.
12. Run `wa.js` / `wa2.js` and verify results.
13. Update individual files.
14. Update leave records again if required.
15. Copy final outputs into the Financial Document.

---


# Note 
---
moyna nany must deduct june

each month check
- remove old employees

- any increment
- - ruba missed in may (DONE)
- - eshita from april missed (due 1k)

- any pf return or deduction 
- -geeti pf ded JUNE July
- - Tahsina? ask prince
--  ismat? ask prince
-- pushpo? ask prince
-- eshita pf ded June July

- any prev due
- - Taslima Bonus due - JUNE
- - eshita missed incr 1k - June
- - prity wrong absent ded in may, should return 440 with june salary

- any bonus
- 


new time nanny
boro 6:55
other - 7:10
---
config-
nanny timing
cutom teachers timing(arafat,irfan)
---

######## 
Exceptions
######## 
- warda mam timing
- subah mam timing and late
- arafat, masum, irfan timing
- mili, maruf, rasel timing,
- warda TA 250 per present day
- arafat, subah, sadia TA 100 per present day

####### 
leave balance zero
######
keya
prity
taslima
irfan
-----------------


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
*   **Phase 7:** Run `wa2.js` / `wa3.js` or `email.js` to distribute individual payroll summaries from the master spreadsheet.



## Prerequisites
---


Before starting any payroll cycle, ensure you have updated the **`config.json`** file and reviewed the following checklist:

### Pre-Flight Checklist
- [ ] Are the `"holidays"` arrays accurately reflecting all off-days for the current month?
- [ ] Are the `"tiffinExclusionDays"` correctly mapped (e.g., days where staff worked but tiffin was not provided)?
- [ ] Have any school-wide policy changes regarding base salaries or standard working days been updated?
- [ ] Is there any person who had a different standard entry time requiring special lateness logic?
- [ ] Are there any missing attendance logs due to power failures or machine malfunctions on a specific date?
- [ ] Are there any staff who forgot to punch out? How should those anomalies be handled manually?
- [ ] Did any staff work on a designated holiday? If so, how is their attendance being tracked?
- [ ] Are there any days this month as exceptions for tiffin counting? (e.g., half-days, special events)
- [ ] Have any staff been granted an increment or salary raise this month that needs to be updated?
- [ ] Are there any one-off bonuses (Eid, festival, performance) that need to be added?
- [ ] Have Overtime (OT) hours been manually calculated and added to the exceptions for the relevant staff?
- [ ] Are Provident Fund (PF) deductions or returns correctly applied to the specific staff members for this cycle?
- [ ] Are there any manual deduction exceptions to apply this month?
- [ ] Are there any adjustments or arrears needed from previous miscalculations?

### Standard Updates
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
