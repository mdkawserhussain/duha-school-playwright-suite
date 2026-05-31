#!/usr/bin/env tsx
// src/cli.ts — Commander CLI wrapper with flag overrides for .env values
import { Command } from 'commander';

const program = new Command();

program
  .name('school-portal-scraper')
  .description('School Management Portal Automation Suite')
  .version('1.0.0');

program
  .option('--year <year>', 'Academic year to extract', parseInt)
  .option('--shift <shift>', 'Shift filter (e.g. Day, Morning)')
  .option('--class <classes>', 'Comma-separated class names (e.g. One,Two,Three)')
  .option('--type <type>', 'Extraction type: dues, attendance, or all', 'all')
  .option('--whatsapp', 'Generate WhatsApp links dashboard after extraction', false)
  .option('--preview', 'Dry-run mode — run extraction without writing output files', false)
  .option('--headed', 'Run browser in headed (visible) mode', false)
  .option('--no-cache', 'Skip dropdown cache and force fresh discovery', false)
  .option('--min-due <amount>', 'Minimum due amount to include in dues-only filter', parseFloat)
  .parse(process.argv);

const opts = program.opts();

// Merge CLI options into environment variables before main.ts reads them
if (opts.year) {
  process.env.PORTAL_YEAR = String(opts.year);
}
if (opts.shift) {
  process.env.PORTAL_SHIFT = opts.shift;
}
if (opts.class) {
  process.env.PORTAL_CLASS = opts.class;
}
if (opts.type) {
  if (opts.type === 'dues') {
    process.env.PORTAL_DUE_STUDENTS_ONLY = 'true';
    process.env.EXTRACT_ATTENDANCE = 'false';
  } else if (opts.type === 'attendance') {
    process.env.PORTAL_DUE_STUDENTS_ONLY = 'false';
    process.env.EXTRACT_ATTENDANCE = 'true';
  } else {
    process.env.PORTAL_DUE_STUDENTS_ONLY = 'true';
    process.env.EXTRACT_ATTENDANCE = 'true';
  }
}
if (opts.whatsapp) {
  process.env.GENERATE_WHATSAPP_DASHBOARD = 'true';
}
if (opts.headed) {
  process.env.HEADED = 'true';
}
if (opts.noCache) {
  process.env.NO_CACHE = 'true';
}
if (opts.preview) {
  process.env.PREVIEW_MODE = 'true';
}
if (opts.minDue !== undefined) {
  process.env.MIN_DUE_AMOUNT = String(opts.minDue);
}

// Import and run main
import('./main.js').catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
