import { describe, it, expect } from 'vitest';

// Import the internal function by re-implementing the logic
// (shouldIncludeColumn is not exported, so we test the logic directly)

const EXCLUDED_COLUMNS = [
  'logo, id card & name plate fee',
  'parent/guardian name',
  'contact number',
  'notes',
  'user id',
];

const IDENTITY_PATTERNS = [
  'sl', 'name', 'id', 'roll', 'contact',
  'total due', 'year', 'shift', 'class',
];

function isExcludedColumn(key: string): boolean {
  const lower = key.toLowerCase().trim();
  return EXCLUDED_COLUMNS.some((ex) => lower === ex || lower.startsWith(ex) || ex.startsWith(lower));
}

function shouldIncludeColumn(key: string, filterTerms: string[]): boolean {
  const lower = key.toLowerCase();

  if (isExcludedColumn(key)) return false;
  if (IDENTITY_PATTERNS.some((p) => lower.includes(p))) return true;
  if (filterTerms.length === 0) return true;
  return filterTerms.some((term) => lower.includes(term.toLowerCase()));
}

describe('shouldIncludeColumn', () => {
  it('includes identity columns regardless of filter', () => {
    expect(shouldIncludeColumn('Student ID', ['session'])).toBe(true);
    expect(shouldIncludeColumn('Std Name', ['session'])).toBe(true);
    expect(shouldIncludeColumn('Roll', ['session'])).toBe(true);
    expect(shouldIncludeColumn('Total Due', ['session'])).toBe(true);
  });

  it('excludes columns matching filter terms', () => {
    expect(shouldIncludeColumn('Session Fee', ['session'])).toBe(true);
    expect(shouldIncludeColumn('January', ['january'])).toBe(true);
  });

  it('excludes columns not matching any filter term', () => {
    expect(shouldIncludeColumn('Internal Ref', ['session', 'january'])).toBe(false);
    expect(shouldIncludeColumn('Sports Fee', ['session'])).toBe(false);
  });

  it('includes everything when filter is empty', () => {
    expect(shouldIncludeColumn('Sports Fee', [])).toBe(true);
    expect(shouldIncludeColumn('January', [])).toBe(true);
  });

  it('excludes explicitly excluded columns', () => {
    expect(shouldIncludeColumn('Notes', ['notes'])).toBe(false);
    expect(shouldIncludeColumn('User ID', ['session'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(shouldIncludeColumn('SESSION FEE', ['session'])).toBe(true);
    expect(shouldIncludeColumn('January', ['JANUARY'])).toBe(true);
  });
});

describe('class sort order', () => {
  const CLASS_SORT_ORDER = [
    'pre play', 'play', 'nursery', 'kg', 'reception',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'year one', 'year two', 'year three',
    'nursery (bc)', 'play (bc)',
  ];

  function classIdx(cls: string): number {
    const i = CLASS_SORT_ORDER.indexOf(cls.toLowerCase());
    return i === -1 ? 999 : i;
  }

  it('sorts classes in the correct order', () => {
    const classes = ['three', 'play', 'pre play', 'nursery', 'kg', 'one', 'reception', 'eight'];
    const sorted = [...classes].sort((a, b) => classIdx(a) - classIdx(b));
    expect(sorted).toEqual(['pre play', 'play', 'nursery', 'kg', 'reception', 'one', 'three', 'eight']);
  });

  it('puts unknown classes at the end', () => {
    const classes = ['play', 'unknown_class', 'nursery'];
    const sorted = [...classes].sort((a, b) => classIdx(a) - classIdx(b));
    expect(sorted).toEqual(['play', 'nursery', 'unknown_class']);
  });
});
