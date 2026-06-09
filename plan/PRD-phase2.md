# PRD: Payroll Web Integration (Phase 2)

## Overview

Add a Payroll tab to the school portal scraper's web UI that proxies to js-agv8's existing Express server, enabling the admin to run the full salary pipeline from a single browser surface without switching between two web UIs.

## Problem

After Phase 1, two separate systems exist:
1. **School portal scraper** (port 3001) — attendance extraction, student dues, WhatsApp parent links
2. **js-agv8** (port 3000) — staff salary computation, bank letters, audit, WhatsApp salary slips

The admin must:
- Open port 3001 for student extraction
- Open port 3000 for salary computation
- Run `npm run payroll` in terminal for the bridge
- Manually verify output matches between systems

This breaks the single-surface experience.

## Goal

The portal scraper's Payroll tab acts as a **thin proxy** to js-agv8's server.js, providing:
- Pipeline trigger (parse → reports → verify → WhatsApp)
- Live SSE progress streaming
- Salary preview from `temp/parsed.json` + `config.json`
- Verification audit display
- Staff config viewer/editor
- Generated file listing + download
- Name matching dashboard (portal attendance ↔ config.json staff)

js-agv8's server.js remains the source of truth for all payroll logic. No payroll computation is reimplemented.

## Users

- School admin (same person who runs extraction)
- Non-technical — prefers one browser tab for everything

## Success Criteria

1. Click "Payroll" tab in portal scraper UI → see js-agv8 status (connected/disconnected)
2. Click "Run Pipeline" → triggers js-agv8's run.js, streams progress via SSE
3. Preview shows per-staff salary breakdown from js-agv8's output
4. Verification audit displayed inline with pass/fail per staff
5. Staff config editable with save-back to js-agv8's config.json
6. Generated files downloadable without leaving the portal scraper UI
7. Name matching warnings when portal attendance names don't match config.json staff

## Scope

### In Scope (Phase 2)
- `src/server/routes/payroll.ts` — proxy routes to js-agv8 server
- `web/src/pages/Payroll.tsx` — Payroll tab with sub-panels
- SSE bridge — pipe js-agv8's log stream to portal scraper's SSE
- Status detection — check if js-agv8 server is running
- Config proxy — read/write js-agv8's config.json via its API
- Preview enrichment — read parsed.json, compute salary breakdown in TypeScript
- Audit proxy — fetch audit-report.txt / audit-snapshot.json from js-agv8
- File proxy — list/download output files from js-agv8
- Name matching dashboard — compare portal attendance names vs config.json staff

### Out of Scope (Phase 3)
- js-agv8 server.js modifications
- WhatsApp salary slip sending (programmatic)
- Multi-month batch processing
- Auto-sync attendance → payroll on schedule
- Mobile responsive layout
- Auth/security between the two servers

## Dependencies

- Phase 1 complete (bridge module + CLI)
- js-agv8 at `js-agv8/` (tracked in git)
- js-agv8 server.js must be running (or we start it)
- Portal attendance extraction must have run at least once
- js-agv8/config.json must exist with staff entries

## Architecture Decision

**Why proxy instead of reimplementation?**

js-agv8's server.js already provides:
- `GET/PUT /api/config` — full config read/write
- `GET /api/parsed` — attendance data
- `GET /api/payroll` — final payroll results
- `GET /api/audit` — audit report text
- `POST /api/run/*` — parse, all, verify, bank2, whatsapp (each with SSE)
- `GET /api/outputs` — file listing
- `GET /api/download/:filename` — file download
- `GET /api/logs` — SSE log stream

Reimplementing this in the portal scraper would duplicate 257 lines of server.js + all the pipeline logic. The proxy approach:
- Keeps one source of truth (js-agv8)
- Avoids sync issues between two config.json copies
- Lets js-agv8 evolve independently
- Portal scraper only adds UI value (richer panels, integration with student data)

## User Stories

1. **As admin**, I click "Payroll" tab → see connection status to js-agv8 server
2. **As admin**, I see last run summary: date, status, staff count, output files
3. **As admin**, I click "Run Pipeline" → progress streams in real-time
4. **As admin**, I see per-staff preview: name, role, pdays, absent, late, basic, tiffin, deductions, net
5. **As admin**, I click a staff row → expand to see daily attendance logs
6. **As admin**, I see verification audit: calc vs report vs bank, pass/fail per staff
7. **As admin**, I can edit staff config (basic, allowance, bank) and save
8. **As admin**, I can download generated files (docx, csv, html)
9. **As admin**, I see name matching warnings (portal ↔ config.json)
10. **As admin**, I can run individual phases (parse only, verify only, etc.)
