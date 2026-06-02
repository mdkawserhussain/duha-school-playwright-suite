import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { MONTHS, parseMonthlyCell } from '../../utils/monthlyTotals';

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

function parseDueFromCell(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  const match = s.match(/due\s*:\s*([\d,]+)/i);
  if (match) return parseFloat(match[1].replace(/,/g, '')) || 0;
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
      if (parseDueFromCell(row['Total Due'] || row.totalDue || 0) <= 0) return false;
    }
  }
  if (filters.minAmount && filters.minAmount > 0) {
    if (parseDueFromCell(row['Total Due'] || row.totalDue || 0) < filters.minAmount) return false;
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
 * Sums monthly columns (Jan-Dec), Total Paid, and Total Due.
 */
function computeColumnSums(rows: Record<string, any>[], columns: string[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const col of columns) {
    if (MONTHS.includes(col)) {
      sums[col] = rows.reduce((sum, r) => sum + parseMonthlyCell(r[col]), 0);
    } else if (col === 'Total Paid' || col === 'Total Due') {
      sums[col] = rows.reduce((sum, r) => sum + parseDueFromCell(r[col]), 0);
    }
  }
  return sums;
}

// POST /api/export/xlsx — generate XLSX with selected columns and per-column summaries
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

    // Column definitions — only user-selected columns, no computed columns
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

    // Track grand totals across all classes
    const grandSums: Record<string, number> = {};
    for (const col of columns) grandSums[col] = 0;

    // Add rows per class with class summary after each group
    for (const [className, classRows] of classGroups) {
      // Add all student rows for this class
      for (const row of classRows) {
        const rowObj: Record<string, any> = {};
        for (const col of columns) {
          rowObj[col] = row[col] ?? '';
        }
        sheet.addRow(rowObj);
      }

      // Class summary row
      const classSums = computeColumnSums(classRows, columns);
      const summaryObj: Record<string, any> = {};
      summaryObj[columns[0]] = `${className} Total`;
      summaryObj[columns[1]] = `${classRows.length} students`;
      for (const col of columns.slice(2)) {
        summaryObj[col] = classSums[col] || 0;
      }
      const summaryRow = sheet.addRow(summaryObj);
      styleSummaryRow(summaryRow, true);

      // Accumulate grand totals
      for (const col of columns) {
        grandSums[col] += classSums[col] || 0;
      }

      // Spacer between classes
      sheet.addRow({});
    }

    // Overall grand summary
    const grandObj: Record<string, any> = {};
    grandObj[columns[0]] = 'GRAND TOTAL';
    grandObj[columns[1]] = `${data.length} students`;
    for (const col of columns.slice(2)) {
      grandObj[col] = grandSums[col] || 0;
    }
    const grandRow = sheet.addRow(grandObj);
    styleSummaryRow(grandRow, false);

    // Number formatting for sum columns
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
