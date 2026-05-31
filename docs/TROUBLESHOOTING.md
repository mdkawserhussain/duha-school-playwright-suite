# Troubleshooting

## Common Errors

### "Portal login page did not load"
**Cause:** Portal URL is wrong or network is down.
**Fix:** Check `PORTAL_BASE_URL` in `.env`. Run `curl -I <your-url>` to verify connectivity.

### "Credentials may be incorrect"
**Cause:** Login form loaded but dashboard didn't appear after submit.
**Fix:** Verify `PORTAL_USERNAME` and `PORTAL_PASSWORD` in `.env`. Try logging in manually in a browser.

### "Portal UI may have changed"
**Cause:** A selector in `selectors.ts` no longer matches the portal DOM.
**Fix:** Run `npm run check:selectors` to identify which selector is broken. Update `src/utils/selectors.ts` with the new selector.

### "Combo extraction failed"
**Cause:** The portal returned an error or timed out for a specific Year/Shift/Class combo.
**Fix:** Check `output/run_manifest_*.json` for the specific error. The combo is skipped and partial results are saved.

### "Empty extraction result"
**Cause:** No students matched the filter criteria, or the API returned empty data.
**Fix:** Check if `PORTAL_DUE_STUDENTS_ONLY=true` is filtering out all students. Try with `PORTAL_DUE_STUDENTS_ONLY=false`.

### "Dropdown cache stale"
**Cause:** Portal changed its dropdown IDs since last cache.
**Fix:** Run with `--no-cache` flag to force fresh discovery: `npm start -- --no-cache`

### "XSRF token missing"
**Cause:** Browser session expired or cookies not persisted.
**Fix:** Delete `user-data/` directory and re-login: `rm -rf user-data && npm start`

### Cloud sync fails
**Cause:** Service account credentials invalid or folder/sheet IDs wrong.
**Fix:** Verify `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SHEETS_SPREADSHEET_ID` in `.env`.

### TypeScript errors after changes
**Fix:** Run `npx tsc --noEmit` to check types. Run `npm test` to verify tests pass.

## Log Files

- `output/run_history.json` — Append-only log of all runs
- `output/run_manifest_*.json` — Per-run combo results and timing
- `output/run_metrics.json` — Latest execution metrics
- `errors/*.png` — Screenshots from fatal errors

## Useful Commands

```bash
npm start                          # Normal run
npm start -- --preview             # Dry-run (no file writes)
npm start -- --no-cache            # Force fresh dropdown discovery
npm start -- --setup               # Re-run setup wizard
npm run check:selectors            # Verify portal selectors
npm test                           # Run unit tests
npx tsc --noEmit                   # Type-check
```
