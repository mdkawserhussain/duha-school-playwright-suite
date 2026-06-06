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
