// src/__tests__/financialExtractor.test.ts

import { describe, it, expect } from 'vitest';
import {
  deduplicateEntries,
  parseStudentInfo,
  categorizeByRoot,
  calculateFeeCollection,
  calculateCashFlow
} from '../extractors/financialExtractor';
import type { LedgerDataItem, LedgerResponse } from '../types/FinancialReport';

describe('financialExtractor', () => {
  describe('deduplicateEntries', () => {
    it('should remove duplicate entries by id', () => {
      const items: LedgerDataItem[] = [
        { id: 1, debit_amount: 100, credit_amount: 0, entry: 'dr', created_date: '2026-01-01', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any },
        { id: 1, debit_amount: 100, credit_amount: 0, entry: 'dr', created_date: '2026-01-01', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any },
        { id: 2, debit_amount: 200, credit_amount: 0, entry: 'dr', created_date: '2026-01-02', status: 'approved', site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 2, site_id: 1, updated_at: '', created_at: '', acc_voucher_details: {} as any, ledger: {} as any }
      ];

      const result = deduplicateEntries(items);
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual([1, 2]);
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateEntries([])).toHaveLength(0);
    });
  });

  describe('parseStudentInfo', () => {
    it('should parse student info from transaction note', () => {
      const note = 'Name: John Doe, Shift: Day, Class: 10A, Payment Slip No: 12345';
      const result = parseStudentInfo(note);
      
      expect(result).toEqual({
        name: 'John Doe',
        shift: 'Day',
        className: '10A',
        paymentSlipNo: '12345'
      });
    });

    it('should return null for invalid note', () => {
      expect(parseStudentInfo('Random text')).toBeNull();
    });

    it('should handle partial info', () => {
      const note = 'Name: Jane Smith';
      const result = parseStudentInfo(note);
      
      expect(result).toEqual({
        name: 'Jane Smith',
        shift: '',
        className: '',
        paymentSlipNo: ''
      });
    });
  });

  describe('categorizeByRoot', () => {
    it('should categorize ledgers by root type', () => {
      const responses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 1000,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 1000,
          total_amount: 1000,
          upto_date_for_opening_balance: ''
        },
        {
          ledger_account: { id: 2, name: 'Cash In Hand', ledger_code: '10101', root: 'Asset', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 1, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 0,
          total_debit: 500,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 500,
          total_amount: 500,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = categorizeByRoot(responses);
      expect(result.income).toHaveLength(1);
      expect(result.asset).toHaveLength(1);
      expect(result.expense).toHaveLength(0);
    });
  });

  describe('calculateFeeCollection', () => {
    it('should calculate fee collection summary', () => {
      const incomeResponses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [
            { id: 1, credit_amount: 1000, debit_amount: 0, entry: 'cr', created_date: '2026-01-01', status: 'approved', acc_voucher_details: { transaction_note: 'Name: John Doe', voucher_no: 'V001', transaction_date: '2026-01-01', voucher_type: 'receipt', transaction_for: 'fee', site_accounts_fiscal_year_id: 1, site_accounts_voucher_id: 1, site_id: 1, status: 'approved', created_at: '', updated_at: '' }, ledger: { id: 1, name: 'Tuition Fee', ledger_code: '30003' }, site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 1, site_id: 1, updated_at: '', created_at: '' },
            { id: 2, credit_amount: 1500, debit_amount: 0, entry: 'cr', created_date: '2026-01-02', status: 'approved', acc_voucher_details: { transaction_note: 'Name: Jane Smith', voucher_no: 'V002', transaction_date: '2026-01-02', voucher_type: 'receipt', transaction_for: 'fee', site_accounts_fiscal_year_id: 1, site_accounts_voucher_id: 1, site_id: 1, status: 'approved', created_at: '', updated_at: '' }, ledger: { id: 1, name: 'Tuition Fee', ledger_code: '30003' }, site_accounts_ledger_id: 1, site_accounts_voucher_detail_id: 2, site_id: 1, updated_at: '', created_at: '' }
          ],
          total_credit: 2500,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 2500,
          total_amount: 2500,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = calculateFeeCollection(incomeResponses);
      expect(result).toHaveLength(1);
      expect(result[0].feeType).toBe('Tuition Fee');
      expect(result[0].totalCollected).toBe(2500);
      expect(result[0].transactionCount).toBe(2);
    });
  });

  describe('calculateCashFlow', () => {
    it('should calculate cash flow statement', () => {
      const responses: LedgerResponse[] = [
        {
          ledger_account: { id: 1, name: 'Tuition Fee', ledger_code: '30003', root: 'Income', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 5000,
          total_debit: 0,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 5000,
          total_amount: 5000,
          upto_date_for_opening_balance: ''
        },
        {
          ledger_account: { id: 2, name: 'Salary Expense', ledger_code: '40008', root: 'Expense', is_system: 0, is_tax: 0, is_opening: 0, is_closing: 0, is_bank: 0, is_cash: 0, site_id: 1, created_at: '', updated_at: '' },
          data_list: [],
          total_credit: 0,
          total_debit: 3000,
          total_credit_for_opening_balance: 0,
          total_debit_for_opening_balance: 0,
          opening_balance: 0,
          sub_total_amount: 3000,
          total_amount: 3000,
          upto_date_for_opening_balance: ''
        }
      ];

      const result = calculateCashFlow(responses, '2026-01-01', '2026-01-31');
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpense).toBe(3000);
      expect(result.netCashFlow).toBe(2000);
    });
  });
});
