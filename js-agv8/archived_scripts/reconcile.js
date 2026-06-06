const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function normalize(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

function getVal(str) {
  if (!str) return 0;
  return parseInt(str.replace(/[^0-9]/g, '') || 0);
}

function parseDocx(filePath, config) {
  if (!fs.existsSync(filePath)) return {};
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const data = {};

  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    
    const slNo = getCellText(cells[0] || "");
    const isStaffRow = /^\d+$/.test(slNo);

    if (isStaffRow) {
      const name = getCellText(cells[config.nameCol] || "");
      if (!name || name.includes("Teachers' Name") || name.includes("Employee Name")) return;
      
      const entry = {
        name: name,
        basic: getVal(getCellText(cells[config.basicCol] || "")),
        allowance: config.allowanceCol !== undefined ? getVal(getCellText(cells[config.allowanceCol] || "")) : 0,
        tiffin: getVal(getCellText(cells[config.tiffinCol] || "")),
        deduction: getVal(getCellText(cells[config.deductionCol] || "")),
        net: getVal(getCellText(cells[config.netCol] || ""))
      };
      
      data[normalize(name)] = entry;
    }
  });
  return data;
}

async function reconcile() {
  let output = "";
  const log = (msg) => {
    console.log(msg);
    output += msg + "\n";
  };

  const timestamp = new Date().toLocaleString('en-GB', { hour12: true });

  const monthlyFile = "output/Monthly-All-April-2026.docx";
  if (!fs.existsSync(monthlyFile)) {
    console.error(`Error: ${monthlyFile} not found.`);
    return;
  }

  // Parse using Monthly-All column structure
  const monthlyMap = parseDocx(monthlyFile, { 
    nameCol: 0, 
    basicCol: 12, 
    allowanceCol: 13,
    tiffinCol: 14, 
    deductionCol: 16, 
    netCol: 17 
  });

  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  
  log(`${'Name'.padEnd(30)} ${'Calc'.padStart(10)} ${'Shown'.padStart(10)} ${'Diff'.padStart(10)} Status`);
  log("-".repeat(70));

  let errors = [];
  let totalShown = 0;
  let totalCalc = 0;

  config.staff.forEach(s => {
    const norm = normalize(s.name);
    const m = monthlyMap[norm];
    
    if (!m) return; // Skip if not in report

    const calculated = m.basic + m.allowance + m.tiffin - m.deduction;
    const diff = calculated - m.net;
    
    totalShown += m.net;
    totalCalc += calculated;

    const status = diff === 0 ? "✓" : "❌ ERROR";
    log(`${m.name.substring(0, 30).padEnd(30)} ${calculated.toLocaleString().padStart(10)} ${m.net.toLocaleString().padStart(10)} ${diff.toLocaleString().padStart(10)} ${status}`);
    
    if (diff !== 0) {
      errors.push({ name: m.name, calc: calculated, shown: m.net, diff });
    }
  });

  log("-".repeat(70));
  log(`\n${'Grand Total (Shown):'.padEnd(30)} ${totalShown.toLocaleString().padStart(10)}`);
  log(`${'Grand Total (Calculated):'.padEnd(30)} ${totalCalc.toLocaleString().padStart(10)}`);
  log(`${'Difference:'.padEnd(30)} ${(totalCalc - totalShown).toLocaleString().padStart(10)}`);
  
  log(`\n${'='.repeat(70)}`);
  log(`\nERRORS FOUND (${errors.length}):`);
  errors.forEach(e => {
    const direction = e.diff > 0 ? "UNDERPAID" : "OVERPAID";
    log(`  ❌ ${e.name}: Calculated=${e.calc.toLocaleString()} | Shown=${e.shown.toLocaleString()} | Diff=${e.diff.toLocaleString()} [${direction}]`);
  });

  const reportPath = "output/audit-report.txt";
  fs.writeFileSync(reportPath, output);
  console.log(`\n✓ Audit report saved to: ${reportPath}`);
}

reconcile().catch(console.error);
