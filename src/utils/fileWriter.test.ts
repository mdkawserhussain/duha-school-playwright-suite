import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mock logger (must match import path in fileWriter.ts)
vi.mock('./logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock config
vi.mock('../config', () => ({
  CONFIG: {
    directories: {
      output: '/mock/output',
    },
  },
}));

import { writeJsonOutput } from './fileWriter';
import { log } from './logger';

describe('writeJsonOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates output directory if it does not exist', () => {
    (fs.existsSync as any).mockReturnValue(false);
    (fs.writeFileSync as any).mockImplementation(() => {});

    writeJsonOutput('test', [{ name: 'Alice' }]);

    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/output', { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('backs up existing file before writing', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.renameSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});

    writeJsonOutput('test', [{ name: 'Alice' }]);

    expect(fs.renameSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('skips write when data is empty and backup exists', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.renameSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});

    writeJsonOutput('test', []);

    expect(fs.renameSync).toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Empty extraction result')
    );
  });

  it('writes empty array when no backup exists', () => {
    (fs.existsSync as any).mockReturnValue(false);
    (fs.writeFileSync as any).mockImplementation(() => {});

    writeJsonOutput('test', []);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Empty extraction result')
    );
  });
});
