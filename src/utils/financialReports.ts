import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger';
import type { LedgerResponse, FeeCollectionSummary, CashFlowStatement } from '../types/FinancialReport';

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
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
 * Generate Excel report with multiple sheets
 */
export async function generateExcelReport(
  data: LedgerResponse[],
  summary: CashFlowStatement,
  feeCollection: FeeCollectionSummary[]
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DUHA School Portal';
  workbook.created = new Date();

  // Sheet 1: Cash Flow Summary
  const cashFlowSheet = workbook.addWorksheet('Cash Flow');
  cashFlowSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Amount', key: 'amount', width: 20 }
  ];

  cashFlowSheet.addRow({ category: 'Period', amount: `${summary.period.from} to ${summary.period.to}` });
  cashFlowSheet.addRow({ category: 'Total Income', amount: summary.totalIncome });
  cashFlowSheet.addRow({ category: 'Total Expense', amount: summary.totalExpense });
  cashFlowSheet.addRow({ category: 'Net Cash Flow', amount: summary.netCashFlow });
  cashFlowSheet.addRow({ category: 'Opening Balance', amount: summary.openingBalance });
  cashFlowSheet.addRow({ category: 'Closing Balance', amount: summary.closingBalance });

  // Add income by type
  cashFlowSheet.addRow({});
  cashFlowSheet.addRow({ category: 'Income by Type', amount: '' });
  for (const [type, amount] of Object.entries(summary.incomeByType)) {
    cashFlowSheet.addRow({ category: `  ${type}`, amount });
  }

  // Add expense by type
  cashFlowSheet.addRow({});
  cashFlowSheet.addRow({ category: 'Expense by Type', amount: '' });
  for (const [type, amount] of Object.entries(summary.expenseByType)) {
    cashFlowSheet.addRow({ category: `  ${type}`, amount });
  }

  // Style Cash Flow sheet
  styleHeaderRow(cashFlowSheet.getRow(1));
  addGridlines(cashFlowSheet);

  // Sheet 2: Fee Collection
  const feeSheet = workbook.addWorksheet('Fee Collection');
  feeSheet.columns = [
    { header: 'Fee Type', key: 'feeType', width: 30 },
    { header: 'Total Collected', key: 'totalCollected', width: 20 },
    { header: 'Transaction Count', key: 'transactionCount', width: 20 }
  ];

  for (const fee of feeCollection) {
    feeSheet.addRow({
      feeType: fee.feeType,
      totalCollected: fee.totalCollected,
      transactionCount: fee.transactionCount
    });
  }

  // Style Fee Collection sheet
  styleHeaderRow(feeSheet.getRow(1));
  addGridlines(feeSheet);

  // Sheet 3: Ledger Details
  const ledgerSheet = workbook.addWorksheet('Ledger Details');
  ledgerSheet.columns = [
    { header: 'Ledger Name', key: 'name', width: 30 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Root', key: 'root', width: 15 },
    { header: 'Total Credit', key: 'credit', width: 20 },
    { header: 'Total Debit', key: 'debit', width: 20 },
    { header: 'Balance', key: 'balance', width: 20 }
  ];

  for (const ledger of data) {
    ledgerSheet.addRow({
      name: ledger.ledger_account.name,
      code: ledger.ledger_account.ledger_code,
      root: ledger.ledger_account.root,
      credit: ledger.total_credit,
      debit: ledger.total_debit,
      balance: ledger.total_amount
    });
  }

  // Style Ledger Details sheet
  styleHeaderRow(ledgerSheet.getRow(1));
  addGridlines(ledgerSheet);

  // Number formatting for amount columns
  [cashFlowSheet, feeSheet, ledgerSheet].forEach(sheet => {
    sheet.getColumn('amount')?.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });
    sheet.getColumn('totalCollected')?.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });
    sheet.getColumn('credit')?.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });
    sheet.getColumn('debit')?.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });
    sheet.getColumn('balance')?.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = '#,##0';
    });
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save workbook
  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = path.join(OUTPUT_DIR, `financial_report_${dateStr}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  log.info(`Financial Excel report saved to ${filePath}`);
  return filePath;
}
