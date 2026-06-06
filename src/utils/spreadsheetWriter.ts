import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { CONFIG } from '../config';
import { log } from './logger';
import { parseNumeric } from './duesFilter';
import { MONTHS, parsePaidFromCell, parseDueFromCell } from './monthlyTotals';

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
  if (IDENTITY_PATTERNS.some((p) => lower.includes(p))) return true;
  if (filterTerms.length === 0) return true;
  return filterTerms.some((term) => lower.includes(term.toLowerCase()));
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
}

function stylePaidRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FF1B5E20' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
}

function styleDueRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFB71C1C' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
}

function styleGrandTotalRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
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
 * Generates an Excel spreadsheet with Paid/Due summary rows per class.
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
      (k) => k.toLowerCase().includes('due') || k.toLowerCase().includes('balance') || k.toLowerCase().includes('remaining')
    ) || '';
  }

  // ── 2. Build the ordered list of keys to include ─────────────────────────
  const allKeys = new Set<string>();
  for (const record of data) {
    Object.keys(record).forEach((k) => allKeys.add(k));
  }

  allKeys.delete('profileHref');
  allKeys.delete('parentName');
  allKeys.delete('contactNumber');
  allKeys.delete('notes');

  const selectedKeys = Array.from(allKeys).filter((k) => shouldIncludeColumn(k, filterTerms));

  if (selectedKeys.length === 0 && data.length > 0) {
    log.warn('Column filter matched no portal columns. Falling back to all columns.');
    selectedKeys.push(...Array.from(allKeys));
  }

  const slIndex = selectedKeys.findIndex((k) => k.toLowerCase() === 'sl');
  if (slIndex > 0) {
    const [slKey] = selectedKeys.splice(slIndex, 1);
    selectedKeys.unshift(slKey);
  }

  // ── 3. Build ExcelJS column definitions ──────────────────────────────────
  sheet.columns = selectedKeys.map((key) => ({
    header: DISPLAY_NAMES[key] ?? key,
    key,
    width: Math.max(15, (DISPLAY_NAMES[key] ?? key).length + 4),
  }));

  // ── 4. Map records and sort ───────────────────────────────────────────────
  const rows = data.map((record) => {
    const rowObj: Record<string, any> = {};
    for (const key of selectedKeys) rowObj[key] = record[key] ?? '';
    const dueAmount = dueColKey ? parseNumeric(record[dueColKey]) : 0;
    const cls = (record._class || '').toLowerCase();
    const shift = (record._shift || '').toLowerCase();
    return { rowObj, dueAmount, cls, shift };
  });

  const CLASS_SORT_ORDER = [
    'pre play', 'play', 'nursery', 'kg', 'reception',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'year one', 'year two', 'year three', 'nursery (bc)', 'play (bc)',
  ];
  const classIdx = (cls: string) => { const i = CLASS_SORT_ORDER.indexOf(cls); return i === -1 ? 999 : i; };
  rows.sort((a, b) => {
    const ci = classIdx(a.cls) - classIdx(b.cls);
    if (ci !== 0) return ci;
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return b.dueAmount - a.dueAmount;
  });

  // ── 5. Group by class ─────────────────────────────────────────────────────
  const classGroups = new Map<string, typeof rows>();
  for (const item of rows) {
    const cls = item.rowObj._class || item.rowObj.Class || 'Unknown';
    if (!classGroups.has(cls)) classGroups.set(cls, []);
    classGroups.get(cls)!.push(item);
  }

  const grandPaid: Record<string, number> = {};
  const grandDue: Record<string, number> = {};
  for (const key of selectedKeys) { grandPaid[key] = 0; grandDue[key] = 0; }

  // ── 6. Add rows + Paid/Due summary per class ─────────────────────────────
  for (const [className, classItems] of classGroups) {
    for (const item of classItems) {
      sheet.addRow(item.rowObj);
    }

    // Compute Paid and Due sums
    const classPaid: Record<string, number> = {};
    const classDue: Record<string, number> = {};
    for (const key of selectedKeys) { classPaid[key] = 0; classDue[key] = 0; }

    for (const item of classItems) {
      for (const key of selectedKeys) {
        if (MONTHS.includes(key)) {
          classPaid[key] += parsePaidFromCell(item.rowObj[key]);
          classDue[key] += parseDueFromCell(item.rowObj[key]);
        } else if (key === 'Total Paid' || key === 'Total Due') {
          const val = item.rowObj[key] ?? 0;
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
          classPaid[key] += num;
        }
      }
    }

    // Paid row
    const paidObj: Record<string, any> = {};
    paidObj[selectedKeys[0]] = `${className} Paid`;
    paidObj[selectedKeys[1]] = `${classItems.length} students`;
    for (const key of selectedKeys.slice(2)) {
      paidObj[key] = classPaid[key] || '';
    }
    const paidRow = sheet.addRow(paidObj);
    stylePaidRow(paidRow);

    // Due row
    const dueObj: Record<string, any> = {};
    dueObj[selectedKeys[0]] = `${className} Due`;
    dueObj[selectedKeys[1]] = `${classItems.length} students`;
    for (const key of selectedKeys.slice(2)) {
      dueObj[key] = classDue[key] || '';
    }
    const dueRow = sheet.addRow(dueObj);
    styleDueRow(dueRow);

    // Accumulate grand totals
    for (const key of selectedKeys) {
      grandPaid[key] += classPaid[key];
      grandDue[key] += classDue[key];
    }

    sheet.addRow({}); // spacer
  }

  // ── 7. Grand Total rows ──────────────────────────────────────────────────
  const grandPaidObj: Record<string, any> = {};
  grandPaidObj[selectedKeys[0]] = 'GRAND TOTAL Paid';
  grandPaidObj[selectedKeys[1]] = `${rows.length} students`;
  for (const key of selectedKeys.slice(2)) grandPaidObj[key] = grandPaid[key] || '';
  const grandPaidRow = sheet.addRow(grandPaidObj);
  styleGrandTotalRow(grandPaidRow);

  const grandDueObj: Record<string, any> = {};
  grandDueObj[selectedKeys[0]] = 'GRAND TOTAL Due';
  grandDueObj[selectedKeys[1]] = `${rows.length} students`;
  for (const key of selectedKeys.slice(2)) grandDueObj[key] = grandDue[key] || '';
  const grandDueRow = sheet.addRow(grandDueObj);
  styleGrandTotalRow(grandDueRow);

  // ── 8. Number formatting ──────────────────────────────────────────────────
  for (const key of selectedKeys) {
    if (MONTHS.includes(key) || key === 'Total Paid' || key === 'Total Due') {
      sheet.getColumn(key).eachCell((cell, rowNumber) => {
        if (rowNumber > 1) cell.numFmt = '#,##0';
      });
    }
  }

  // ── 9. Header + gridlines ─────────────────────────────────────────────────
  styleHeaderRow(sheet.getRow(1));
  addGridlines(sheet);

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
    filename = `dues_report_class_${classes.join('+')}_${shifts.join('+')}_${years.join('+')}_${dateStr}.xlsx`;
  }

  log.info(`Filters applied: Classes=[${classes.join(', ')}] Shifts=[${shifts.join(', ')}] Years=[${years.join(', ')}]`);
  const filePath = path.join(outputDir, filename);
  await workbook.xlsx.writeFile(filePath);
  log.info(`Excel report saved successfully to ${filePath}`);
  return filePath;
}

/**
 * Generates an Excel spreadsheet for attendance data.
 * Groups by employee with Present/Absent/Late/Leave summary rows.
 */
export async function writeAttendanceXlsx(
  data: Record<string, any>[],
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');

  const columns = [
    { header: 'Employee ID', key: 'Employee ID', width: 14 },
    { header: 'Name', key: 'Name', width: 22 },
    { header: 'Designation', key: 'Designation', width: 18 },
    { header: 'Contact', key: 'Contact', width: 16 },
    { header: 'Date', key: 'Date', width: 14 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'In Time', key: 'In Time', width: 12 },
    { header: 'Out Time', key: 'Out Time', width: 12 },
    { header: 'Hours', key: 'Hours', width: 10 },
    { header: 'Late', key: 'Late', width: 8 },
  ];
  sheet.columns = columns;

  // Group by employee
  const empGroups = new Map<string, Record<string, any>[]>();
  for (const row of data) {
    const id = String(row['Employee ID'] ?? '');
    if (!empGroups.has(id)) empGroups.set(id, []);
    empGroups.get(id)!.push(row);
  }

  // Sort employees by name
  const sorted = Array.from(empGroups.entries()).sort((a, b) => {
    const nameA = a[1][0]?.['Name'] ?? '';
    const nameB = b[1][0]?.['Name'] ?? '';
    return nameA.localeCompare(nameB);
  });

  let grandPresent = 0;
  let grandAbsent = 0;
  let grandLate = 0;
  let grandLeave = 0;
  let grandHours = 0;

  for (const [empId, records] of sorted) {
    // Sort records by date
    records.sort((a, b) => String(a['Date']).localeCompare(String(b['Date'])));

    // Add data rows
    for (const row of records) {
      sheet.addRow({
        'Employee ID': row['Employee ID'] ?? '',
        'Name': row['Name'] ?? '',
        'Designation': row['Designation'] ?? '',
        'Contact': row['Contact'] ?? '',
        'Date': row['Date'] ?? '',
        'Status': row['Status'] ?? '',
        'In Time': row['In Time'] ?? '',
        'Out Time': row['Out Time'] ?? '',
        'Hours': row['Hours'] ?? 0,
        'Late': row['Late'] ? 'Yes' : 'No',
      });
    }

    // Compute summary
    let present = 0, absent = 0, late = 0, leave = 0, hours = 0;
    for (const r of records) {
      const status = String(r['Status'] ?? '');
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Leave') leave++;
      hours += Number(r['Hours'] ?? 0);
      if (r['Late']) late++;
    }

    // Summary row
    const empName = records[0]?.['Name'] ?? empId;
    const summaryObj: Record<string, any> = {};
    summaryObj['Employee ID'] = `${empName} Summary`;
    summaryObj['Name'] = `${present}P ${absent}A ${late}L ${leave}Lv`;
    summaryObj['Designation'] = records[0]?.['Designation'] ?? '';
    summaryObj['Hours'] = hours;
    summaryObj['Late'] = late;
    const summaryRow = sheet.addRow(summaryObj);
    stylePaidRow(summaryRow);

    sheet.addRow({}); // spacer

    grandPresent += present;
    grandAbsent += absent;
    grandLate += late;
    grandLeave += leave;
    grandHours += hours;
  }

  // Grand total
  const totalObj: Record<string, any> = {};
  totalObj['Employee ID'] = 'GRAND TOTAL';
  totalObj['Name'] = `${grandPresent}P ${grandAbsent}A ${grandLate}L ${grandLeave}Lv`;
  totalObj['Hours'] = grandHours;
  totalObj['Late'] = grandLate;
  const totalRow = sheet.addRow(totalObj);
  styleGrandTotalRow(totalRow);

  // Style header
  styleHeaderRow(sheet.getRow(1));
  addGridlines(sheet);

  // Color-code status cells
  const statusCol = sheet.getColumn('Status');
  statusCol.eachCell((cell, rowNumber) => {
    if (rowNumber <= 1) return;
    const val = String(cell.value ?? '');
    if (val === 'Present') {
      cell.font = { color: { argb: 'FF1B5E20' } };
    } else if (val === 'Absent') {
      cell.font = { color: { argb: 'FFB71C1C' } };
    } else if (val === 'Leave') {
      cell.font = { color: { argb: 'FFE65100' } };
    } else if (val === 'Holiday') {
      cell.font = { color: { argb: 'FF1565C0' } };
    }
  });

  // Save
  const outputDir = CONFIG.directories.output;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `attendance_report_${dateStr}.xlsx`;
  const filePath = path.join(outputDir, filename);
  await workbook.xlsx.writeFile(filePath);
  log.info(`Attendance Excel report saved to ${filePath}`);
  return filePath;
}
