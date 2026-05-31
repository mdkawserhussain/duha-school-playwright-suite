/**
 * Represents a single payment installment for a student.
 */
export interface PaymentInstallment {
  studentId: string;
  studentName: string;
  className: string;
  installmentName: string;
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
  status: 'paid' | 'unpaid' | 'partial' | 'waived';
  academicYear: string;
}
