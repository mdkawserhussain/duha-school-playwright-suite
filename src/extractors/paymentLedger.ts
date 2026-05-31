/**
 * Payment Ledger Extractor — fetches per-student payment installment histories.
 *
 * For each student identified as having dues in the accounts receivable extraction,
 * makes a direct API call to the portal's payment summary endpoint and flattens
 * the response into individual installment records.
 *
 * API endpoint: POST /site/fee/student-payment-report/get-site-single-student-payment-summary
 */

import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { log } from '../utils/logger';
import { writeJsonOutput } from '../utils/fileWriter';
import type { PaymentInstallment } from '../types/PaymentInstallment';

interface PaymentSummaryResponse {
  student_name?: string;
  student_id?: string;
  class_name?: string;
  installments?: Array<{
    head_name?: string;
    amount?: number;
    due_date?: string;
    paid_date?: string;
    status?: string;
    paid_amount?: number;
  }>;
  // Alternative response format (nested)
  data?: {
    student_name?: string;
    student_id?: string;
    class_name?: string;
    installment_list?: Array<{
      fee_head?: string;
      total_amount?: number;
      due_date?: string;
      paid_date?: string;
      payment_status?: string;
      paid_amount?: number;
    }>;
  };
}

/**
 * Extracts payment installment data for a single student.
 */
async function extractStudentPayments(
  page: Page,
  studentUserName: string,
  yearId: string,
): Promise<PaymentInstallment[]> {
  const xsrfToken = await page.evaluate(() => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });

  const responseBody: PaymentSummaryResponse = await page.evaluate(async (args) => {
    const resp = await fetch(args.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': args.xsrfToken,
      },
      body: JSON.stringify({
        user_name: args.studentUserName,
        academic_year_id: Number(args.yearId),
        active_status: 1,
      }),
    });
    return resp.json();
  }, {
    url: `${CONFIG.baseUrl}/site/fee/student-payment-report/get-site-single-student-payment-summary`,
    studentUserName,
    yearId,
    xsrfToken,
  });

  // Flatten response — handle both response formats
  const installments: PaymentInstallment[] = [];
  const studentName = responseBody.student_name || responseBody.data?.student_name || 'Unknown';
  const studentId = responseBody.student_id || responseBody.data?.student_id || studentUserName;
  const className = responseBody.class_name || responseBody.data?.class_name || '';

  const rawInstallments = responseBody.installments || responseBody.data?.installment_list || [];

  for (const inst of rawInstallments) {
    const raw = inst as Record<string, any>;
    const headName = raw.head_name || raw.fee_head || '';
    const amount = raw.amount || raw.total_amount || 0;
    const paidAmount = raw.paid_amount || 0;
    const dueDate = raw.due_date || null;
    const paidDate = raw.paid_date || null;
    const rawStatus = (raw.status || raw.payment_status || '').toLowerCase();

    let status: PaymentInstallment['status'] = 'unpaid';
    if (rawStatus === 'paid' || paidAmount >= amount) {
      status = 'paid';
    } else if (rawStatus === 'partial' || (paidAmount > 0 && paidAmount < amount)) {
      status = 'partial';
    } else if (rawStatus === 'waived') {
      status = 'waived';
    }

    installments.push({
      studentId,
      studentName,
      className,
      installmentName: headName,
      amount,
      dueDate,
      paidDate,
      status,
      academicYear: String(CONFIG.filters.years[0] || ''),
    });
  }

  return installments;
}

/**
 * Main export — extracts payment ledger for all due students.
 *
 * @param page Playwright Page instance (already authenticated)
 * @param dueStudents Array of student records with user_name field (from accounts receivable)
 * @param yearId Academic year ID for API call
 */
export async function extractPaymentLedger(
  page: Page,
  dueStudents: Array<Record<string, any>>,
  yearId: string,
): Promise<PaymentInstallment[]> {
  log.step(`Extracting payment ledger for ${dueStudents.length} student(s)...`);

  const allInstallments: PaymentInstallment[] = [];
  const failed: string[] = [];

  for (let i = 0; i < dueStudents.length; i++) {
    const student = dueStudents[i];
    // Try common field names for student username/ID
    const studentUserName = student.user_name || student.student_id || student['Student ID'] || student.id || '';

    if (!studentUserName) {
      log.warn(`Skipping student at index ${i}: no user_name field found`);
      continue;
    }

    try {
      const installments = await extractStudentPayments(page, studentUserName, yearId);
      allInstallments.push(...installments);

      if ((i + 1) % 10 === 0 || i === dueStudents.length - 1) {
        log.info(`Payment ledger progress: ${i + 1}/${dueStudents.length} students processed (${allInstallments.length} installments so far)`);
      }
    } catch (err) {
      failed.push(studentUserName);
      log.warn(`Failed to extract payments for student "${studentUserName}": ${(err as Error).message}`);
    }
  }

  log.info(`Payment ledger complete: ${allInstallments.length} installment(s) extracted, ${failed.length} failure(s)`);

  if (allInstallments.length > 0) {
    writeJsonOutput('payment_ledger', allInstallments);
  }

  return allInstallments;
}
