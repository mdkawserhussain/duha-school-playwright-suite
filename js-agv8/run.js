#!/usr/bin/env node
// ─── DUHA PAYROLL — ALL-IN-ONE ORCHESTRATOR ────────────────────────────────
// Usage:
//   node run.js                  Full pipeline (parse → all → verify → bank → wa)
//   node run.js --phase 1        Run only Phase 1 (parse)
//   node run.js --phase 3        Run only Phase 3 (all.js)
//   node run.js --phase 5        Run only Phase 5 (verify)
//   node run.js --phase 6        Run only Phase 6 (bank2)
//   node run.js --phase 8        Run only Phase 8 (wa + wa2)
//   node run.js --skip-wa        Skip WhatsApp generation
//   node run.js --dry-run        Dry-run mode for bank outputs
//   node run.js --final          Include final verify pass
//   node run.js --no-pause       Skip manual review pause
//   node run.js --preview        Preview WA messages only

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { validateConfig, getMonthName } = require('./utils');

// ─── CLI FLAGS ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const phaseArg = args.includes('--phase') ? parseInt(args[args.indexOf('--phase') + 1]) : null;
const skipWa = args.includes('--skip-wa');
const isDryRun = args.includes('--dry-run');
const isFinal = args.includes('--final');
const noPause = args.includes('--no-pause');
const isPreview = args.includes('--preview');

function hr() { console.log('\n' + '═'.repeat(60)); }

function banner(phase, title) {
  hr();
  console.log(`  PHASE ${phase}: ${title}`);
  hr();
}

async function pause(message) {
  if (noPause) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`\n⏸️  ${message}\n   Press ENTER to continue (or Ctrl+C to abort)... `, () => {
      rl.close();
      resolve();
    });
  });
}

async function runPhase(phaseNum, title, fn) {
  banner(phaseNum, title);
  const start = Date.now();
  try {
    await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Phase ${phaseNum} completed in ${elapsed}s`);
  } catch (err) {
    console.error(`\n❌ Phase ${phaseNum} FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// ─── MAIN PIPELINE ─────────────────────────────────────────────────────────
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         DUHA PAYROLL SYSTEM — ORCHESTRATOR           ║
║         All-in-One Pipeline Runner                   ║
╚══════════════════════════════════════════════════════╝`);

  // Step 0: Validate config
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  validateConfig(config);
  const monthName = getMonthName(config);
  console.log(`\n📋 Config: ${config.schoolName}`);
  console.log(`📅 Period: ${monthName} ${config.year}`);
  console.log(`👥 Staff:  ${config.staff.length} entries`);
  console.log(`🔒 Locked: ${config.locked ? 'YES ⚠️' : 'No'}`);
  if (isDryRun) console.log(`🔍 Mode:   DRY RUN`);
  if (phaseArg) console.log(`🎯 Target: Phase ${phaseArg} only`);

  const shouldRun = (phase) => !phaseArg || phaseArg === phase;

  // ── Phase 1: Parse attendance ──────────────────────────────────────────
  if (shouldRun(1)) {
    if (!fs.existsSync('input/att.docx')) {
      console.log('\n⚠️  input/att.docx not found — skipping Phase 1 (parse)');
    } else {
      await runPhase(1, 'PARSE ATTENDANCE', async () => {
        // Clear module cache to avoid stale state on re-runs
        delete require.cache[require.resolve('./parse')];
        const parse = require('./parse');
        await parse.main();
      });

      // ── Phase 2: Manual review pause ──────────────────────────────────
      if (!phaseArg) {
        await pause('Review temp/parsed.docx now. Edit P/L/Ab/Late values if needed, then save.');
      }
    }
  }

  // ── Phase 3: Generate reports (all.js) ─────────────────────────────────
  if (shouldRun(3)) {
    if (config.locked && !isDryRun) {
      console.log('\n❌ config.json is locked. Unlock to generate reports.');
      if (!phaseArg) process.exit(1);
    } else {
      await runPhase(3, 'GENERATE REPORTS (all.js)', async () => {
        delete require.cache[require.resolve('./all')];
        const all = require('./all');
        await all.main();
      });
    }
  }

  // ── Phase 5: Verify (intermediate) ─────────────────────────────────────
  if (shouldRun(5)) {
    await runPhase(5, 'VERIFY (intermediate)', async () => {
      delete require.cache[require.resolve('./verify')];
      const verify = require('./verify');
      await verify.verify();
    });
  }

  // ── Phase 6: Bank2 (optional) ──────────────────────────────────────────
  if (shouldRun(6)) {
    if (fs.existsSync('input/monthly2.docx')) {
      await runPhase(6, 'BANK2 LETTER', async () => {
        delete require.cache[require.resolve('./bank2')];
        const bank2 = require('./bank2');
        await bank2.main();
      });
    } else {
      console.log('\n⚠️  input/monthly2.docx not found — skipping Phase 6 (bank2)');
    }
  }

  // ── Phase 7: Final verify ──────────────────────────────────────────────
  if (isFinal && (shouldRun(5) || !phaseArg)) {
    await runPhase(7, 'FINAL VERIFY (post-bank)', async () => {
      // Simulate --final flag
      process.argv.push('--final');
      delete require.cache[require.resolve('./verify')];
      const verify = require('./verify');
      await verify.verify();
      // Clean up argv
      process.argv = process.argv.filter(a => a !== '--final');
    });
  }

  // ── Phase 8: WhatsApp ──────────────────────────────────────────────────
  if (shouldRun(8) && !skipWa) {
    await runPhase(8, 'WHATSAPP MESSAGES', async () => {
      if (isPreview) {
        process.argv.push('--preview');
      }
      delete require.cache[require.resolve('./wa')];
      const wa = require('./wa');
      await wa.main();

      if (fs.existsSync('input/monthly2.docx')) {
        delete require.cache[require.resolve('./wa2')];
        const wa2 = require('./wa2');
        await wa2.main();
      }

      if (isPreview) {
        process.argv = process.argv.filter(a => a !== '--preview');
      }
    });
  }

  // ── Final Summary ──────────────────────────────────────────────────────
  hr();
  console.log('  PIPELINE COMPLETE');
  hr();
  console.log(`\n📁 Generated files:`);

  const outputFiles = fs.existsSync('output') ? fs.readdirSync('output') : [];
  const tempFiles = fs.existsSync('temp') ? fs.readdirSync('temp') : [];

  if (tempFiles.length) {
    console.log('\n  temp/');
    tempFiles.forEach(f => console.log(`    ├── ${f}`));
  }
  if (outputFiles.length) {
    console.log('\n  output/');
    outputFiles.forEach(f => console.log(`    ├── ${f}`));
  }

  console.log(`\n✅ All done for ${monthName} ${config.year}!`);
}

main().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
