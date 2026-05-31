import { describe, it, expect } from 'vitest';
import { parseNumeric, isJunkRow, filterDuesRows } from './duesFilter';

describe('parseNumeric', () => {
  it('parses numeric strings with commas', () => {
    expect(parseNumeric('1,234.56')).toBe(1234.56);
  });

  it('parses plain numbers', () => {
    expect(parseNumeric('33100')).toBe(33100);
  });

  it('returns 0 for empty string', () => {
    expect(parseNumeric('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parseNumeric(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseNumeric(undefined)).toBe(0);
  });

  it('returns the number itself if already numeric', () => {
    expect(parseNumeric(42)).toBe(42);
  });

  it('strips currency symbols', () => {
    expect(parseNumeric('BDT 1,500')).toBe(1500);
  });

  it('handles negative numbers', () => {
    expect(parseNumeric('-500')).toBe(-500);
  });
});

describe('isJunkRow', () => {
  it('returns true for "Grand Total" name', () => {
    expect(isJunkRow({ Name: 'Grand Total', 'User ID': '12345' })).toBe(true);
  });

  it('returns true for empty name', () => {
    expect(isJunkRow({ Name: '', 'User ID': '12345' })).toBe(true);
  });

  it('returns true for whitespace-only name', () => {
    expect(isJunkRow({ Name: '   ', 'User ID': '12345' })).toBe(true);
  });

  it('returns true for "Sub Total" name', () => {
    expect(isJunkRow({ Name: 'Sub Total', 'User ID': '12345' })).toBe(true);
  });

  it('returns true for empty row', () => {
    expect(isJunkRow({ Name: '', 'User ID': '' })).toBe(true);
  });

  it('returns false for valid student row', () => {
    expect(isJunkRow({ Name: 'Arif Hassan', 'User ID': '12345' })).toBe(false);
  });

  it('returns true for empty student ID', () => {
    expect(isJunkRow({ Name: 'Test', 'User ID': '' })).toBe(true);
  });
});

describe('filterDuesRows', () => {
  // Legacy mode: rows with due/balance/remaining columns
  const legacyRows: Record<string, string>[] = [
    { Name: 'Alice', 'User ID': '1', 'Total Due': '33,100', _year: '2026' },
    { Name: 'Bob', 'User ID': '2', 'Total Due': '0', _year: '2026' },
    { Name: 'Charlie', 'User ID': '3', 'Balance': '5,000', _year: '2026' },
    { Name: 'Diana', 'User ID': '4', 'Remaining': '2,500', _year: '2026' },
    { Name: 'Eve', 'User ID': '5', 'Sports Fee': 'Paid : 3,000', _year: '2026' },
  ];

  it('keeps rows with non-zero Total Due (legacy mode)', () => {
    const result = filterDuesRows(legacyRows);
    expect(result.length).toBe(3); // Alice (33100), Charlie (Balance), Diana (Remaining)
  });

  it('removes rows with zero Total Due', () => {
    const result = filterDuesRows(legacyRows);
    const names = result.map(r => r.Name);
    expect(names).not.toContain('Bob');
  });

  it('removes rows without due/balance/remaining columns', () => {
    const result = filterDuesRows(legacyRows);
    const names = result.map(r => r.Name);
    expect(names).not.toContain('Eve');
  });

  // Column-scoped mode
  const columnScopedRows: Record<string, string>[] = [
    { Name: 'Alice', 'User ID': '1', 'Total Due': '33,100', _year: '2026' },
    { Name: 'Bob', 'User ID': '2', 'January': 'Due : 5,000', _year: '2026' },
    { Name: 'Charlie', 'User ID': '3', 'January': 'Paid : 3,000', _year: '2026' },
    { Name: 'Diana', 'User ID': '4', 'Session Fee': 'Due : 2,000', _year: '2026' },
  ];

  it('filters by specific column when checkColumns provided', () => {
    const result = filterDuesRows(columnScopedRows, ['january']);
    const names = result.map(r => r.Name);
    expect(names).toContain('Bob'); // has Due : 5,000 in January
    expect(names).not.toContain('Diana'); // Diana has due in Session Fee, not January
  });

  it('filters by multiple columns when checkColumns has multiple entries', () => {
    const result = filterDuesRows(columnScopedRows, ['january', 'session']);
    const names = result.map(r => r.Name);
    expect(names).toContain('Bob'); // January due
    expect(names).toContain('Diana'); // Session Fee due
  });

  it('removes junk rows', () => {
    const rowsWithJunk = [
      ...legacyRows,
      { Name: 'Grand Total', 'User ID': '99', 'Total Due': '100,000' },
    ];
    const result = filterDuesRows(rowsWithJunk);
    const names = result.map(r => r.Name);
    expect(names).not.toContain('Grand Total');
  });
});
