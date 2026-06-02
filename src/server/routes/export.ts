import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { MONTHS, computeMonthlyTotal, computeGrandTotal, groupByClass, computeGroupSummary } from '../../utils/monthlyTotals';

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

function formatNumber(val: number): string {
  return val.toLocaleString('en-IN');
}

// POST /api/export/xlsx — generate XLSX with selected columns, computed columns, and summaries
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

    // Build column list: selected columns + computed columns
    const hasMonthly = columns.some(c => MONTHS.includes(c));
    const allColumns = [...columns];
    if (hasMonthly) {
      allColumns.push('Total');
    }
    allColumns.push('Grand Total');

    // Column definitions
    sheet.columns = allColumns.map(col => ({
      header: col,
      key: col,
      width: Math.max(15, col.length + 4),
    }));

    // Style header
    styleHeaderRow(sheet.getRow(1));

    // Group data by class for summary rows
    const classGroups = groupByClass(data);

    // Track grand totals across all classes
    const grandSummary: Record<string, number> = {};
    for (const m of [...MONTHS, 'Total', 'Grand Total']) grandSummary[m] = 0;

    let rowIndex = 2; // Start after header

    for (const [className, classRows] of classGroups) {
      // Add class rows
      for (const row of classRows) {
        const rowObj: Record<string, any> = {};
        for (const col of columns) {
          rowObj[col] = row[col] ?? '';
        }
        if (hasMonthly) {
          rowObj['Total'] = computeMonthlyTotal(row);
        }
        rowObj['Grand Total'] = computeGrandTotal(row);
        sheet.addRow(rowObj);
        rowIndex++;
      }

      // Add class summary row
      const classSummary = computeGroupSummary(classRows);
      const summaryObj: Record<string, any> = {};
      summaryObj[allColumns[0]] = `${className} Total`;
      summaryObj[allColumns[1]] = `${classRows.length} students`;
      for (const m of MONTHS) {
        if (columns.includes(m)) {
          summaryObj[m] = classSummary[m] || 0;
        }
      }
      if (hasMonthly) summaryObj['Total'] = classSummary['Total'] || 0;
      summaryObj['Grand Total'] = classSummary['Grand Total'] || 0;

      const summaryRow = sheet.addRow(summaryObj);
      styleSummaryRow(summaryRow, true);
      rowIndex++;

      // Accumulate grand totals
      for (const m of [...MONTHS, 'Total', 'Grand Total']) {
        grandSummary[m] += classSummary[m] || 0;
      }

      // Add spacer between classes
      sheet.addRow({});
      rowIndex++;
    }

    // Add overall grand summary
    const grandObj: Record<string, any> = {};
    grandObj[allColumns[0]] = 'GRAND TOTAL';
    grandObj[allColumns[1]] = `${data.length} students`;
    for (const m of MONTHS) {
      if (columns.includes(m)) {
        grandObj[m] = grandSummary[m] || 0;
      }
    }
    if (hasMonthly) grandObj['Total'] = grandSummary['Total'] || 0;
    grandObj['Grand Total'] = grandSummary['Grand Total'] || 0;

    const grandRow = sheet.addRow(grandObj);
    styleSummaryRow(grandRow, false);

    // Number formatting for computed columns
    for (const m of MONTHS) {
      if (columns.includes(m)) {
        sheet.getColumn(m).eachCell((cell, rowNumber) => {
          if (rowNumber > 1) cell.numFmt = '#,##0';
        });
      }
    }
    if (hasMonthly) {
      sheet.getColumn('Total').eachCell((cell, rowNumber) => {
        if (rowNumber > 1) cell.numFmt = '#,##0';
      });
    }
    sheet.getColumn('Grand Total').eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });

    addGridlines(sheet);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=dues_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
