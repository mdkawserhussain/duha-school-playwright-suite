# task.md — Attendance-to-Payroll Bridge

## Phase 1: Bridge Module + CLI Payroll

### Step 1: Bridge Module
- [ ] 1.1 Create `src/utils/attendanceToPayroll.ts` with interfaces
- [ ] 1.2 Implement `timeTo12h()` — 24h → 12h format
- [ ] 1.3 Implement `groupByEmployee()` — group flat records by employee
- [ ] 1.4 Implement `computeBaseline()` — pdays, absent, leave, late, over20
- [ ] 1.5 Implement `convertToPayrollInput()` — full transformation
- [ ] 1.6 Implement `writePayrollInput()` — write to temp/parsed.json
- [ ] 1.7 Export main function with error handling
- [ ] 1.8 Verify: type-check passes

### Step 2: CLI Script
- [ ] 2.1 Create `scripts/payroll.ts`
- [ ] 2.2 Add CLI args: --attendance, --config, --dry-run, --skip-verify
- [ ] 2.3 Auto-find latest attendance JSON
- [ ] 2.4 Run bridge transformation
- [ ] 2.5 Execute all.js, verify.js, wa.js via child_process
- [ ] 2.6 Report generated files
- [ ] 2.7 Verify: `npm run payroll` runs end-to-end

### Step 3: NPM Script
- [ ] 3.1 Add `"payroll"` script to package.json
- [ ] 3.2 Add `../js-agv8` to .gitignore (don't commit sibling project)

### Step 4: Tests
- [ ] 4.1 Create `src/utils/attendanceToPayroll.test.ts`
- [ ] 4.2 Test: timeTo12h conversions
- [ ] 4.3 Test: status mapping
- [ ] 4.4 Test: late calculation
- [ ] 4.5 Test: name matching
- [ ] 4.6 Test: empty/holiday handling
- [ ] 4.7 Verify: `npm test` passes (38 existing + new)

### Step 5: Documentation
- [ ] 5.1 Update README.md — add Payroll section
- [ ] 5.2 Update task-portal-automation-suite.md — add Phase 6

### Commit Strategy
- [ ] Commit after Step 1: `feat: attendance-to-payroll bridge module`
- [ ] Commit after Step 2: `feat: payroll CLI script`
- [ ] Commit after Step 3: `chore: add payroll npm script`
- [ ] Commit after Step 4: `test: payroll bridge unit tests`
- [ ] Commit after Step 5: `docs: add payroll integration docs`
