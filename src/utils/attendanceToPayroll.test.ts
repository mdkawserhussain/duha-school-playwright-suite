import { describe, it, expect } from 'vitest';
import {
  timeTo12h,
  timeToMins,
  groupByEmployee,
  computeBaseline,
  convertToPayrollInput,
  findStaffMatch,
  FlatAttendanceRecord,
} from './attendanceToPayroll';

// ─── timeTo12h ──────────────────────────────────────────────────────────────

describe('timeTo12h', () => {
  it('converts 24h morning times', () => {
    expect(timeTo12h('08:00')).toBe('08:00 AM');
    expect(timeTo12h('07:45')).toBe('07:45 AM');
    expect(timeTo12h('00:00')).toBe('12:00 AM');
  });

  it('converts 24h afternoon times', () => {
    expect(timeTo12h('14:30')).toBe('02:30 PM');
    expect(timeTo12h('12:00')).toBe('12:00 PM');
    expect(timeTo12h('23:59')).toBe('11:59 PM');
  });

  it('passes through 12h format unchanged', () => {
    expect(timeTo12h('08:00 AM')).toBe('08:00 AM');
    expect(timeTo12h('02:30 PM')).toBe('02:30 PM');
  });

  it('handles empty/null input', () => {
    expect(timeTo12h('')).toBe('');
    expect(timeTo12h(null as any)).toBe('');
  });
});

// ─── timeToMins ─────────────────────────────────────────────────────────────

describe('timeToMins', () => {
  it('converts 12h format', () => {
    expect(timeToMins('07:49 AM')).toBe(469);
    expect(timeToMins('08:00 AM')).toBe(480);
    expect(timeToMins('12:00 PM')).toBe(720);
    expect(timeToMins('01:00 PM')).toBe(780);
  });

  it('converts 24h format', () => {
    expect(timeToMins('07:49')).toBe(469);
    expect(timeToMins('08:00')).toBe(480);
    expect(timeToMins('14:30')).toBe(870);
  });

  it('returns 0 for empty input', () => {
    expect(timeToMins('')).toBe(0);
    expect(timeToMins(null as any)).toBe(0);
  });
});

// ─── groupByEmployee ────────────────────────────────────────────────────────

describe('groupByEmployee', () => {
  it('groups records by Employee ID', () => {
    const records: FlatAttendanceRecord[] = [
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-01', 'Status': 'Present', 'In Time': '08:00', 'Out Time': '16:00', 'Hours': 8, 'Late': false },
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-02', 'Status': 'Absent', 'In Time': null, 'Out Time': null, 'Hours': 0, 'Late': false },
      { 'Employee ID': '2', 'Name': 'Bob', 'Designation': 'Admin', 'Contact': '', 'Date': '2026-06-01', 'Status': 'Present', 'In Time': '07:30', 'Out Time': '16:00', 'Hours': 8, 'Late': false },
    ];

    const grouped = groupByEmployee(records);
    expect(grouped.size).toBe(2);
    expect(grouped.get('1')?.length).toBe(2);
    expect(grouped.get('2')?.length).toBe(1);
  });

  it('skips records with no ID', () => {
    const records: FlatAttendanceRecord[] = [
      { 'Employee ID': '', 'Name': '', 'Designation': '', 'Contact': '', 'Date': '2026-06-01', 'Status': 'Present', 'In Time': '08:00', 'Out Time': '16:00', 'Hours': 8, 'Late': false },
    ];

    const grouped = groupByEmployee(records);
    expect(grouped.size).toBe(0);
  });
});

// ─── computeBaseline ────────────────────────────────────────────────────────

describe('computeBaseline', () => {
  const makeRecord = (date: string, status: string, inTime: string | null = '08:00'): FlatAttendanceRecord => ({
    'Employee ID': '1',
    'Name': 'Test',
    'Designation': 'Teacher',
    'Contact': '',
    'Date': date,
    'Status': status,
    'In Time': inTime,
    'Out Time': '16:00',
    'Hours': 8,
    'Late': false,
  });

  it('counts present days', () => {
    const records = [
      makeRecord('2026-06-01', 'Present'),
      makeRecord('2026-06-02', 'Present'),
      makeRecord('2026-06-03', 'Present'),
    ];
    const baseline = computeBaseline(records, [], '07:49 AM');
    expect(baseline.pdays).toBe(3);
    expect(baseline.absent).toBe(0);
  });

  it('counts absent days', () => {
    const records = [
      makeRecord('2026-06-01', 'Present'),
      makeRecord('2026-06-02', 'Absent'),
      makeRecord('2026-06-03', 'Absent'),
    ];
    const baseline = computeBaseline(records, [], '07:49 AM');
    expect(baseline.pdays).toBe(1);
    expect(baseline.absent).toBe(2);
    expect(baseline.absentDates).toEqual([2, 3]);
  });

  it('counts leave days', () => {
    const records = [
      makeRecord('2026-06-01', 'Present'),
      makeRecord('2026-06-02', 'Leave'),
    ];
    const baseline = computeBaseline(records, [], '07:49 AM');
    expect(baseline.leave).toBe(1);
    expect(baseline.leaveDates).toEqual([2]);
  });

  it('detects late arrivals', () => {
    const records = [
      makeRecord('2026-06-01', 'Present', '08:00'),  // 11 min late
      makeRecord('2026-06-02', 'Present', '07:45'),  // on time
      makeRecord('2026-06-03', 'Present', '08:15'),  // 26 min late (>20)
    ];
    const baseline = computeBaseline(records, [], '07:49 AM');
    expect(baseline.late).toBe(2);
    expect(baseline.over20).toBe(1);
    expect(baseline.lateMins).toEqual([11, 26]);
    expect(baseline.lateDetails).toBe('1(11m), 3(26m)');
  });

  it('excludes holidays', () => {
    const records = [
      makeRecord('2026-06-01', 'Present'),
      makeRecord('2026-06-02', 'Absent'),  // holiday
      makeRecord('2026-06-03', 'Present'),
    ];
    const baseline = computeBaseline(records, [2], '07:49 AM');
    expect(baseline.pdays).toBe(2);
    expect(baseline.absent).toBe(0);
  });

  it('handles empty records', () => {
    const baseline = computeBaseline([], [], '07:49 AM');
    expect(baseline.pdays).toBe(0);
    expect(baseline.absent).toBe(0);
    expect(baseline.leave).toBe(0);
  });
});

// ─── findStaffMatch ─────────────────────────────────────────────────────────

describe('findStaffMatch', () => {
  const staff = [
    { name: 'Rahman Ahmed' },
    { name: 'Fatima Begum' },
    { name: 'Taslima Akter' },
  ];

  it('finds exact match', () => {
    const result = findStaffMatch('Rahman Ahmed', staff);
    expect(result?.name).toBe('Rahman Ahmed');
  });

  it('finds fuzzy match (substring)', () => {
    const result = findStaffMatch('Rahman', staff);
    expect(result?.name).toBe('Rahman Ahmed');
  });

  it('finds manual map match', () => {
    const result = findStaffMatch('akter', staff);
    expect(result?.name).toBe('Taslima Akter');
  });

  it('returns null for no match', () => {
    const result = findStaffMatch('Unknown Person', staff);
    expect(result).toBeNull();
  });
});

// ─── convertToPayrollInput ──────────────────────────────────────────────────

describe('convertToPayrollInput', () => {
  const config = {
    year: 2026,
    month: 6,
    holidays: [5],
    policies: {
      standardThreshold: '07:49 AM',
      tiffinRate: 25,
      over20Fine: 300,
      latePenalties: [],
    },
    staff: [],
  };

  it('converts grouped records to payroll input', () => {
    const records: FlatAttendanceRecord[] = [
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-01', 'Status': 'Present', 'In Time': '08:00', 'Out Time': '16:00', 'Hours': 8, 'Late': false },
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-02', 'Status': 'Absent', 'In Time': null, 'Out Time': null, 'Hours': 0, 'Late': false },
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-03', 'Status': 'Leave', 'In Time': null, 'Out Time': null, 'Hours': 0, 'Late': false },
    ];

    const grouped = groupByEmployee(records);
    const inputs = convertToPayrollInput(grouped, config as any);

    expect(inputs.length).toBe(1);
    expect(inputs[0].name).toBe('Alice');
    expect(inputs[0].role).toBe('Teacher');
    expect(inputs[0].dailyLogs).toEqual([{ day: 1, time: '08:00 AM' }]);
    expect(inputs[0].baseline.pdays).toBe(1);
    expect(inputs[0].baseline.absent).toBe(1);
    expect(inputs[0].baseline.leave).toBe(1);
  });

  it('skips holiday days', () => {
    const records: FlatAttendanceRecord[] = [
      { 'Employee ID': '1', 'Name': 'Alice', 'Designation': 'Teacher', 'Contact': '', 'Date': '2026-06-05', 'Status': 'Present', 'In Time': '08:00', 'Out Time': '16:00', 'Hours': 8, 'Late': false },
    ];

    const grouped = groupByEmployee(records);
    const inputs = convertToPayrollInput(grouped, config as any);

    expect(inputs[0].baseline.pdays).toBe(0); // holiday excluded
  });
});
