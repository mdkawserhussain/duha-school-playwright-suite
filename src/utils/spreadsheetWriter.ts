import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { CONFIG } from '../config';
import { log } from './logger';
import { parseNumeric } from './duesFilter';

const EXCLUDED_COLUMNS = [
  'logo, id card & name plate fee',
  'parent/guardian name',
  'contact number',
  'notes',
  'user id',
];

const IDENTITY_PATTERNS = [
  'sl', 'name', 'id', 'roll', 'contact',
  'total due', 'year', 'shift', 'class',
];

const DISPLAY_NAMES: Record<string, string> = {
  _year: 'Year',
  _shift: 'Shift',
  _class: 'Class',
};

function isExcludedColumn(key: string): boolean {
  const lower = key.toLowerCase().trim();
  return EXCLUDED_COLUMNS.some((ex) => lower === ex || lower.startsWith(ex) || ex.startsWith(lower));
}

/**
 * Determines whether a column key should be included in the spreadsheet.
 *
 * Rules:
 * 1. Always-excluded columns are removed first.
 * 2. If CONFIG.report.columns is EMPTY → include ALL remaining columns (pass-through mode).
 * 3. If CONFIG.report.columns has entries → only include columns whose name contains
 *    ANY of the specified substrings (case-insensitive partial match).
 * 4. "Identity" columns (SL, student name, student ID, roll, contact) are ALWAYS
 *    included regardless of the filter so the report is always useful.
 */
function shouldIncludeColumn(key: string, filterTerms: string[]): boolean {
  const lower = key.toLowerCase();

  if (isExcludedColumn(key)) return false;

  // Identity columns always pass through
  if (IDENTITY_PATTERNS.some((p) => lower.includes(p))) return true;

  // No filter configured → include everything
  if (filterTerms.length === 0) return true;

  // Partial, case-insensitive match against any configured term
  return filterTerms.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Generates an Excel spreadsheet containing selected student dues records.
 * Columns are driven by REPORT_COLUMNS env var (comma-separated substrings).
 * If REPORT_COLUMNS is empty, all original table columns are included.
 * Some columns are always excluded (see EXCLUDED_COLUMNS).
 */
export async function writeXlsxOutput(
  data: Record<string, any>[],
  filterInfo: { years: string[]; shifts: string[]; classes: string[]; failedCombos?: Array<{ year: string; shift: string; cls: string; error: string }> }
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Outstanding Dues');

  const filterTerms = CONFIG.report.columns;

  if (filterTerms.length > 0) {
    log.info(`Column filter active — including columns matching: [${filterTerms.join(', ')}] (plus identity columns)`);
  } else {
    log.info('No column filter set (REPORT_COLUMNS is empty) — all portal columns will be included.');
  }

  // ── 1. Discover the due amount key for sorting & summary ─────────────────
  let dueColKey = '';
  if (data.length > 0) {
    dueColKey = Object.keys(data[0]).find(
      (k) =>
        k.toLowerCase().includes('due') ||
        k.toLowerCase().includes('balance') ||
        k.toLowerCase().includes('remaining')
    ) || '';
  }

  // ── 2. Build the ordered list of keys to include ─────────────────────────
  const allKeys = new Set<string>();
  for (const record of data) {
    Object.keys(record).forEach((k) => allKeys.add(k));
  }

  // Strip internal metadata; enriched keys will be appended explicitly
  allKeys.delete('profileHref');
  allKeys.delete('parentName');
  allKeys.delete('contactNumber');
  allKeys.delete('notes');

  const selectedKeys = Array.from(allKeys).filter((k) =>
    shouldIncludeColumn(k, filterTerms)
  );

  if (selectedKeys.length === 0 && data.length > 0) {
    log.warn('Column filter matched no portal columns. Falling back to all columns.');
    selectedKeys.push(...Array.from(allKeys));
  }

  // Move SL column to left-most position
  const slIndex = selectedKeys.findIndex((k) => k.toLowerCase() === 'sl');
  if (slIndex > 0) {
    const [slKey] = selectedKeys.splice(slIndex, 1);
    selectedKeys.unshift(slKey);
  }

  // ── 3. Build ExcelJS column definitions ──────────────────────────────────
  const colDefs: Partial<ExcelJS.Column>[] = [
    ...selectedKeys.map((key) => ({
      header: DISPLAY_NAMES[key] ?? key,
      key,
      width: Math.max(15, (DISPLAY_NAMES[key] ?? key).length + 4),
    })),
  ];

  sheet.columns = colDefs as ExcelJS.Column[];

  // ── 4. Map records, compute due amount for sorting ────────────────────────
  const rows = data.map((record) => {
    const rowObj: Record<string, any> = {};

    // Only copy selected keys
    for (const key of selectedKeys) {
      rowObj[key] = record[key] ?? '';
    }

    const dueAmount = dueColKey ? parseNumeric(record[dueColKey]) : 0;
    const cls = (record._class || '').toLowerCase();
    const shift = (record._shift || '').toLowerCase();
    return { rowObj, dueAmount, cls, shift };
  });

  // ── 5. Sort by class (custom order), then shift, then descending due amount ──
  const CLASS_SORT_ORDER = [
    'pre play', 'play', 'nursery', 'kg', 'reception',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'year one', 'year two', 'year three',
    'nursery (bc)', 'play (bc)',
  ];
  const classIdx = (cls: string) => {
    const i = CLASS_SORT_ORDER.indexOf(cls);
    return i === -1 ? 999 : i;
  };
  rows.sort((a, b) => {
    const ci = classIdx(a.cls) - classIdx(b.cls);
    if (ci !== 0) return ci;
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return b.dueAmount - a.dueAmount;
  });

  for (const item of rows) {
    sheet.addRow(item.rowObj);
  }

  // ── 6. INCOMPLETE banner (if any combos failed) ──────────────────────
  const failedCombos = filterInfo.failedCombos ?? [];
  if (failedCombos.length > 0) {
    const bannerRow = sheet.addRow({
      [selectedKeys[0]]: `⚠ INCOMPLETE — ${failedCombos.length} combo(s) failed. See run_manifest.json for details.`,
    });
    bannerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    bannerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    sheet.addRow({}); // spacer after banner
  }

  // ── 7. Summary row ────────────────────────────────────────────────────────
  const totalDuesSum = rows.reduce((sum, r) => sum + r.dueAmount, 0);
  const totalCount   = rows.length;

  sheet.addRow({}); // spacer

  const summaryObj: Record<string, any> = {};
  if (selectedKeys[0]) summaryObj[selectedKeys[0]] = 'TOTAL';
  if (selectedKeys[1]) summaryObj[selectedKeys[1]] = `Count: ${totalCount} students`;
  if (dueColKey && selectedKeys.includes(dueColKey)) {
    summaryObj[dueColKey] = totalDuesSum;
  }

  const summaryRow = sheet.addRow(summaryObj);
  summaryRow.font = { bold: true };

  // ── 7. Number formatting on due column ────────────────────────────────────
  if (dueColKey && selectedKeys.includes(dueColKey)) {
    summaryRow.getCell(dueColKey).numFmt = '#,##0.00';
    sheet.getColumn(dueColKey).eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0.00';
    });
  }

  // ── 8. Header styling ─────────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F497D' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // ── 9. Gridlines ──────────────────────────────────────────────────────────
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left:   { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right:  { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
  });

  // ── 10. Save ──────────────────────────────────────────────────────────────
  const outputDir = CONFIG.directories.output;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const { years, shifts, classes } = filterInfo;
  const dateStr = new Date().toISOString().split('T')[0];

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const allSingle = years.length === 1 && shifts.length === 1 && classes.length === 1;
  let filename: string;

  if (allSingle) {
    filename = `dues_report_class_${sanitize(classes[0])}_${sanitize(shifts[0])}_${sanitize(years[0])}_${dateStr}.xlsx`;
  } else {
    const classPart  = classes.join('+');
    const shiftPart  = shifts.join('+');
    const yearPart   = years.join('+');
    filename = `dues_report_class_${classPart}_${shiftPart}_${yearPart}_${dateStr}.xlsx`;
  }

  log.info(`Filters applied: Classes=[${classes.join(', ')}] Shifts=[${shifts.join(', ')}] Years=[${years.join(', ')}]`);

  const filePath = path.join(outputDir, filename);

  await workbook.xlsx.writeFile(filePath);
  log.info(`Excel report saved successfully to ${filePath}`);
  return filePath;
}
