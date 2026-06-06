const fs = require('fs');
const AdmZip = require('adm-zip');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, BorderStyle, WidthType
} = require('docx');
const { normalize, numberToWords, findStaffConfig: findStaffCfg, validateConfig } = require('./utils');

// ─── CONFIG & UTILS ────────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
validateConfig(config);

const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };

function bold(text, size = 22) { return new TextRun({ text, bold: true, size, font: "Arial" }); }
function run(text, size = 22) { return new TextRun({ text, size, font: "Arial" }); }
function para(children, align = AlignmentType.LEFT, spaceBefore = 0, spaceAfter = 0) {
  return new Paragraph({
    alignment: align,
    spacing: { before: spaceBefore, after: spaceAfter },
    children: Array.isArray(children) ? children : [children]
  });
}

function findStaffConfig(empName) {
  return findStaffCfg(empName, config.staff) || { basic: 0, allowance: 0, bank: { acct: "", mob: "" } };
}

// ─── PARSING LOGIC (Parse Monthly-All style docx) ───────────────────────────
function parseMonthlyAll(filePath) {
  console.log(`Parsing ${filePath}...`);
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  
  const rows = xml.split('</w:tr>');
  const employees = [];
  
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    // Monthly All header has 20 columns. Data rows should have at least that.
    if (cells.length < 18) return;

    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    
    const name = getCellText(cells[0]);
    if (!name || name.includes("Teachers' Name") || name.toLowerCase().includes("grand net payable")) return;

    const pdays = parseInt(getCellText(cells[2]).replace(/,/g, '') || 0);
    const absent = parseInt(getCellText(cells[4]).replace(/,/g, '') || 0);
    const netStr = getCellText(cells[17]).replace(/,/g, '');
    const net = parseInt(netStr || 0);


    const staffCfg = findStaffConfig(name);

    employees.push({
      name,
      pdays,
      absent,
      net,
      role: staffCfg.role || "Teacher",
      acct: staffCfg.bank ? staffCfg.bank.acct : "",
      mob: staffCfg.bank ? staffCfg.bank.mob : ""
    });
  });
  
  return employees;
}

// ─── BANK LETTER LOGIC ─────────────────────────────────────────────────────


function buildBankLetter(payroll) {
  const monthName = new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });
  const bankStaff = payroll.filter(e => e.acct).sort((a,b) => b.net - a.net);
  const cashStaff = payroll.filter(e => !e.acct);
  const bankTotal = bankStaff.reduce((s, e) => s + e.net, 0);
  const cashTotal = cashStaff.reduce((s, e) => s + e.net, 0);

  const colWB = [480, 2200, 900, 1700, 1400, 900], colWC = [480, 2800, 1200, 1200, 1200, 900];
  return new Document({ sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},
    children:[
      para([bold("To", 22)], AlignmentType.LEFT, 0, 80),
      para([bold("The Branch Manager, Al Arafah Islami Bank, Halishahar Branch", 22)]),
      para([bold(`Subject: Employee Salary Transfer Letter — ${monthName} ${config.year}`, 22)], AlignmentType.LEFT, 0, 160),
      para([run(`Dear Sir, We request you to transfer the salaries of the following employees for ${monthName} ${config.year}.`, 22)], AlignmentType.LEFT, 0, 80),
      para([bold("Account Number: 0951220001653", 22)], AlignmentType.LEFT, 0, 200),
      para([bold("Group A — Bank Transfer", 20)], AlignmentType.LEFT, 0, 80), 
      new Table({ width:{size:colWB.reduce((a,b)=>a+b,0),type:WidthType.DXA}, rows:[
        new TableRow({ children: ["SL No","Employee Name","Branch","Account No","Mobile Number","Salary"].map((h,i)=>new TableCell({ borders, width:{size:colWB[i],type:WidthType.DXA}, shading:{fill:"1F497D"}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:h,bold:true,color:"FFFFFF",size:17,font:"Arial"})]})] })) }),
        ...bankStaff.map((emp, idx) => new TableRow({ children: [String(idx+1).padStart(2,"0"), emp.name.toUpperCase(), "Halishahar", emp.acct, emp.mob, emp.net.toLocaleString()].map((v,i)=>new TableCell({ borders, width:{size:colWB[i],type:WidthType.DXA}, shading:idx%2===0?{fill:"EEF4FB"}:undefined, children:[new Paragraph({alignment:i===1?AlignmentType.LEFT:AlignmentType.CENTER, children:[new TextRun({text:String(v),size:17,font:"Arial"})]})] })) })),
        new TableRow({ children: [new TableCell({columnSpan:4, borders, children:[new Paragraph({alignment:AlignmentType.RIGHT, children:[bold("TOTAL (Bank Transfer):",18)]})]}), new TableCell({columnSpan:2, borders, shading:{fill:"FFD700"}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[bold("BDT "+bankTotal.toLocaleString(),20)]})]})] })
      ]}),
      para([run("In Words: ", 20), bold(numberToWords(bankTotal) + " Taka Only", 20)], AlignmentType.LEFT, 80, 200),
      para([bold("Group B — Cash Disbursement", 20)], AlignmentType.LEFT, 0, 80),
      new Table({ width:{size:colWC.reduce((a,b)=>a+b,0),type:WidthType.DXA}, rows:[
        new TableRow({ children: ["SL","Employee Name","Role","Attendance","Deductions","Cash Amount"].map((h,i)=>new TableCell({ borders, width:{size:colWC[i],type:WidthType.DXA}, shading:{fill:"2E5A1C"}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:h,bold:true,color:"FFFFFF",size:17,font:"Arial"})]})] })) }),
        ...cashStaff.map((emp, idx) => new TableRow({ children: [String(idx+1).padStart(2,"0"), emp.name, emp.role, `${emp.pdays}P / ${emp.absent}Ab`, "—", emp.net.toLocaleString()].map((v,i)=>new TableCell({ borders, width:{size:colWC[i],type:WidthType.DXA}, shading:idx%2===0?{fill:"EFF5EC"}:undefined, children:[new Paragraph({alignment:i<=1?AlignmentType.LEFT:AlignmentType.CENTER, children:[new TextRun({text:String(v),size:17,font:"Arial"})]})] })) })),
        new TableRow({ children: [new TableCell({columnSpan:5, borders, children:[new Paragraph({alignment:AlignmentType.RIGHT, children:[bold("TOTAL (Cash Disbursement):",18)]})]}), new TableCell({borders, shading:{fill:"FFD700"}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[bold("BDT "+cashTotal.toLocaleString(),20)]})]})] })
      ]}),
      para([], AlignmentType.LEFT, 300, 0),
      para([bold("GRAND TOTAL: BDT " + (bankTotal+cashTotal).toLocaleString(), 24)], AlignmentType.RIGHT)
    ]
  }]});
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const inputFile = 'input/monthly2.docx';
  const outputFile = 'output/bank2.docx';
  const isDryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found.`);
    process.exit(1);
  }

  try {
    const parsedPayroll = parseMonthlyAll(inputFile);
    
    // Map EVERYONE from config.staff (Source of Truth)
    const payroll = config.staff.map(s => {
      const norm = normalize(s.name);
      // Find record in parsed attendance data
      const p = parsedPayroll.find(a => {
        const aNorm = normalize(a.name);
        return aNorm === norm || aNorm.includes(norm) || norm.includes(aNorm);
      });

      if (p) {
        return { ...p, role: s.role || "Teacher" };
      } else {
        // Zero-data fallback
        return {
          name: s.name,
          pdays: 0, absent: 0, net: 0, totalDed: 0,
          role: s.role || "Teacher",
          acct: s.bank?.acct || "",
          mob: s.bank?.mob || s.mob || ""
        };
      }
    });

    const bankStaff = payroll.filter(e => e.acct).sort((a,b) => b.net - a.net);
    const cashStaff = payroll.filter(e => !e.acct);
    const bankTotal = bankStaff.reduce((s, e) => s + e.net, 0);
    const cashTotal = cashStaff.reduce((s, e) => s + e.net, 0);

    if (isDryRun) {
      console.log("DRY RUN — Bank/Cash split:");
      bankStaff.forEach(e => console.log(`  [BANK] ${e.name.padEnd(30)} BDT ${e.net}`));
      cashStaff.forEach(e => console.log(`  [CASH] ${e.name.padEnd(30)} BDT ${e.net}`));
      console.log(`  Bank Total: BDT ${bankTotal.toLocaleString()}`);
      console.log(`  Cash Total: BDT ${cashTotal.toLocaleString()}`);
      return;
    }

    console.log("Generating Bank Transfer Document...");
    const doc = buildBankLetter(payroll);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputFile, buffer);
    console.log(`✓ Successfully generated ${outputFile}`);

    // CSV export
    const monthName = new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });
    const csvLines = ["SL,Name,Branch,Account,Mobile,Salary"];
    bankStaff.forEach((e, i) => csvLines.push(`${i+1},"${e.name}","Halishahar","${e.acct}","${e.mob}",${e.net}`));
    const csvPath = `output/Bank-Transfer-monthly2-${monthName}-${config.year}.csv`;
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`✓ CSV exported: ${csvPath}`);
    
    console.log("\nSummary:");
    payroll.forEach(e => console.log(`${e.name.padEnd(25)} | Net: ${e.net}`));
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
  }
}

module.exports = { main };
if (require.main === module) main();

