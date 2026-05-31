import { describe, it, expect } from 'vitest';
import { diffSnapshot } from './diffEngine';

describe('diffSnapshot', () => {
  const baseStudent = { Name: 'Alice', 'User ID': '1', 'Total Due': '5000' };

  it('detects new defaulters', () => {
    const previous = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const current = [
      { Name: 'Alice', 'User ID': '1', 'Total Due': '5000' },
      { Name: 'Bob', 'User ID': '2', 'Total Due': '3000' },
    ];
    const result = diffSnapshot(previous, current);
    expect(result.newDefaulters.length).toBe(1);
    expect(result.newDefaulters[0]['Name']).toBe('Bob');
  });

  it('detects cleared dues', () => {
    const previous = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const current = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '0' }];
    const result = diffSnapshot(previous, current);
    expect(result.clearedDues.length).toBe(1);
    expect(result.clearedDues[0]['Name']).toBe('Alice');
  });

  it('detects increased dues', () => {
    const previous = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const current = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '8000' }];
    const result = diffSnapshot(previous, current);
    expect(result.duesIncreased.length).toBe(1);
    expect(result.duesIncreased[0].previousAmount).toBe(5000);
    expect(result.duesIncreased[0].currentAmount).toBe(8000);
  });

  it('detects decreased dues', () => {
    const previous = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const current = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '2000' }];
    const result = diffSnapshot(previous, current);
    expect(result.duesDecreased.length).toBe(1);
    expect(result.duesDecreased[0].previousAmount).toBe(5000);
    expect(result.duesDecreased[0].currentAmount).toBe(2000);
  });

  it('no change when amounts are equal', () => {
    const previous = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const current = [{ Name: 'Alice', 'User ID': '1', 'Total Due': '5000' }];
    const result = diffSnapshot(previous, current);
    expect(result.newDefaulters.length).toBe(0);
    expect(result.clearedDues.length).toBe(0);
    expect(result.duesIncreased.length).toBe(0);
    expect(result.duesDecreased.length).toBe(0);
  });
});
