/**
 * Represents a single student accounts receivable record.
 * Contains fixed metadata fields plus dynamic fee-subhead columns
 * (e.g., "Sports Fee", "Session Fee", "January", etc.).
 */
export interface DuesRecord {
  _year: string;
  _shift: string;
  _class: string;
  'SL': number;
  'Std Name': string;
  'User ID': string;
  'Roll': string | number;
  'Contact No': string;
  'Total Paid': string;
  'Total Due': string;
  /** Dynamic fee-subhead and monthly columns */
  [key: string]: string | number;
}
