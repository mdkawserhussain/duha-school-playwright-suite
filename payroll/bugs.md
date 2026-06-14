Static review only (no commands run). Below is a consolidated bug inventory for `/home/ticktick/Desktop/js-ag7`.

---

## Fixed (documented in `implementation_plan.md` / `project_analysis_report.md`)

These were tracked and marked done; worth knowing they *were* bugs:

| # | Issue | Status |
|---|--------|--------|
| 1 | `verify.js` hardcoded “All 53 staff members” | Fixed → uses `config.staff.length` |
| 2 | Config name `"Ayesha Siddika"` vs `"Ayesha Siddika Ruba"` | Fixed in `config.json` |
| 3 | `all.js` OT/Increment/Bonus/PF always `"0"` | Fixed via `exceptions` |
| 4 | `all.js` missing `role` on payroll objects | Fixed |
| 5 | `wa.js` month from filename regex | Fixed → `getMonthName(config)` |
| 6 | `wa2.js` month from staff notes | Fixed → `getMonthName(config)` |
| 7 | Shortened biometric names mis-matched (e.g. `"Akter"` → Fatema Akter Mili) | Mitigated via `manualMap` + exact match in `all.js` / `parse.js` |

---

## Open — code defects (high confidence from source)

### Critical / runtime

1. **`wa.js` & `wa2.js` — `ReferenceError` in `saveDataFile`**  
   `saveDataFile` calls `getWhatsAppMessage(..., config)` but `config` is only defined inside `main()`, not passed in or imported at module scope. Non-preview runs that write `wa-data-*.js` should crash.

```100:100:wa.js
    const msg = getWhatsAppMessage(t, monthName, schoolName, config).replace(/`/g, '\\`');
```

(Same pattern in `wa2.js` line 128.)

2. **`all.js` — crashes on `require` if temp files missing**  
   At load time it always reads `temp/parsed.json` and runs `loadEditedAttendance()` on `temp/parsed.docx` with no existence checks. Running `all.js` before Phase 1 parse fails immediately.

```39:72:all.js
const attendanceData = JSON.parse(fs.readFileSync('temp/parsed.json', 'utf8'));
// ...
const editedData = loadEditedAttendance();
```

### Logic / data correctness

3. **`wa2.js` — off-by-one column guard in `parseMonthly2`**  
   Requires `cells.length < 18` (≥18 cells, indices 0–17) but reads `cells[18]` for notes. Details column is never read when the row has exactly 18 cells.

```40:47:wa2.js
    if (cells.length < 18) return; 
    // ...
    const currentNote = getCellText(cells[18]);
```

4. **`utils.js` — incomplete `manualMap`**  
   Maps `akter`, `aziza`, `afroza`, `jannaturrahman`, `rimananny` but not e.g. **Nargis Akter Nanny** (called out in `project_analysis_report.md`). Fuzzy fallback can still mis-attach attendance.

5. **Fuzzy name matching still used** in `wa.js`, `wa2.js`, `bank2.js`, and `findStaffConfig` fallback in `utils.js`:

```191:194:wa.js
      return pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm);
```

Same class of wrong-staff assignment as the old `all.js` bug, if docx names are partial or ambiguous.

6. **`wa.js` — wrong month file possible**  
   `getLatestReport('Monthly-All-')` picks the newest `.docx` by mtime, not `config.month`. Stale `output/` files can drive WhatsApp content for the wrong month.

7. **`parse.js` — machine summary columns ignored**  
   `rawAbsent`, `leave`, `pdays` are read from trailing cells but baseline uses recomputed `presentDays` / `absentDates`. If the machine summary disagrees with per-day cells, parse output can disagree with the device export.

8. **`all.js` — `isOverride` may not detect manual edits**  
   Override detection compares `manual[field]` to `emp.baseline[field]`, but `manual` from `parsed.docx` has no `baseline`; first-time edits may not behave as “overrides” as intended.

9. **`all.js` — `W. Days` can exceed calendar working days**  
   `empWorkingDays = Math.max(WORKING_DAYS, p.pdays)` can show more working days than the month allows.

10. **`verify.js` — duplicate bank/cash detection is a stub**  
    Block at lines 172–177 is empty; `--final` duplicate checks only scan duplicate names in `config`, not bank+cash double-listing.

11. **`bank2.js` — output path inconsistent with pipeline**  
    Writes `output/bank2.docx`, while `verify.js` expects `output/Bank-Transfer-${monthName}-${config.year}.docx` from `all.js`. Phase 6 output is not part of standard verification.

12. **`run.js` — `--final` can duplicate `process.argv`**  
    `process.argv.push('--final')` on each Phase 7 run without guarding; repeated runs may stack flags.

### Robustness / security / UX

13. **Generated `wa-data-*.js` — weak escaping**  
    Only backticks in messages are escaped; staff `name` / other fields embedded in double-quoted strings can break the file if names contain `"` or `\`.

14. **WhatsApp phone normalization edge cases** (`wa.js` / `wa2.js`)  
    Odd lengths / missing leading `0` may produce invalid `wa.me/...` links; staff with no phone still get rows.

15. **`formatLogs` default year** (`utils.js`)  
    `if (!year) year = 2026` hardcodes 2026 if year is omitted.

16. **`timeToMins`**  
    Times without AM/PM default to AM; ambiguous 12-hour values can be wrong.

17. **`saveDataFile` skip-if-exists**  
    By design, existing `output/wa-data-*.js` is never refreshed; stale/wrong messages persist after payroll fixes.

18. **`archived_scripts/`** (`audit.js`, `reconcile.js`, `mail.js`, `notify.js`)  
    Still use fuzzy name matching and old assumptions; unsafe if run alongside v7 pipeline.

---

## Open — data / pipeline issues (from `output/audit-report.txt`, not re-run)

19. **43 cross-document sync failures**  
    `Monthly-All` + `Bank-Transfer` agree for most staff, but **`input/monthly2.docx` (Input2)** disagrees on 43 nets (often ~+200 BDT, e.g. 25,475 vs 25,675). Verification status: **FAILED** on sync, **PASSED** on internal math and staff parity.

20. **Specific large mismatches (examples)**  
    - Hasan Mahmud: Input2 = `0`  
    - Jannatur Rahman Eshita: 3,030 vs 5,975  
    - Nargis Akter Nanny: 2,100 vs 4,980  
    - Ayesha Siddika Ruba: 10,175 vs 11,425  

    These may be stale `monthly2`, different rules, or remaining matching/calculation issues—not proven without a fresh run.

21. **WhatsApp data name casing**  
    `output/wa-data-monthly2.js` uses `"AYESHA SIDDIKA RUBA"` (from docx) while config uses `"Ayesha Siddika Ruba"` — inconsistent display, not necessarily wrong net.

22. **`bank2.docx` vs `Bank-Transfer-April-2026.docx`**  
    Two bank letter sources can diverge if both are maintained manually.

---

## Design limitations (often reported as “bugs”)

23. **`verify.js` treats missing Input2 as sync error** when `input/monthly2.docx` row is missing or `0` (e.g. Hasan Mahmud), even if Monthly + Bank match.

24. **`parse.js` layout coupling** — `cells.length < 35` and fixed column indices; `att.docx` format change breaks parsing silently (skip rows).

25. **`all.js` / `parse.js` module-level config load** — config changes mid-session need process restart (cache in `run.js` clears modules but `all.js`/`parse.js` re-execute top-level reads).

---

## Summary counts

| Category | Count |
|----------|-------|
| Previously fixed (documented) | 7 |
| Open code defects | 18 |
| Open data/artifact issues | 4 |
| Design limitations | 3 |

The highest-impact open **code** bugs are **#1** (`config` in `saveDataFile`), **#2** (`all.js` requires temp files at import), **#3** (`wa2.js` column 18), and **#4–5** (incomplete / fuzzy name matching).

I did not run the pipeline or tests per your request. If you want debug mode next, we can instrument and confirm #1–#3 with logs before fixing.