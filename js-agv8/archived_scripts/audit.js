const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function normalize(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

// Fuzzy match: check if one normalized name is contained within the other
function isMatch(n1, n2) {
  if (!n1 || !n2) return false;
  return n1.includes(n2) || n2.includes(n1);
}

function parseDocxNames(filePath, nameColumnIndex) {
  if (!fs.existsSync(filePath)) return [];
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const names = new Set();
  
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length <= nameColumnIndex) return;
    
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    
    // Check for SL No (usually first column) to confirm it's a staff row
    const slNo = getCellText(cells[0]);
    const isStaffRow = /^\d+$/.test(slNo) || (nameColumnIndex === 0 && slNo.length > 3);
    
    if (isStaffRow) {
      const name = getCellText(cells[nameColumnIndex]);
      const blacklist = ["SL No", "Employee Name", "Teachers' Name", "Grand Net Payable:", "Branch", "Account No", "Mobile Number", "Salary", "Total", "Sub Total:", "Cash Disbursement"];
      if (name && !blacklist.some(b => name.includes(b))) {
        names.add(name);
      }
    }
  });
  
  return Array.from(names);
}

async function audit() {
  console.log("--- STAFF LIST AUDIT REPORT (REFINED) ---\n");
  
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const configStaff = config.staff.map(s => ({ original: s.name, norm: normalize(s.name), hasBank: !!s.bank?.acct }));
  
  // Monthly-All (Name is index 0)
  const monthlyFile = path.join('output', 'Monthly-All-April-2026.docx');
  const monthlyNames = parseDocxNames(monthlyFile, 0);
  const monthlyNorm = monthlyNames.map(n => ({ original: n, norm: normalize(n) }));
  
  // Bank-Transfer (Name is index 1)
  const bankFile = path.join('output', 'Bank-Transfer-April-2026.docx');
  const bankNames = parseDocxNames(bankFile, 1);
  const bankNorm = bankNames.map(n => ({ original: n, norm: normalize(n) }));

  console.log(`Config Staff Count: ${configStaff.length}`);
  console.log(`Monthly Report Staff: ${monthlyNames.length}`);
  console.log(`Bank Transfer Staff: ${bankNames.length}\n`);

  // --- CHECK 1: Missing from Monthly Report ---
  console.log(">> CHECKING MONTHLY REPORT MISMATCHES...");
  const missingFromMonthly = configStaff.filter(cs => !monthlyNorm.some(mn => isMatch(mn.norm, cs.norm)));
  if (missingFromMonthly.length > 0) {
    console.log("❌ MISSING FROM MONTHLY REPORT:");
    missingFromMonthly.forEach(s => console.log(` - ${s.original}`));
  } else {
    console.log("✅ All config staff are present in Monthly Report.");
  }
  console.log("");

  // --- CHECK 2: Missing from Bank Transfer ---
  console.log(">> CHECKING BANK TRANSFER MISMATCHES...");
  const bankStaffConfig = configStaff.filter(s => s.hasBank);
  const missingFromBank = bankStaffConfig.filter(cs => !bankNorm.some(bn => isMatch(bn.norm, cs.norm)));
  if (missingFromBank.length > 0) {
    console.log("❌ ELIGIBLE BANK STAFF MISSING FROM BANK FILE:");
    missingFromBank.forEach(s => console.log(` - ${s.original}`));
  } else {
    console.log("✅ All eligible bank staff are present in Bank Transfer file.");
  }
  console.log("");

  // --- CHECK 3: Extra staff in Reports (Potential Name Variations) ---
  console.log(">> CHECKING FOR EXTRA NAMES (POTENTIAL VARIATIONS)...");
  const extraInMonthly = monthlyNorm.filter(mn => !configStaff.some(cs => isMatch(cs.norm, mn.norm)));
  if (extraInMonthly.length > 0) {
    console.log("⚠️ NAMES IN MONTHLY REPORT NOT MATCHED TO CONFIG:");
    extraInMonthly.forEach(s => console.log(` - ${s.original}`));
  } else {
    console.log("✅ No extra names found in Monthly Report.");
  }
  console.log("");

  const extraInBank = bankNorm.filter(bn => !configStaff.some(cs => isMatch(cs.norm, bn.norm)));
  if (extraInBank.length > 0) {
    console.log("⚠️ NAMES IN BANK TRANSFER NOT MATCHED TO CONFIG:");
    extraInBank.forEach(s => console.log(` - ${s.original}`));
  } else {
    console.log("✅ No extra names found in Bank Transfer.");
  }

  console.log("\n--- END OF AUDIT ---");
}

audit().catch(console.error);

