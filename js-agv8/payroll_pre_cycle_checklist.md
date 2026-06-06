# DUHA Pre-Payroll Cycle Checklist

Before running `parse.js` and beginning the payroll automation cycle, review these 40 questions to ensure data accuracy, prevent calculation errors, and handle edge cases.

## 1. Global Configuration (`config.json`)
1. Is the `"month"` and `"year"` updated to the current payroll cycle?
2. Is the `"locked"` status set to `false` to allow new document generation?
3. Are the `"holidays"` arrays accurately reflecting all off-days for the current month?
4. Are the `"tiffinExclusionDays"` correctly mapped (e.g., days where staff worked but tiffin was not provided)?
5. Have any school-wide policy changes regarding base salaries or standard working days been updated?

## 2. Staff Attendance & Biometrics (`input/att.docx`)
6. Did the biometric machine export cover the exact start and end dates of this specific payroll cycle?
7. Is the `input/att.docx` file formatted correctly without corrupted tables or unreadable text formats?
8. Are there any staff members whose biometric IDs changed this month?
9. Is there any person who had a different standard entry time (e.g., shifted to morning vs. day shift) requiring special lateness logic?
10. Are there any missing attendance logs due to power failures or machine malfunctions on a specific date?
11. Are there any staff who forgot to punch out? How should those anomalies be handled manually?
12. Did any staff work on a designated holiday? If so, how is their attendance being tracked?

## 3. Exceptions & Allowances (Tiffin, OT, Increments)
13. Are there any days this month as exceptions for tiffin counting? (e.g., half-days, special events)
14. Have any staff been granted an increment or salary raise this month that needs to be updated in their `config.json` profile?
15. Are there any one-off bonuses (Eid, festival, performance) that need to be added to the `"exceptions"` array?
16. Have Overtime (OT) hours been manually calculated and added to the exceptions for the relevant staff?
17. Are Provident Fund (PF) deductions or returns correctly applied to the specific staff members for this cycle?
18. Are there any manual deduction exceptions (e.g., loan repayments, salary advances, damages) to apply this month?
19. Are there any adjustments or arrears needed from the previous month's miscalculations?

## 4. Absences, Leaves, and Lateness Policies
20. Did any staff take approved unpaid leave that needs to be manually overridden in `parsed.docx`?
21. Are there any staff members who are exempt from lateness deductions entirely for this month?
22. For staff who had official school business outside, do their 'Absent' days need to be converted to 'Present' via manual override?
23. Were there any severe weather days (like heavy rain/cyclone) or strikes where lateness should be forgiven globally or case-by-case?
24. Do any specific staff members have a customized grace period for lateness this month?
25. Is there any pending staff dispute regarding previous attendance that needs to be settled in this cycle?

## 5. New Joinees, Resignations, and Roster Changes
26. Did any staff members resign or leave midway through the month? 
27. For resigned staff, has their base salary calculation been adjusted to reflect a partial month?
28. Have the profiles of resigned staff been archived or flagged appropriately in the active `config.json` list?
29. Have all new joinees been added to `config.json` with their correct starting salaries and designations?
30. Are new joinees subject to prorated salaries based on their exact joining date instead of the full month?
31. Did any staff transition from provisional/probation to permanent, changing their salary structure?
32. Have all new staff been added to the biometric system, and do their names match exactly in `config.json`?

## 6. Bank & Payment Details
33. Have any staff members opened new bank accounts and moved from cash payments to bank transfers?
34. Are the bank account numbers and routing/branch details up-to-date in the `config.json` for all bank-paid staff?
35. Have any staff members requested a temporary switch to cash payment for this specific month?
36. Are mobile numbers up-to-date for all staff to ensure successful delivery of WhatsApp salary slip notifications?
37. Are there any staff members without a registered mobile number who require physically printed salary slips?

## 7. System Integrity & File Preparation
38. Have all old files from the previous month in the `temp/` and `output/` directories been safely backed up, moved, or deleted?
39. Are there any duplicate staff names or profiles in the `config.json` that might cause calculation overlaps or double-payments?
40. Has the approval for this month's special exceptions and deductions been signed off by the principal/headmaster before running the scripts?
