import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { CONFIG } from '../config';
import { log } from './logger';
import { parseNumeric } from './duesFilter';
import { MONTHS, parseMonthlyCell } from './monthlyTotals';

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

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
}

function styleSummaryRow(row: ExcelJS.Row, isClassTotal: boolean) {
  row.font = { bold: true };
  if (isClassTotal) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  } else {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
}

function addGridlines(sheet: ExcelJS.Worksheet) {
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
}

/**
 * Compute per-column sums for a group of rows.
 */
function computeColumnSums(rows: Record<string, any>[], columns: string[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const col of columns) {
    if (MONTHS.includes(col)) {
      sums[col] = rows.reduce((sum, r) => sum + parseMonthlyCell(r[col]), 0);
    } else if (col === 'Total Paid' || col === 'Total Due') {
      const val = r[col] ?? 0;
      sums[col] = rows.reduce((sum, r) => {
        const v = r[col] ?? 0;
        if (typeof v === 'number') return sum + v;
        const s = String(v);
        const num = parseFloat(s.replace(/,/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
  }
  return sums;
}

/**
 * Generates an Excel spreadsheet containing selected student dues records.
 * Columns are driven by REPORT_COLUMNS env var.
 * Adds per-column summary rows after each class group and at the bottom.
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

  // ── 1. Discover the due amount key for sorting ─────────────────────────
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

  // Strip internal metadata
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

  // ── 3. Build ExcelJS column definitions (no computed columns) ─────────────
  const colDefs: Partial<ExcelJS.Column>[] = selectedKeys.map((key) => ({
    header: DISPLAY_NAMES[key] ?? key,
    key,
    width: Math.max(15, (DISPLAY_NAMES[key] ?? key).length + 4),
  }));

  sheet.columns = colDefs as ExcelJS.Column[];

  // ── 4. Map records, compute due amount for sorting ────────────────────────
  const rows = data.map((record) => {
    const rowObj: Record<string, any> = {};
    for (const key of selectedKeys) {
      rowObj[key] = record[key] ?? '';
    }
    const dueAmount = dueColKey ? parseNumeric(record[dueColKey]) : 0;
    const cls = (record._class || '').toLowerCase();
    const shift = (record._shift || '').toLowerCase();
    return { rowObj, dueAmount, cls, shift };
  });

  // ── 5. Sort by class, then shift, then descending due amount ──────────────
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

  // ── 6. Group by class and add rows + class summary rows ───────────────────
  const classGroups = new Map<string, typeof rows>();
  for (const item of rows) {
    const cls = item.rowObj._class || item.rowObj.Class || 'Unknown';
    if (!classGroups.has(cls)) classGroups.set(cls, []);
    classGroups.get(cls)!.push(item);
  }

  const grandSums: Record<string, number> = {};
  for (const key of selectedKeys) grandSums[key] = 0;

  for (const [className, classItems] of classGroups) {
    // Add all student rows for this class
    for (const item of classItems) {
      sheet.addRow(item.rowObj);
    }

    // Class summary row — sum of each column for this class
    const summaryObj: Record<string, any> = {};
    summaryObj[selectedKeys[0]] = `${className} Total`;
    summaryObj[selectedKeys[1]] = `${classItems.length} students`;
    for (const key of selectedKeys.slice(2)) {
      if (MONTHS.includes(key) || key === 'Total Paid' || key === 'Total Due') {
        summaryObj[key] = classItems.reduce((sum, item) => {
          const val = item.rowObj[key] ?? 0;
          if (typeof val === 'number') return sum + val;
          if (MONTHS.includes(key)) return sum + parseMonthlyCell(val);
          const s = String(val);
          const num = parseFloat(s.replace(/,/g, ''));
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
      } else {
        summaryObj[key] = '';
      }
    }
    const summaryRow = sheet.addRow(summaryObj);
    styleSummaryRow(summaryRow, true);

    // Accumulate grand totals
    for (const key of selectedKeys) {
      if (typeof summaryObj[key] === 'number') {
        grandSums[key] += summaryObj[key];
      }
    }

    // Spacer between classes
    sheet.addRow({});
  }

  // ── 7. Overall grand summary ──────────────────────────────────────────────
  const grandObj: Record<string, any> = {};
  grandObj[selectedKeys[0]] = 'GRAND TOTAL';
  grandObj[selectedKeys[1]] = `${rows.length} students`;
  for (const key of selectedKeys.slice(2)) {
    grandObj[key] = grandSums[key] || '';
  }
  const grandRow = sheet.addRow(grandObj);
  styleSummaryRow(grandRow, false);

  // ── 8. Number formatting ──────────────────────────────────────────────────
  for (const key of selectedKeys) {
    if (MONTHS.includes(key) || key === 'Total Paid' || key === 'Total Due') {
      sheet.getColumn(key).eachCell((cell, rowNumber) => {
        if (rowNumber > 1) cell.numFmt = '#,##0';
      });
    }
  }

  // ── 9. Header styling ────────────────────────────────────────────────────
  styleHeaderRow(sheet.getRow(1));

  // ── 10. Gridlines ──────────────────────────────────────────────────────────
  addGridlines(sheet);

  // ── 11. Save ──────────────────────────────────────────────────────────────
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
