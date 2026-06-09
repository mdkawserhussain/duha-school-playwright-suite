# PRD: Attendance-to-Payroll Bridge (Phase 1)

## Overview

Bridge the school portal's attendance extraction output with the DUHA Payroll system (js-agv8),
enabling automatic salary calculation from portal attendance data without modifying either project.

## Problem

Currently, salary calculation requires:
1. Exporting biometric `.docx` from a physical machine
2. Manually placing it in `js-agv8/input/att.docx`
3. Running `parse.js` to convert to `temp/parsed.json`
4. Running `all.js` to compute payroll

The school portal already extracts attendance data via API, but there's no path from
`output/attendance_YYYY-MM-DD.json` → payroll.

## Goal

Create a bridge module that transforms portal attendance JSON into the `temp/parsed.json`
format expected by js-agv8's payroll engine, then run payroll as a CLI step.

## Users

- School admin who runs extraction via web UI or CLI
- Same person who runs salary calculation monthly

## Success Criteria

1. `npm run payroll` runs end-to-end: bridge → compute → verify → WhatsApp
2. Output matches manual pipeline (within rounding tolerance)
3. No changes required to js-agv8 source files
4. Bridge handles name matching between portal and config.json staff list

## Scope

### In Scope (Phase 1)
- Bridge module: `src/utils/attendanceToPayroll.ts`
- CLI script: `scripts/payroll.ts`
- Name matching between portal records and config.json staff
- Holiday/weekend awareness from config.json
- Late calculation using threshold from config.json
- JSON output: `js-agv8/temp/parsed.json`
- All js-agv8 reports (Monthly-All, Salary-Report, Bank-Transfer, WhatsApp)

### Out of Scope (Phase 2)
- Web UI Payroll tab (proxy to js-agv8 server.js)
- Real-time sync between portal and payroll
- Config.json auto-generation from portal data
- Email notifications
- Programmatic WhatsApp sending

## Dependencies

- js-agv8 project at `js-agv8/` (sibling directory within same repo, tracked in git)
- Portal attendance extraction must run first
- `js-agv8/config.json` must have staff entries matching portal employee names
