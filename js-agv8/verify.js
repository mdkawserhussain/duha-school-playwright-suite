const fs = require('fs');
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

async function verify() {
  const isFinal = process.argv.includes('--final');
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
  const monthlyFile = `output/Monthly-All-${monthName}-${config.year}.docx`;
  const bankFile = `output/Bank-Transfer-${monthName}-${config.year}.docx`;
  const input2File = "input/monthly2.docx";

  // 1. Parsing all sources — now with OT/Increment/Bonus/PF columns
  const monthlyData = parseDocx(monthlyFile, {
    nameCol: 0, detectCol: 1,
    otCol: 6, incrementCol: 7, bonusCol: 8, pfDedCol: 9, pfReturnCol: 10,
    basicCol: 12, allowanceCol: 13, tiffinCol: 14,
    deductionCol: 16, netCol: 17
  });
  const bankData = parseDocx(bankFile, { nameCol: 1, detectCol: 0, netCol: 5 });
  const input2Data = parseDocx(input2File, { nameCol: 0, detectCol: 1, netCol: 17 });

  // 2. Audit Table
  log(`${'Staff Name'.padEnd(30)} | ${'Calc'.padStart(8)} | ${'Report'.padStart(8)} | ${'Bank'.padStart(8)} | ${'Input2'.padStart(8)} | Status`);
  log("-".repeat(88));

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
    const i = input2Data[norm];

    if (!m) {
      missingStaff.push(s.name);
      log(`${s.name.substring(0, 30).padEnd(30)} | ${'---'.padStart(8)} | ${'---'.padStart(8)} | ${'---'.padStart(8)} | ${'---'.padStart(8)} | ❌ MISSING`);
      return;
    }

    // Math Check — includes OT, Increment, Bonus, PF
    const calc = m.basic + m.allowance + m.tiffin + m.ot + m.increment + m.bonus - m.pfDeduction + m.pfReturn - m.deduction;
    const mathOk = calc === m.net;
    totalShown += m.net;
    totalCalc += calc;

    // Consistency Check (Cross-File)
    const files = [m.net, b ? b.net : null, i ? i.net : null].filter(v => v !== null);
    const syncOk = files.every(v => v === m.net);

    let status = (mathOk && syncOk) ? "✅ OK" : "❌ ERR";
    
    log(`${m.name.substring(0, 30).padEnd(30)} | ${calc.toLocaleString().padStart(8)} | ${m.net.toLocaleString().padStart(8)} | ${(b ? b.net : '---').toLocaleString().padStart(8)} | ${(i ? i.net : '---').toLocaleString().padStart(8)} | ${status}`);

    if (!mathOk) mathErrors.push({ name: m.name, calc, shown: m.net });
    if (!syncOk) syncErrors.push({ name: m.name, monthly: m.net, bank: b ? b.net : 'N/A', input2: i ? i.net : 'N/A' });

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
      log(`     - ${e.name.padEnd(20)}: Monthly=${e.monthly} | Bank=${e.bank} | Input2=${e.input2}`);
    });
  }

  // 6. Grand Total Reconciliation (only in --final mode)
  if (isFinal) {
    const bankTotal = Object.values(bankData).reduce((s, e) => s + e.net, 0);
    // Identify cash staff: in monthlyData but not in bankData
    let cashTotal = 0;
    Object.keys(monthlyData).forEach(norm => {
      if (!bankData[norm]) cashTotal += monthlyData[norm].net;
    });

    log(`\n[4] GRAND TOTAL RECONCILIATION:`);
    log(`  Bank Total: BDT ${bankTotal.toLocaleString()}`);
    log(`  Cash Total: BDT ${cashTotal.toLocaleString()}`);
    log(`  Combined:   BDT ${(bankTotal + cashTotal).toLocaleString()}`);
    log(`  Monthly-All Grand: BDT ${totalShown.toLocaleString()}`);
    const reconciled = (bankTotal + cashTotal) === totalShown;
    log(`  ${reconciled ? '✅ Grand total reconciled.' : '❌ GRAND TOTAL MISMATCH!'}`);

    // 7. Duplicate detection — check if any employee in both Bank and Cash
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
      log(`\n[5] DUPLICATE DETECTION:`);
      log(`  ⚠️  Duplicate staff entries found: ${duplicates.join(', ')}`);
    }
  }

  // 8. Anomaly detection — compare with previous snapshot
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
      log(`\n[${isFinal ? '6' : '4'}] ANOMALY DETECTION (>20% change vs ${prevMonthName}):`);
      anomalies.forEach(a => {
        log(`  ⚠️  ${a.name}: ${a.prev.toLocaleString()} → ${a.cur.toLocaleString()} (${a.pct}% change)`);
      });
    }
  }

  log(`\n======================================================================`);
  const finalStatus = (missingStaff.length + mathErrors.length + syncErrors.length) === 0 ? "PASSED" : "FAILED";
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
