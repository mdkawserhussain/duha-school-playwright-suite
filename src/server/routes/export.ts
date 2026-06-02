import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { MONTHS, parsePaidFromCell, parseDueFromCell } from '../../utils/monthlyTotals';

export const exportRouter = Router();

const outputDir = path.resolve(process.cwd(), 'output');

function findLatestFile(prefix: string): string | null {
  try {
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
    if (files.length === 0) return null;
    return path.join(outputDir, files.sort().pop()!);
  } catch {
    return null;
  }
}

function parseTotalDue(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

interface RowFilters {
  dueOnly?: boolean;
  minAmount?: number;
  classFilter?: string;
  shiftFilter?: string;
  yearFilter?: string;
}

function hasDueInColumns(row: Record<string, any>, columns: string[]): boolean {
  for (const col of columns) {
    const s = String(row[col] ?? '');
    if (/due\s*:\s*[\d,]+/i.test(s)) return true;
  }
  return false;
}

function passesRowFilters(row: Record<string, any>, filters: RowFilters, selectedColumns?: string[]): boolean {
  if (filters.dueOnly) {
    if (selectedColumns && selectedColumns.length > 0) {
      if (!hasDueInColumns(row, selectedColumns)) return false;
    } else {
      if (parseTotalDue(row['Total Due'] || row.totalDue || 0) <= 0) return false;
    }
  }
  if (filters.minAmount && filters.minAmount > 0) {
    if (parseTotalDue(row['Total Due'] || row.totalDue || 0) < filters.minAmount) return false;
  }
  if (filters.classFilter) {
    const rowClass = String(row._class || row.Class || '').toLowerCase();
    if (!rowClass.includes(filters.classFilter.toLowerCase())) return false;
  }
  if (filters.shiftFilter) {
    const rowShift = String(row._shift || row.Shift || '').toLowerCase();
    if (!rowShift.includes(filters.shiftFilter.toLowerCase())) return false;
  }
  if (filters.yearFilter) {
    const rowYear = String(row._year || row.Year || '').toLowerCase();
    if (!rowYear.includes(filters.yearFilter.toLowerCase())) return false;
  }
  return true;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
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

function parseValue(row: Record<string, any>, col: string): number {
  const val = row[col] ?? 0;
  if (typeof val === 'number') return val;
  const s = String(val);
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

// POST /api/export/xlsx — generate XLSX with selected columns and Paid/Due summary rows
exportRouter.post('/xlsx', async (req, res) => {
  try {
    let columns: string[] = req.body.columns;
    const rowFilters: RowFilters = req.body.rowFilters || {};

    // Fallback: read PORTAL_COLUMNS from .env
    if (!Array.isArray(columns) || columns.length === 0) {
      const envPath = path.join(process.cwd(), '.env');
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^PORTAL_COLUMNS\s*=\s*["']?(.+?)["']?\s*$/m);
        if (match) {
          columns = match[1].split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch {}
    }

    if (!columns || columns.length === 0) {
      res.status(400).json({ error: 'columns array required (send in body or set PORTAL_COLUMNS in .env)' });
      return;
    }

    const duesFile = findLatestFile('accounts_receivable_dues_enriched');
    if (!duesFile) {
      res.status(404).json({ error: 'No data file found' });
      return;
    }

    const allData: Record<string, any>[] = JSON.parse(fs.readFileSync(duesFile, 'utf-8'));
    const data = allData.filter(row => passesRowFilters(row, rowFilters, columns));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Dues Report');

    // Column definitions
    sheet.columns = columns.map(col => ({
      header: col,
      key: col,
      width: Math.max(15, col.length + 4),
    }));

    // Style header
    styleHeaderRow(sheet.getRow(1));

    // Group data by class
    const classGroups = new Map<string, Record<string, any>[]>();
    for (const row of data) {
      const cls = row._class || row.Class || 'Unknown';
      if (!classGroups.has(cls)) classGroups.set(cls, []);
      classGroups.get(cls)!.push(row);
    }

    // Track grand totals (Paid and Due separately)
    const grandPaid: Record<string, number> = {};
    const grandDue: Record<string, number> = {};
    for (const col of columns) { grandPaid[col] = 0; grandDue[col] = 0; }

    // Add rows per class with two summary rows (Paid + Due)
    for (const [className, classRows] of classGroups) {
      // Add all student rows
      for (const row of classRows) {
        const rowObj: Record<string, any> = {};
        for (const col of columns) rowObj[col] = row[col] ?? '';
        sheet.addRow(rowObj);
      }

      // Compute Paid and Due sums per column for this class
      const classPaid: Record<string, number> = {};
      const classDue: Record<string, number> = {};
      for (const col of columns) { classPaid[col] = 0; classDue[col] = 0; }

      for (const row of classRows) {
        for (const col of columns) {
          if (MONTHS.includes(col)) {
            classPaid[col] += parsePaidFromCell(row[col]);
            classDue[col] += parseDueFromCell(row[col]);
          } else if (col === 'Total Paid' || col === 'Total Due') {
            classPaid[col] += parseValue(row, col);
          }
        }
      }

      // Paid summary row
      const paidObj: Record<string, any> = {};
      paidObj[columns[0]] = `${className} Paid`;
      paidObj[columns[1]] = `${classRows.length} students`;
      for (const col of columns.slice(2)) {
        paidObj[col] = classPaid[col] || '';
      }
      const paidRow = sheet.addRow(paidObj);
      stylePaidRow(paidRow);

      // Due summary row
      const dueObj: Record<string, any> = {};
      dueObj[columns[0]] = `${className} Due`;
      dueObj[columns[1]] = `${classRows.length} students`;
      for (const col of columns.slice(2)) {
        dueObj[col] = classDue[col] || '';
      }
      const dueRow = sheet.addRow(dueObj);
      styleDueRow(dueRow);

      // Accumulate grand totals
      for (const col of columns) {
        grandPaid[col] += classPaid[col];
        grandDue[col] += classDue[col];
      }

      // Spacer between classes
      sheet.addRow({});
    }

    // Grand Total Paid row
    const grandPaidObj: Record<string, any> = {};
    grandPaidObj[columns[0]] = 'GRAND TOTAL Paid';
    grandPaidObj[columns[1]] = `${data.length} students`;
    for (const col of columns.slice(2)) {
      grandPaidObj[col] = grandPaid[col] || '';
    }
    const grandPaidRow = sheet.addRow(grandPaidObj);
    styleGrandTotalRow(grandPaidRow);

    // Grand Total Due row
    const grandDueObj: Record<string, any> = {};
    grandDueObj[columns[0]] = 'GRAND TOTAL Due';
    grandDueObj[columns[1]] = `${data.length} students`;
    for (const col of columns.slice(2)) {
      grandDueObj[col] = grandDue[col] || '';
    }
    const grandDueRow = sheet.addRow(grandDueObj);
    styleGrandTotalRow(grandDueRow);

    // Number formatting for numeric columns
    for (const col of columns) {
      if (MONTHS.includes(col) || col === 'Total Paid' || col === 'Total Due') {
        sheet.getColumn(col).eachCell((cell, rowNumber) => {
          if (rowNumber > 1) cell.numFmt = '#,##0';
        });
      }
    }

    addGridlines(sheet);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=dues_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
