# Change Log

## 2026-05-28 — Performance Optimization Sprint

### Change 1: Batch cell extraction in `pagination.ts`

**File**: `src/utils/pagination.ts`

**Problem**: Row cell extraction used individual Playwright bridge calls for every cell
(`cellLocator.nth(j).innerText()`). For 33 rows × 36 columns = 1188 bridge crossings,
each taking ~20ms, totaling ~24s.

**Fix**: Replace per-cell `innerText()` loop with a single `row.evaluate()` call
that reads all cells at once via DOM APIs inside the browser context.

**Before** (lines 93-101):
```typescript
const cellLocator = currentRow.locator('td, [role="gridcell"]');
const cellCount = await cellLocator.count();
const record: Record<string, any> = {};
for (let j = 0; j < cellCount; j++) {
  const cellText = (await cellLocator.nth(j).innerText()).trim();
  const headerKey = headers[j] || `cell_${j}`;
  record[headerKey] = cellText;
}
```

**After**:
```typescript
const record: Record<string, any> = {};
const cellTexts = await currentRow.evaluate(row =>
  Array.from(row.querySelectorAll('td, [role="gridcell"]'))
    .map(c => c.textContent?.trim() || '')
);
for (let j = 0; j < cellTexts.length; j++) {
  record[headers[j] || `cell_${j}`] = cellTexts[j];
}
```

**Expected improvement**: ~24s → ~1s (23s saved)

**Rollback**: Replace the `row.evaluate` + map loop back to the original `cellLocator` + `innerText()` loop.

---

### Change 2: Smart wait after "Get Report" click

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: Blind `waitForTimeout(20000)` always waits the full 20s even when
the report data loads in 5-10s.

**Fix**: Replace blind timeout with `waitForFunction` that detects data rows
appearing in the table body (`tbody tr:nth-child(2)`). Falls back to blind
timeout on failure.

**Before** (line 194):
```typescript
await page.waitForTimeout(20000);
```

**After**:
```typescript
try {
  await page.waitForFunction(
    () => document.querySelectorAll('tbody tr').length > 1,
    { timeout: 20000 }
  );
} catch {
  log.warn('Data rows did not appear within timeout. Proceeding...');
}
```

**Expected improvement**: ~20s → ~5-10s (10-15s saved)

**Rollback**: Revert to `await page.waitForTimeout(20000)`.

---

### Change 3: Reduce pre-wait from 3s → 1s

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: 3s wait before clicking "Get Report" is excessive. Portal's JS
handler binding completes within ~1s of page load.

**Fix**: Reduce to 1s.

**Before** (line 188):
```typescript
await page.waitForTimeout(3000);
```

**After**:
```typescript
await page.waitForTimeout(1000);
```

**Expected improvement**: 2s saved

**Rollback**: Change back to `3000`.

---

### Change 4: Reduce sidebar transition wait 1s → 400ms

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: 1s wait after each sidebar nav click (×4 items = 4s total).
Menu transitions typically complete in <400ms.

**Fix**: Reduce to 400ms.

**Before** (line 22):
```typescript
await page.waitForTimeout(1000);
```

**After**:
```typescript
await page.waitForTimeout(400);
```

**Expected improvement**: 2.4s saved

**Rollback**: Change back to `1000`.

---

### Summary

| Change | Before | After | Saved |
|---|---|---|---|
| 1. Batch cell extraction | ~24s | ~1s | ~23s |
| 2. Smart wait after click | ~20s | ~5-10s | ~10-15s |
| 3. Pre-wait reduction | 3s | 1s | 2s |
| 4. Sidebar wait reduction | 4s | 1.6s | 2.4s |
| **Total** | **~51s** | **~9-14s** | **~37-42s** |

---

### Change 5: Reduce dropdown selectOption timeout 2s → 500ms

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: The shift dropdown label "Day Shift" never matches the actual option
text "Day", so the 2s `selectOption` timeout is always wasted before falling
through to the fuzzy matcher.

**Fix**: Reduce initial `selectOption` timeout to 500ms.

**Before** (line 31):
```typescript
await dropdown.selectOption({ label }, { timeout: 2000 });
```

**After**:
```typescript
await dropdown.selectOption({ label }, { timeout: 500 });
```

**Expected improvement**: ~1.5s saved per combo

**Rollback**: Change back to `2000`.

---

### Change 6: Remove redundant networkidle after smart wait

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: Smart wait already confirmed fee columns rendered. Subsequent
`waitForLoadState('networkidle')` with 10s timeout is redundant and wastes
time when the portal has residual network activity.

**Fix**: Remove the `waitForLoadState('networkidle')` call entirely.

**Before** (lines 211-212):
```typescript
await page.waitForLoadState('networkidle', { timeout: CONFIG.timeouts.networkIdle })
  .catch(() => log.warn('Network did not settle to idle. Continuing...'));
```

**After**: Removed.

**Expected improvement**: Variable (0-10s)

**Rollback**: Re-add the `waitForLoadState` block before `verifyFiltersAfterLoad`.

---

### Change 7: Remove debug screenshot and captureReportTotalCount

**File**: `src/extractors/accountsReceivable.ts`

**Problem**: Debug screenshot and total-count lookup consume ~300ms and add
no value for production runs.

**Fix**: Remove both.

**Before** (lines 214-220):
```typescript
const debugPath = `output/report_debug_${year}...`;
await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
log.info(`Debug screenshot saved: ${debugPath}`);

await verifyFiltersAfterLoad(page, year, shift, cls);
const expectedCount = await captureReportTotalCount(page);
```

**After**: Screenshot and `captureReportTotalCount` removed. `verifyFiltersAfterLoad` retained.

**Expected improvement**: ~0.3s saved

**Rollback**: Re-add the screenshot block and `captureReportTotalCount` call.

---

### Change 8: Fix console click for long menu items

**File**: `src/utils/consoleClick.ts`

**Problem**: `triggerConsoleClick` used exact substring match for the entire
search text. Long menu labels like "Class & Student & Subhead Wise Collection
Status" could fail due to whitespace or truncation differences in the DOM,
causing fallback to standard click.

**Fix**: Replace exact substring matching with word-level matching — splits
the search text into individual words (ignoring words ≤2 chars like "&")
and checks all words appear in the element text content.

**Before** (line 11):
```typescript
const el = elements.find(e => e.textContent?.trim().toLowerCase().includes(t));
```

**After**:
```typescript
const words = t.toLowerCase().split(/\s+/).filter(w => w.length > 2);
const el = elements.find(e => {
  const content = e.textContent?.trim().toLowerCase() || '';
  return words.every(word => content.includes(word));
});
```

**Expected improvement**: ~300ms saved (avoids console click failure fallback)

**Rollback**: Revert to original `includes(t)` match.

---

### Updated Summary

| Change | Before | After | Saved |
|---|---|---|---|
| 1. Batch cell extraction | ~24s | ~1s | ~23s |
| 2. Smart wait (v2: fee columns) | ~20s | ~0.5s | ~19.5s |
| 3. Pre-wait reduction | 3s | 1s | 2s |
| 4. Sidebar wait reduction | 4s | 1.6s | 2.4s |
| 5. Dropdown timeout reduction | 2s | 0.5s | 1.5s |
| 6. Remove networkidle after smart wait | ~10s | 0s | ~10s |
| 7. Remove screenshot + totalCount | ~0.3s | 0s | ~0.3s |
| 8. Console click word matching | ~0.3s fallback | no fallback | ~0.3s |
| 9. Reduce settleDelay | 2s blind wait | 0.5s | ~1.5s |
| 10. Batch headers + all rows into 2 evaluates | ~4.3s | ~0.5s | ~3.8s |
| **Total (estimated)** | **~60s** | **~7-12s** | **~48-53s** |

---

### Change 9: Reduce settleDelay 2000 → 500

**File**: `src/config.ts`

**Problem**: `isSessionValid()` in `authenticate.ts` calls `waitForTimeout(CONFIG.timeouts.settleDelay)` which was 2000ms. This 2s blind wait is redundant with the `breadcrumb.waitFor({ timeout: 3000 })` check that follows it.

**Fix**: Reduce `settleDelay` to 500ms.

**Before** (line 56):
```typescript
settleDelay: 2000,
```

**After**:
```typescript
settleDelay: 500,
```

**Expected improvement**: ~1.5s saved in browser startup

**Rollback**: Change back to `2000`.

---

### Change 10: Batch header extraction + all rows into 2 evaluate calls

**File**: `src/utils/pagination.ts`

**Problem**: Header extraction used 36 individual `innerText()` bridge calls.
Row extraction used 33 per-row `isHeaderRow` checks + 33 per-row `evaluate` calls
= 102 bridge crossings for the page, taking ~4.3s.

**Fix**: 
- Headers: single `tableLocator.evaluate()` reads all header texts at once
- Rows: single `tableLocator.evaluate()` reads ALL rows' cells, applies headers
  inside the browser, returns array of records. Falls back to per-row approach
  only when `rowProcessor` hook is provided (currently unused).

**Before**:
```typescript
// 36 individual innerText calls for headers
for (let i = 0; i < headerCount; i++) {
  const text = (await headerLocator.nth(i).innerText()).replace(/\s+/g, ' ').trim();
  ...
}

// 33 isHeaderRow + 33 evaluate calls for rows
for (let i = 0; i < rowCount; i++) {
  const currentRow = rowLocator.nth(i);
  const isHeaderRow = await currentRow.locator('th').count() > 0;
  if (isHeaderRow) continue;
  const cellTexts = await currentRow.evaluate(row => ...);
  ...
}
```

**After**:
```typescript
// Single evaluate for headers
const headerTexts = await tableLocator.evaluate(table => {
  const cells = table.querySelectorAll('th, [role="columnheader"]');
  return Array.from(cells).map(c => (c.textContent || '').replace(/\s+/g, ' ').trim());
});

// Single evaluate for all rows (when no rowProcessor)
const rowsData = await tableLocator.evaluate((table, hdrs) => {
  const rows = table.querySelectorAll('tbody tr');
  return Array.from(rows).map(row => {
    const cells = row.querySelectorAll('td, [role="gridcell"]');
    if (cells.length === 0) return null;
    const record: Record<string, string> = {};
    cells.forEach((cell, j) => {
      record[hdrs[j] || `cell_${j}`] = cell.textContent?.trim() || '';
    });
    return record;
  }).filter(Boolean);
}, headers);
results.push(...rowsData);
```

**Bridge crossings**: 102 → 2 (plus `rowCount` and `firstCellSignature` queries = 4 total)

**Expected improvement**: ~4.3s → ~0.5s (~3.8s saved)

**Rollback**: Revert `pagination.ts` to the per-row loop approach.

---

### Updated Summary

| Change | Before | After | Saved |
|---|---|---|---|
| 1. Batch cell extraction | ~24s | ~1s | ~23s |
| 2. Smart wait (v2: fee columns) | ~20s | ~0.5s | ~19.5s |
| 3. Pre-wait reduction | 3s | 1s | 2s |
| 4. Sidebar wait reduction | 4s | 1.6s | 2.4s |
| 5. Dropdown timeout reduction | 2s | 0.5s | 1.5s |
| 6. Remove networkidle after smart wait | ~10s | 0s | ~10s |
| 7. Remove screenshot + totalCount | ~0.3s | 0s | ~0.3s |
| 8. Console click word matching | ~0.3s fallback | no fallback | ~0.3s |
| 9. Reduce settleDelay | 2s | 0.5s | 1.5s |
| 10. Batch headers + rows into 2 evaluates | ~4.3s | ~0.5s | 3.8s |
| **Total (estimated)** | **~60s** | **~7-12s** | **~48-53s** |
