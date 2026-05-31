/**
 * Represents a fee waiver or concession granted to a student.
 */
export interface WaiverRecord {
  studentId: string;
  studentName: string;
  className: string;
  waiverType: string;
  reason: string;
  amount: number;
  months: string;
  academicYear: string;
}
