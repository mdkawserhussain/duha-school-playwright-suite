### **Pre-Processing Checklist & Note**

**Important Note Before Starting:** 
Before initiating this cycle, verify that all system configurations are current. Crucially, ensure that all calculation logic strictly utilizes the **most recent per-day salary figures** for every staff member. Do not carry over or rely on previous outputs for deduction calculations to ensure absolute accuracy in final payouts.

---

### **Salary Processing Phase List**

*   **Phase 0:** Update `config.json` (log exceptions, apply increments, adjust parameters).
*   **Phase 1:** Run `parse.js` to extract data from `att.docx`.
*   **Phase 2:** Cross-check and manually update the new `parsed.docx` against the physical printed attendance report.
*   **Phase 3:** Run `all.js` to generate the monthly master spreadsheet from `parsed.docx`.
*   **Phase 4:** Update the master spreadsheet. Ensure formulas are active and input data for late dates/minutes, absent dates, and calculation explanations. 
*   **Phase 5:** Run `math.sh` on the spreadsheet to scan for calculation errors. Fix any mistakes found.
*   **Phase 6:** Export a CSV copy (optional for ease), then run `bank.js` to generate the bank statement. Immediately run `audit.js` to cross-check and resolve any mismatches.
*   **Phase 7:** Run `wa.js` / `wa2.js` or `email.js` to distribute individual payroll summaries from the master spreadsheet.
