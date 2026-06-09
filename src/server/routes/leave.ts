import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { log } from '../../utils/logger';
import {
  getLeaveRecords,
  getLeaveSummary,
  getMonthlyBreakdown,
  getLeaveStatus,
} from '../../utils/leaveHistoryDb';

export const leaveRouter = Router();

const outputDir = path.resolve(process.cwd(), 'output');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ─── GET /api/leave/status — connection info + record counts ────────────
leaveRouter.get('/status', (_req, res) => {
  try {
    const status = getLeaveStatus();
    const jsonPath = path.join(outputDir, 'employee_leaves.json');
    const jsonExists = fs.existsSync(jsonPath);
    const jsonTime = jsonExists ? fs.statSync(jsonPath).mtime.toISOString() : null;

    res.json({
      connected: true,
      ...status,
      jsonFile: jsonExists,
      jsonModified: jsonTime,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/leave/records — query with filters ────────────────────────
leaveRouter.get('/records', (req, res) => {
  try {
    const { staff, type, status, from, to, year } = req.query as Record<string, string>;
    const records = getLeaveRecords({
      staff: staff || undefined,
      type: type || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/leave/summary — per-staff balance ─────────────────────────
leaveRouter.get('/summary', (req, res) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const summary = getLeaveSummary(year);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/leave/monthly — month-wise breakdown ──────────────────────
leaveRouter.get('/monthly', (req, res) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const breakdown = getMonthlyBreakdown(year);
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/leave/download — generate Excel report ────────────────────
leaveRouter.get('/download', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const records = getLeaveRecords({ year });
    const summary = getLeaveSummary(year);
    const monthly = getMonthlyBreakdown(year);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'School Portal Suite';
    workbook.created = new Date();

    // ── Sheet 1: Leave Records ──
    const recordsSheet = workbook.addWorksheet('Leave Records');
    recordsSheet.columns = [
      { header: 'SL#', key: 'sl', width: 6 },
      { header: 'Staff Name', key: 'staffName', width: 22 },
      { header: 'Leave Type', key: 'leaveType', width: 18 },
      { header: 'Reason', key: 'reason', width: 28 },
      { header: 'From', key: 'fromDate', width: 14 },
      { header: 'To', key: 'toDate', width: 14 },
      { header: 'Days', key: 'days', width: 8 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Requested', key: 'requestDate', width: 14 },
      { header: 'Approved', key: 'approveDate', width: 14 },
    ];

    // Header styling
    recordsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    recordsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    records.forEach((r, i) => {
      const row = recordsSheet.addRow({
        sl: i + 1,
        staffName: r.staffName,
        leaveType: r.leaveType,
        reason: r.reason,
        fromDate: r.fromDate,
        toDate: r.toDate,
        days: r.days,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        requestDate: r.requestDate,
        approveDate: r.approveDate || '',
      });

      // Status cell color
      const statusCell = row.getCell('status');
      if (r.status === 'approved') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        statusCell.font = { color: { argb: 'FF155724' } };
      } else if (r.status === 'pending') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        statusCell.font = { color: { argb: 'FF856404' } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        statusCell.font = { color: { argb: 'FF721C24' } };
      }
    });

    // ── Sheet 2: Leave Summary ──
    const summarySheet = workbook.addWorksheet('Leave Summary');
    summarySheet.columns = [
      { header: 'Staff Name', key: 'staffName', width: 22 },
    ];

    // Collect all leave types across all staff
    const allTypes = new Set<string>();
    for (const s of summary) {
      for (const typeName of Object.keys(s.leaveTypes)) {
        allTypes.add(typeName);
      }
    }
    const typeNames = Array.from(allTypes);

    // Add type-specific columns: Allotted, Used, Remaining per type
    for (const t of typeNames) {
      summarySheet.getColumn(summarySheet.columns.length + 1).header = `${t} (Allotted)`;
      summarySheet.getColumn(summarySheet.columns.length).key = `${t}_allotted`;
      summarySheet.getColumn(summarySheet.columns.length).width = 14;

      summarySheet.getColumn(summarySheet.columns.length + 1).header = `${t} (Used)`;
      summarySheet.getColumn(summarySheet.columns.length).key = `${t}_used`;
      summarySheet.getColumn(summarySheet.columns.length).width = 10;

      summarySheet.getColumn(summarySheet.columns.length + 1).header = `${t} (Remaining)`;
      summarySheet.getColumn(summarySheet.columns.length).key = `${t}_remaining`;
      summarySheet.getColumn(summarySheet.columns.length).width = 14;
    }

    // Header styling
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    for (const s of summary) {
      const rowData: any = { staffName: s.staffName };
      for (const t of typeNames) {
        const lt = s.leaveTypes[t];
        rowData[`${t}_allotted`] = lt?.allotted ?? 0;
        rowData[`${t}_used`] = lt?.used ?? 0;
        rowData[`${t}_remaining`] = lt?.remaining ?? 0;
      }
      summarySheet.addRow(rowData);
    }

    // ── Sheet 3: Monthly Breakdown ──
    const monthlySheet = workbook.addWorksheet('Monthly Breakdown');
    monthlySheet.columns = [
      { header: 'Staff Name', key: 'staffName', width: 22 },
      ...MONTHS.map(m => ({ header: m.slice(0, 3), key: m, width: 8 })),
      { header: 'Total', key: 'yearTotal', width: 8 },
    ];

    // Header styling
    monthlySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    monthlySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    for (const m of monthly) {
      const rowData: any = { staffName: m.staffName, yearTotal: m.yearTotal };
      for (const monthName of MONTHS) {
        const monthData = m.months[monthName];
        if (monthData) {
          const total = Object.values(monthData).reduce((sum, d) => sum + d, 0);
          rowData[monthName] = total;
        } else {
          rowData[monthName] = 0;
        }
      }
      monthlySheet.addRow(rowData);
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leave_report_${year}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    log.error('Leave Excel generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});
