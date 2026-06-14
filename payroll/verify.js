const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { normalize, getVal, validateConfig, getMonthName } = require('./utils');

function parseDocx(filePath, colConfig) {
  if (!fs.existsSync(filePath)) return {};
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const data = {};

  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    
    const col1 = getCellText(cells[0] || "");
    const name = getCellText(cells[colConfig.nameCol] || "");
    if (!name || name.includes("Teachers' Name") || name.includes("Employee Name") || name.toLowerCase().includes("grand net")) return;

    // Detection: in Monthly-All, Column 1 (W. Days) is a number. 
    // In Bank-Transfer, Column 0 (SL No) is a number.
    const detector = getCellText(cells[colConfig.detectCol] || "");
    if (!/^\d+$/.test(detector) && detector.length < 1) return;

    const entry = {
      name: name,
      basic: colConfig.basicCol !== undefined ? getVal(getCellText(cells[colConfig.basicCol] || "")) : 0,
      allowance: colConfig.allowanceCol !== undefined ? getVal(getCellText(cells[colConfig.allowanceCol] || "")) : 0,
      tiffin: colConfig.tiffinCol !== undefined ? getVal(getCellText(cells[colConfig.tiffinCol] || "")) : 0,
      ot: colConfig.otCol !== undefined ? getVal(getCellText(cells[colConfig.otCol] || "")) : 0,
      increment: colConfig.incrementCol !== undefined ? getVal(getCellText(cells[colConfig.incrementCol] || "")) : 0,
      bonus: colConfig.bonusCol !== undefined ? getVal(getCellText(cells[colConfig.bonusCol] || "")) : 0,
      pfDeduction: colConfig.pfDedCol !== undefined ? getVal(getCellText(cells[colConfig.pfDedCol] || "")) : 0,
      pfReturn: colConfig.pfReturnCol !== undefined ? getVal(getCellText(cells[colConfig.pfReturnCol] || "")) : 0,
      deduction: colConfig.deductionCol !== undefined ? getVal(getCellText(cells[colConfig.deductionCol] || "")) : 0,
      net: getVal(getCellText(cells[colConfig.netCol] || ""))
    };
    
    data[normalize(name)] = entry;
  });
  return data;
}

// ─── Parse wa-data-*.js file ───────────────────────────────────────────────
function parseWaDataFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  const monthMatch = content.match(/window\.monthName\s*=\s*"([^"]+)"/);
  const schoolMatch = content.match(/window\.schoolName\s*=\s*"([^"]+)"/);

  const dataMatch = content.match(/window\.waData\s*=\s*\[([\s\S]*)\];/);
  if (!dataMatch) return null;

  const entries = {};
  const entryRegex = /\{[\s\S]*?\}/g;
  let match;
  while ((match = entryRegex.exec(dataMatch[1])) !== null) {
    const entry = match[0];
    const nameMatch = entry.match(/name:\s*"([^"]*?)"/);
    const phoneMatch = entry.match(/phone:\s*"([^"]*?)"/);
    const netMatch = entry.match(/net:\s*"([^"]*?)"/);
    const noteMatch = entry.match(/note:\s*"([^"]*?)"/);
    const msgMatch = entry.match(/message:\s*`([\s\S]*?)`/);

    if (nameMatch) {
      const normName = normalize(nameMatch[1]);
      entries[normName] = {
        name: nameMatch[1],
        phone: phoneMatch ? phoneMatch[1] : '',
        net: netMatch ? getVal(netMatch[1]) : 0,
        note: noteMatch ? noteMatch[1] : '',
        message: msgMatch ? msgMatch[1] : ''
      };
    }
  }

  return {
    monthName: monthMatch ? monthMatch[1] : null,
    schoolName: schoolMatch ? schoolMatch[1] : null,
    entries
  };
}

// ─── Find latest wa-data file ──────────────────────────────────────────────
function findLatestWaDataFile(monthName, year) {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) return null;
  
  const pattern = `wa-data-${monthName}-${year}.js`;
  const filePath = path.join(outputDir, pattern);
  if (fs.existsSync(filePath)) return filePath;
  
  // Fallback: find any wa-data file
  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('wa-data-') && f.endsWith('.js'))
    .sort()
    .reverse();
  
  return files.length > 0 ? path.join(outputDir, files[0]) : null;
}

async function verify(isFinalOverride) {
  const isFinal = isFinalOverride ?? process.argv.includes('--final');
  let output = "";
  const log = (msg) => {
    console.log(msg);
    output += msg + "\n";
  };

  const timestamp = new Date().toLocaleString('en-GB', { hour12: true });
  log(`\n======================================================================`);
  log(`           ULTIMATE PAYROLL VERIFICATION ENGINE`);
  log(`           Generated: ${timestamp}`);
  log(`           MODE: ${isFinal ? 'FINAL (post-bank)' : 'INTERMEDIATE (pre-bank)'}`);
  log(`======================================================================\n`);

  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const monthName = getMonthName(config);
  const monthlyFile = `output/Monthly-All-${monthName}-${config.year}-formatted.docx`;
  const bankFile = `output/Bank-Transfer-${monthName}-${config.year}.docx`;
  const waDataFile = findLatestWaDataFile(monthName, config.year);

  // 1. Parsing all sources — now with OT/Increment/Bonus/PF columns
  const monthlyData = parseDocx(monthlyFile, {
    nameCol: 1, detectCol: 2,
    otCol: 7, incrementCol: 8, bonusCol: 9, pfDedCol: 10, pfReturnCol: 11,
    basicCol: 13, allowanceCol: 14, tiffinCol: 15,
    deductionCol: 17, netCol: 18
  });
  const bankData = parseDocx(bankFile, { nameCol: 1, detectCol: 0, netCol: 5 });
  const waData = parseWaDataFile(waDataFile);

  if (waData) {
    log(`  WhatsApp data file: ${path.basename(waDataFile)}`);
  } else {
    log(`  ⚠️  No WhatsApp data file found (run 'node wa3.js generate' first)`);
  }

  // 2. Audit Table
  log(`${'Staff Name'.padEnd(30)} | ${'Calc'.padStart(8)} | ${'Report'.padStart(8)} | ${'Bank'.padStart(8)} | Status`);
  log("-".repeat(78));

  let mathErrors = [];
  let syncErrors = [];
  let missingStaff = [];
  let totalShown = 0;
  let totalCalc = 0;
  const auditSnapshot = {};

  config.staff.forEach(s => {
    const norm = normalize(s.name);
    const m = monthlyData[norm];
    const b = bankData[norm];

    if (!m) {
      missingStaff.push(s.name);
      log(`${s.name.substring(0, 30).padEnd(30)} | ${'---'.padStart(8)} | ${'---'.padStart(8)} | ${'---'.padStart(8)} | ❌ MISSING`);
      return;
    }

    // Math Check — includes OT, Increment/Bonus, PF
    const calc = m.basic + m.allowance + m.tiffin + m.ot + m.increment + m.bonus - m.pfDeduction + m.pfReturn - m.deduction;
    const mathOk = calc === m.net;
    totalShown += m.net;
    totalCalc += calc;

    // Consistency Check (Cross-File)
    const files = [m.net, b ? b.net : null].filter(v => v !== null);
    const syncOk = files.every(v => v === m.net);

    let status = (mathOk && syncOk) ? "✅ OK" : "❌ ERR";
    
    log(`${m.name.substring(0, 30).padEnd(30)} | ${calc.toLocaleString().padStart(8)} | ${m.net.toLocaleString().padStart(8)} | ${(b ? b.net : '---').toLocaleString().padStart(8)} | ${status}`);

    if (!mathOk) mathErrors.push({ name: m.name, calc, shown: m.net });
    if (!syncOk) syncErrors.push({ name: m.name, monthly: m.net, bank: b ? b.net : 'N/A' });

    auditSnapshot[norm] = { name: m.name, net: m.net, basic: m.basic, allowance: m.allowance };
  });

  log("-".repeat(88));

  // 3. Staff Parity
  log(`\n[1] STAFF PARITY CHECK:`);
  if (missingStaff.length === 0) {
    log(`  ✅ All ${config.staff.length} staff members are present in the Monthly Report.`);
  } else {
    log(`  ❌ MISSING STAFF (${missingStaff.length}):`);
    missingStaff.forEach(n => log(`     - ${n}`));
  }

  // 4. Math Check
  log(`\n[2] MATHEMATICAL INTEGRITY CHECK:`);
  log(`  - Total Net (Shown):      BDT ${totalShown.toLocaleString()}`);
  log(`  - Total Net (Calculated): BDT ${totalCalc.toLocaleString()}`);
  if (mathErrors.length === 0) {
    log(`  ✅ Internal math verification passed (includes OT/Increment/Bonus/PF).`);
  } else {
    log(`  ❌ MATH ERRORS FOUND (${mathErrors.length}):`);
    mathErrors.forEach(e => {
      const diff = e.calc - e.shown;
      const sign = diff > 0 ? "+" : "";
      log(`     - ${e.name}: Calc=${e.calc.toLocaleString()} | Shown=${e.shown.toLocaleString()} | Diff=${sign}${diff.toLocaleString()} [${diff > 0 ? 'UNDERPAID' : 'OVERPAID'}]`);
    });
  }

  // 5. Cross-document sync
  log(`\n[3] CROSS-DOCUMENT CONSISTENCY CHECK:`);
  if (syncErrors.length === 0) {
    log(`  ✅ All documents are synchronized (Net Pay is identical everywhere).`);
  } else {
    log(`  ⚠️  SYNC DISCREPANCIES FOUND (${syncErrors.length}):`);
    syncErrors.forEach(e => {
      log(`     - ${e.name.padEnd(20)}: Monthly=${e.monthly} | Bank=${e.bank}`);
    });
  }

  // 6. WhatsApp Data Cross-Check
  log(`\n[4] WHATSAPP DATA CROSS-CHECK:`);
  if (!waData) {
    log(`  ⚠️  SKIPPED — No wa-data file found.`);
    log(`     Run 'node wa3.js generate' to create the data file.`);
  } else {
    let waErrors = [];
    let waMissingInDocx = [];
    let waMissingInConfig = [];
    let waNetMismatches = [];

    // Check each staff in config against waData and monthlyData
    config.staff.forEach(s => {
      const norm = normalize(s.name);
      const m = monthlyData[norm];
      const w = waData.entries[norm];

      if (!w) {
        waMissingInDocx.push(s.name);
        return;
      }

      if (!m) {
        waMissingInConfig.push(s.name);
        return;
      }

      // Compare net pay
      if (w.net !== m.net) {
        waNetMismatches.push({ name: s.name, docx: m.net, wa: w.net, diff: m.net - w.net });
      }
    });

    // Check for names in waData but not in config
    let waExtraNames = [];
    Object.keys(waData.entries).forEach(norm => {
      if (!config.staff.find(s => normalize(s.name) === norm)) {
        waExtraNames.push(waData.entries[norm].name);
      }
    });

    // Report results
    if (waNetMismatches.length === 0 && waMissingInDocx.length === 0 && waExtraNames.length === 0) {
      log(`  ✅ WhatsApp data matches Monthly-All report perfectly.`);
      log(`     - ${Object.keys(waData.entries).length} staff entries verified`);
    } else {
      if (waNetMismatches.length > 0) {
        log(`  ❌ NET PAY MISMATCHES (${waNetMismatches.length}):`);
        waNetMismatches.forEach(e => {
          const sign = e.diff > 0 ? '+' : '';
          log(`     - ${e.name.padEnd(20)}: Docx=${e.docx.toLocaleString()} | WhatsApp=${e.wa.toLocaleString()} | Diff=${sign}${e.diff.toLocaleString()}`);
        });
      }
      if (waMissingInDocx.length > 0) {
        log(`  ⚠️  Staff in config but MISSING from wa-data file (${waMissingInDocx.length}):`);
        waMissingInDocx.forEach(n => log(`     - ${n}`));
      }
      if (waExtraNames.length > 0) {
        log(`  ⚠️  Staff in wa-data but NOT in config (${waExtraNames.length}):`);
        waExtraNames.forEach(n => log(`     - ${n}`));
      }
    }

    // Phone number check
    let noPhone = [];
    Object.values(waData.entries).forEach(e => {
      const clean = (e.phone || '').replace(/[^0-9]/g, '');
      if (!clean || clean.length < 11) {
        noPhone.push(e.name);
      }
    });
    if (noPhone.length > 0) {
      log(`\n  ⚠️  Staff with invalid/missing phone numbers (${noPhone.length}):`);
      noPhone.forEach(n => log(`     - ${n}`));
    }
  }

  // 7. Grand Total Reconciliation (only in --final mode)
  if (isFinal) {
    const bankTotal = Object.values(bankData).reduce((s, e) => s + e.net, 0);
    // Identify cash staff: in monthlyData but not in bankData
    let cashTotal = 0;
    Object.keys(monthlyData).forEach(norm => {
      if (!bankData[norm]) cashTotal += monthlyData[norm].net;
    });

    log(`\n[5] GRAND TOTAL RECONCILIATION:`);
    log(`  Bank Total: BDT ${bankTotal.toLocaleString()}`);
    log(`  Cash Total: BDT ${cashTotal.toLocaleString()}`);
    log(`  Combined:   BDT ${(bankTotal + cashTotal).toLocaleString()}`);
    log(`  Monthly-All Grand: BDT ${totalShown.toLocaleString()}`);
    const reconciled = (bankTotal + cashTotal) === totalShown;
    log(`  ${reconciled ? '✅ Grand total reconciled.' : '❌ GRAND TOTAL MISMATCH!'}`);

    // 8. Duplicate detection — check if any employee in both Bank and Cash
    const bankNorms = new Set(Object.keys(bankData));
    const duplicates = [];
    Object.keys(monthlyData).forEach(norm => {
      // If in bankData AND also in cashStaff somehow... shouldn't happen but guard
      // Actually check: is any name in bankData AND has no acct in config?
    });
    // Check config for duplicates: same name appearing with and without bank acct
    const namesSeen = new Set();
    config.staff.forEach(s => {
      const n = normalize(s.name);
      if (namesSeen.has(n)) duplicates.push(s.name);
      namesSeen.add(n);
    });
    if (duplicates.length) {
      log(`\n[6] DUPLICATE DETECTION:`);
      log(`  ⚠️  Duplicate staff entries found: ${duplicates.join(', ')}`);
    }
  }

  // 9. Anomaly detection — compare with previous snapshot
  const prevSnapshotFile = `output/audit-snapshot-${monthName}-${config.year}.json`;
  // Look for previous month
  const prevMonth = config.month === 1 ? 12 : config.month - 1;
  const prevYear = config.month === 1 ? config.year - 1 : config.year;
  const prevMonthName = new Date(prevYear, prevMonth - 1).toLocaleString('en-US', { month: 'long' });
  const prevFile = `output/audit-snapshot-${prevMonthName}-${prevYear}.json`;
  
  if (fs.existsSync(prevFile)) {
    const prevData = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
    const prevStaff = prevData.staff || {};
    const anomalies = [];
    Object.entries(auditSnapshot).forEach(([norm, cur]) => {
      const prev = prevStaff[norm];
      if (prev && prev.net > 0) {
        const change = Math.abs(cur.net - prev.net) / prev.net;
        if (change > 0.2) {
          anomalies.push({ name: cur.name, prev: prev.net, cur: cur.net, pct: (change * 100).toFixed(1) });
        }
      }
    });
    if (anomalies.length) {
      log(`\n[${isFinal ? '7' : '5'}] ANOMALY DETECTION (>20% change vs ${prevMonthName}):`);
      anomalies.forEach(a => {
        log(`  ⚠️  ${a.name}: ${a.prev.toLocaleString()} → ${a.cur.toLocaleString()} (${a.pct}% change)`);
      });
    }
  }

  log(`\n======================================================================`);
  // Count WhatsApp errors if available
  let waErrorCount = 0;
  if (waData) {
    config.staff.forEach(s => {
      const norm = normalize(s.name);
      const m = monthlyData[norm];
      const w = waData.entries[norm];
      if (w && m && w.net !== m.net) waErrorCount++;
    });
  }
  const finalStatus = (missingStaff.length + mathErrors.length + syncErrors.length + waErrorCount) === 0 ? "PASSED" : "FAILED";
  log(`             FINAL VERIFICATION STATUS: ${finalStatus}`);
  log(`======================================================================\n`);

  // Save audit report
  const reportPath = "output/audit-report.txt";
  fs.writeFileSync(reportPath, output);
  console.log(`✓ Master audit report saved to: ${reportPath}`);

  // Save JSON snapshot for future anomaly detection
  const snapshotPath = `output/audit-snapshot-${monthName}-${config.year}.json`;
  fs.writeFileSync(snapshotPath, JSON.stringify({
    month: monthName, year: config.year,
    generated: new Date().toISOString(),
    staff: auditSnapshot
  }, null, 2));
  console.log(`✓ Audit snapshot saved to: ${snapshotPath}`);
}

module.exports = { verify };
if (require.main === module) verify().catch(console.error);
