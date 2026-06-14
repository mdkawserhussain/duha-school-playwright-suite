export interface FinancialReportParams {
  from_date: string;
  to_date: string;
  status: string;
}

export interface LedgerDataItem {
  id: number;
  site_accounts_ledger_id: number;
  debit_amount: number;
  credit_amount: number;
  entry: "dr" | "cr";
  created_date: string;
  status: string;
  site_accounts_voucher_detail_id: number;
  site_id: number;
  updated_at: string;
  created_at: string;
  acc_voucher_details: {
    id: number;
    transaction_date: string;
    voucher_type: string;
    voucher_no: string;
    transaction_for: string;
    transaction_note: string;
    site_accounts_fiscal_year_id: number;
    site_accounts_voucher_id: number;
    site_id: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
  ledger: {
    id: number;
    name: string;
    ledger_code: string;
  };
}

export interface LedgerAccount {
  id: number;
  name: string;
  ledger_code: string;
  root: string;
  is_system: number;
  is_tax: number;
  is_opening: number;
  is_closing: number;
  is_bank: number;
  is_cash: number;
  site_id: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerResponse {
  data_list: LedgerDataItem[];
  ledger_account: LedgerAccount;
  total_credit: number;
  total_debit: number;
  total_credit_for_opening_balance: number;
  total_debit_for_opening_balance: number;
  opening_balance: number;
  sub_total_amount: number;
  total_amount: number;
  upto_date_for_opening_balance: string;
}

export interface StudentInfo {
  name: string;
  shift: string;
  className: string;
  paymentSlipNo: string;
}

export interface FeeCollectionSummary {
  feeType: string;
  totalCollected: number;
  transactionCount: number;
  dailyBreakdown: Record<string, number>;
}

export interface StudentPaymentDetail {
  studentName: string;
  shift: string;
  className: string;
  paymentSlipNo: string;
  totalPaid: number;
  payments: Array<{
    date: string;
    amount: number;
    feeType: string;
    voucherNo: string;
  }>;
}

export interface CashFlowStatement {
  period: { from: string; to: string };
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  incomeByType: Record<string, number>;
  expenseByType: Record<string, number>;
}

export interface BankReconciliation {
  bankAccount: {
    name: string;
    code: string;
    ledgerBalance: number;
    transactions: LedgerDataItem[];
  };
  cashInHand: {
    ledgerBalance: number;
    transactions: LedgerDataItem[];
  };
  discrepancies: string[];
}

export interface OutstandingDues {
  studentsWithDues: StudentPaymentDetail[];
  agingAnalysis: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
  };
  totalOutstanding: number;
  collectionRate: number;
}

export interface FinancialReport {
  generatedAt: string;
  period: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    outstandingDues: number;
  };
  feeCollection: FeeCollectionSummary[];
  studentPayments: StudentPaymentDetail[];
  cashFlow: CashFlowStatement;
  bankReconciliation: BankReconciliation;
  outstandingDues: OutstandingDues;
}
