import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

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

/**
 * Check if a row has a "Due : X" pattern in any of the specified columns.
 * Unlike parseDueFromCell, this does NOT fall through to raw numeric parsing —
 * only actual "due : N" patterns count.  This prevents false positives from
 * identity columns like User ID (which are pure numbers > 0).
 */
function hasDueInColumns(row: Record<string, any>, columns: string[]): boolean {
  for (const col of columns) {
    const s = String(row[col] ?? '');
    if (/due\s*:\s*[\d,]+/i.test(s)) return true;
  }
  return false;
}

function passesRowFilters(row: Record<string, any>, filters: RowFilters, selectedColumns?: string[]): boolean {
  if (filters.dueOnly) {
    // When specific columns are selected, check only those columns for dues.
    // Otherwise fall back to Total Due.
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

// POST /api/export/xlsx — generate XLSX with selected columns and row filters
// Falls back to PORTAL_COLUMNS from .env when client sends no columns
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

    // Add headers
    sheet.columns = columns.map(col => ({ header: col, key: col, width: 18 }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Add data rows
    for (const row of data) {
      const filtered: Record<string, any> = {};
      columns.forEach(col => { filtered[col] = row[col] ?? ''; });
      sheet.addRow(filtered);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=dues_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
