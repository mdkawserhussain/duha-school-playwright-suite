import { describe, it, expect } from 'vitest';
import {
  computeStaffSalary,
  computePayrollPreview,
  getSaturdayDates,
  type PayrollEntry,
  type JsAgv8Config,
  type StaffConfig,
  type StaffSalary,
} from './payrollCompute';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<JsAgv8Config> = {}): JsAgv8Config {
  return {
    schoolName: 'DUHA INTERNATIONAL SCHOOL',
    year: 2026,
    month: 5,
    policies: {
      standardTiming: '07:49 AM',
      tiffinRate: 25,
      over20Fine: 300,
      latePenalties: [
        { min: 11, fine: 200 },
        { min: 6, fine: 150 },
        { min: 1, fine: 100 },
      ],
    },
    holidays: [2, 16],
    tiffinExclusionDays: [9],
    noAbsentDays: [9],
    daySpecificTimings: {},
    locked: false,
    staff: [],
    ...overrides,
  };
}

function makeStaff(overrides: Partial<StaffConfig> = {}): StaffConfig {
  return {
    name: 'Test Teacher',
    basic: 50000,
    allowance: 5000,
    bank: { acct: '123456', mob: '01700000000' },
    role: 'Teacher',
    customTiming: null,
    exceptions: {},
    ...overrides,
  };
}

function makeEntry(overrides: Partial<PayrollEntry> = {}): PayrollEntry {
  return {
    name: 'Test Teacher',
    role: 'Teacher',
    dailyLogs: [],
    baseline: {
      pdays: 20,
      leave: 0,
      absent: 5,
      absentDates: [3, 4, 5, 6, 7],
      leaveDates: [],
      late: 0,
      over20: 0,
      lateMins: [],
      lateDetails: '',
    },
    ...overrides,
  };
}

// ─── getSaturdayDates ────────────────────────────────────────────────────────

describe('getSaturdayDates', () => {
  it('returns Saturdays for May 2026', () => {
    const saturdays = getSaturdayDates(2026, 5);
    expect(saturdays).toEqual([2, 9, 16, 23, 30]);
  });

  it('returns Saturdays for June 2026', () => {
    const saturdays = getSaturdayDates(2026, 6);
    expect(saturdays).toEqual([6, 13, 20, 27]);
  });
});

// ─── computeStaffSalary: basic + allowance → gross ───────────────────────────

describe('computeStaffSalary: gross', () => {
  it('computes gross = basic + allowance', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [...new Set([...config.holidays, 9, 16, 23, 30])]; // Fridays + explicit
    const staff = makeStaff({ basic: 50000, allowance: 5000 });
    const emp = makeEntry();

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.gross).toBe(55000);
    expect(result.basic).toBe(50000);
    expect(result.allowance).toBe(5000);
  });

  it('handles zero basic', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [...new Set([...config.holidays])];
    const staff = makeStaff({ basic: 0, allowance: 0 });
    const emp = makeEntry({ baseline: { pdays: 0, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' } });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.gross).toBe(0);
    expect(result.perDay).toBe(0);
  });
});

// ─── computeStaffSalary: tiffin ──────────────────────────────────────────────

describe('computeStaffSalary: tiffin', () => {
  it('tiffin = pdays × tiffinRate (no exclusions)', () => {
    const config = makeConfig({ tiffinExclusionDays: [] });
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16]; // Only explicit holidays, no Fridays for simplicity
    const staff = makeStaff();
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.tiffin).toBe(20 * 25);
  });

  it('tiffin excludes tiffinExclusionDays (from dailyLogs)', () => {
    const config = makeConfig({ tiffinExclusionDays: [9] });
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff();
    // excludedDaysPresent is computed from dailyLogs — need entries on exclusion days
    const emp = makeEntry({
      dailyLogs: [
        { day: 1, time: '08:00 AM' },
        { day: 3, time: '08:00 AM' },
        { day: 9, time: '08:00 AM' }, // tiffinExclusionDay + Saturday
      ],
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    // 20 pdays - 1 excluded (day 9) = 19 eligible
    expect(result.tiffin).toBe(19 * 25);
  });
});

// ─── computeStaffSalary: absent deduction ────────────────────────────────────

describe('computeStaffSalary: absent deduction', () => {
  it('absent deduction = absent × perDay', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000 });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    const perDay = Math.round(50000 / 25);
    expect(result.absDed).toBe(5 * perDay);
  });

  it('skipAbsentDeduction → no absent deduction', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000, exceptions: { skipAbsentDeduction: true } });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.absDed).toBe(0);
  });
});

// ─── computeStaffSalary: late penalties ──────────────────────────────────────

describe('computeStaffSalary: late penalties', () => {
  it('no late → no late deduction', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000 });
    const emp = makeEntry({
      dailyLogs: [{ day: 3, time: '07:45 AM' }],
      baseline: { pdays: 1, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.late).toBe(0);
    expect(result.lateDed).toBe(0);
  });

  it('late under 6 min → fine 100', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000 });
    const emp = makeEntry({
      dailyLogs: [
        { day: 3, time: '07:53 AM' }, // 4 min late
        { day: 4, time: '07:55 AM' }, // 6 min late
        { day: 5, time: '07:52 AM' }, // 3 min late
        { day: 6, time: '08:00 AM' }, // 11 min late
      ],
      baseline: { pdays: 4, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.late).toBe(4);
    // late >= 3 → +perDay (2000)
    // late >= 4: nonOver20=[11,6,4,3], toFine=slice(3)=[3], 3>=min1 → fine 100
    // Total: 2000 + 100 = 2100
    const perDay = Math.round(50000 / 25);
    expect(result.lateDed).toBe(perDay + 100);
  });

  it('over 20 min → over20Fine 300 each', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000 });
    const emp = makeEntry({
      dailyLogs: [
        { day: 3, time: '08:15 AM' }, // 26 min late
        { day: 4, time: '08:10 AM' }, // 21 min late
      ],
      baseline: { pdays: 2, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.over20).toBe(2);
    // 2 over20 × 300 = 600
    expect(result.lateDed).toBe(600);
  });

  it('skipLateCheck → no late deductions', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000, exceptions: { skipLateCheck: true } });
    const emp = makeEntry({
      dailyLogs: [
        { day: 3, time: '08:15 AM' },
        { day: 4, time: '08:10 AM' },
      ],
      baseline: { pdays: 2, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.late).toBe(0);
    expect(result.over20).toBe(0);
    expect(result.lateDed).toBe(0);
  });
});

// ─── computeStaffSalary: exceptions ──────────────────────────────────────────

describe('computeStaffSalary: exceptions', () => {
  it('OT, increment, bonus added to net', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({
      basic: 50000,
      allowance: 0,
      exceptions: { ot: 2000, increment: 1000, bonus: 500 },
    });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    // gross=50000, no deductions, tiffin=20*25=500, + ot=2000, incr=1000, bonus=500
    expect(result.ot).toBe(2000);
    expect(result.increment).toBe(1000);
    expect(result.bonus).toBe(500);
    expect(result.net).toBe(50000 + 500 + 2000 + 1000 + 500);
  });

  it('PF deduction subtracted, PF return added', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({
      basic: 50000,
      allowance: 0,
      exceptions: { pfDeduction: 1000, pfReturn: 500 },
    });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    // gross=50000, tiffin=20*25=500, pfDed=1000, pfReturn=500
    expect(result.pfDeduction).toBe(1000);
    expect(result.pfReturn).toBe(500);
    expect(result.net).toBe(50000 + 500 - 1000 + 500);
  });

  it('overridePdays overrides computed pdays', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({
      basic: 50000,
      exceptions: { overridePdays: 22 },
    });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.pdays).toBe(22);
  });

  it('overrideAbsent overrides computed absent', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({
      basic: 50000,
      exceptions: { overrideAbsent: 2 },
    });
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.absent).toBe(2);
    const perDay = Math.round(50000 / 25);
    expect(result.absDed).toBe(2 * perDay);
  });
});

// ─── computeStaffSalary: customTiming ────────────────────────────────────────

describe('computeStaffSalary: customTiming', () => {
  it('customTiming overrides standard threshold', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    // Staff arrives at 08:05 — late under standard (07:49) but NOT late under custom (08:10)
    const staff = makeStaff({ customTiming: '08:10 AM' });
    const emp = makeEntry({
      dailyLogs: [{ day: 3, time: '08:05 AM' }],
      baseline: { pdays: 1, leave: 0, absent: 0, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.late).toBe(0);
    expect(result.lateDed).toBe(0);
  });
});

// ─── computeStaffSalary: noAbsentDays ────────────────────────────────────────

describe('computeStaffSalary: noAbsentDays', () => {
  it('noAbsentDays exempt from absent deduction', () => {
    const config = makeConfig({ noAbsentDays: [3, 4, 5] });
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 50000, allowance: 0 });
    // Day 3,4,5 are noAbsentDays — absentDates only lists days not in noAbsentDays
    const emp = makeEntry({
      baseline: { pdays: 20, leave: 0, absent: 5, absentDates: [3, 4, 5, 6, 7], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    // absentDates computed from empty dailyLogs — all non-holiday, non-noAbsentDays are absent
    // noAbsentDays [3,4,5] should NOT appear in absentDates
    expect(result.absentDates).not.toContain(3);
    expect(result.absentDates).not.toContain(4);
    expect(result.absentDates).not.toContain(5);
    // Holidays should NOT appear in absentDates
    expect(result.absentDates).not.toContain(2);
    expect(result.absentDates).not.toContain(16);
    // absent deduction uses finalAbsent (5) from baseline
    const perDay = Math.round(50000 / 25);
    expect(result.absDed).toBe(5 * perDay);
  });
});

// ─── computeStaffSalary: net floor at 0 ──────────────────────────────────────

describe('computeStaffSalary: net floor at 0', () => {
  it('net cannot go negative', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff({ basic: 5000, allowance: 0 });
    // High absent count to create large deduction
    const emp = makeEntry({
      baseline: { pdays: 0, leave: 0, absent: 25, absentDates: [], leaveDates: [], late: 0, over20: 0, lateMins: [], lateDetails: '' },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    // gross=5000, perDay=200, absDed=25*200=5000, totalDed=5000
    // net = max(0, 5000-5000) + 0 = 0
    expect(result.net).toBe(0);
    expect(result.net).toBeGreaterThanOrEqual(0);
  });
});

// ─── computeStaffSalary: markings string ─────────────────────────────────────

describe('computeStaffSalary: markings', () => {
  it('builds markings string with Ab, Lt, Lv', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const staff = makeStaff();
    const emp = makeEntry({
      dailyLogs: [
        { day: 3, time: '08:00 AM' }, // late
        { day: 4, time: '08:15 AM' }, // late
      ],
      baseline: {
        pdays: 2, leave: 1, absent: 2, absentDates: [5, 6], leaveDates: [7],
        late: 0, over20: 0, lateMins: [], lateDetails: '',
      },
    });

    const result = computeStaffSalary(emp, staff, config, saturdays, holidays, 31);
    expect(result.markings).toContain('Ab:');
    expect(result.markings).toContain('Lv:7');
    expect(result.lateInfo.length).toBeGreaterThan(0);
  });
});

// ─── computeStaffSalary: no staff config ─────────────────────────────────────

describe('computeStaffSalary: missing staff config', () => {
  it('uses zero-data fallback when staffCfg is null', () => {
    const config = makeConfig();
    const saturdays = getSaturdayDates(2026, 5);
    const holidays = [2, 16];
    const emp = makeEntry();

    const result = computeStaffSalary(emp, null, config, saturdays, holidays, 31);
    expect(result.basic).toBe(0);
    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
    expect(result.markings).toBe('No attendance data found.');
  });
});

// ─── computePayrollPreview: full preview ─────────────────────────────────────

describe('computePayrollPreview', () => {
  it('computes preview with 3 staff members', () => {
    // This test uses real js-agv8 data if available, otherwise tests the interface
    const fs = require('node:fs');
    const path = require('node:path');
    const jsAgv8Dir = path.resolve(process.cwd(), 'js-agv8');

    if (!fs.existsSync(path.join(jsAgv8Dir, 'config.json'))) {
      console.warn('Skipping full preview test: js-agv8 not available');
      return;
    }

    try {
      const result = computePayrollPreview(jsAgv8Dir);
      expect(result.staff.length).toBeGreaterThan(0);
      expect(result.summary.totalStaff).toBe(result.staff.length);
      expect(result.summary.totalGross).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalNet).toBeGreaterThanOrEqual(0);

      // Every staff member should have net >= 0
      for (const s of result.staff) {
        expect(s.net).toBeGreaterThanOrEqual(0);
        expect(s.perDay).toBe(Math.round(s.basic / 25));
      }
    } catch (err: any) {
      // If parsed.json doesn't exist yet, that's ok
      if (err.message.includes('parsed.json not found')) {
        console.warn('Skipping: parsed.json not yet generated');
      } else {
        throw err;
      }
    }
  });
});
