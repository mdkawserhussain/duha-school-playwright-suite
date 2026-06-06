const fs = require('fs');
const AdmZip = require('adm-zip');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, PageOrientation, BorderStyle, WidthType, ShadingType, 
  VerticalAlign, PageBreak 
} = require('docx');
const { normalize, timeToMins, numberToWords, findStaffConfig: findStaffCfg, validateConfig } = require('./utils');

// ─── HELPERS ───────────────────────────────────────────────────────────────
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

// ─── CONFIG & UTILS ────────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
validateConfig(config);
const daysInMonth = new Date(config.year, config.month, 0).getDate();
const AUTO_HOLIDAYS = [];
const calculatedSaturdays = [];
for (let d = 1; d <= daysInMonth; d++) {
  const dayOfWeek = new Date(config.year, config.month - 1, d).getDay();
  if (dayOfWeek === 5) AUTO_HOLIDAYS.push(d); // Only Fridays
  if (dayOfWeek === 6) calculatedSaturdays.push(d);
}
const ALL_HOLIDAYS = [...new Set([...config.holidays, ...AUTO_HOLIDAYS])];
const WORKING_DAYS = daysInMonth - ALL_HOLIDAYS.length;

// ─── DATA LOADING ──────────────────────────────────────────────────────────
const attendanceData = JSON.parse(fs.readFileSync('temp/parsed.json', 'utf8'));

// Map manual edits for lookup
function loadEditedAttendance() {
  console.log("Reading edited temp/parsed.docx...");
  const zip = new AdmZip('temp/parsed.docx');
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const employees = [];
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 8) return;
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    const name = getCellText(cells[0]);
    if (!name || name === "Name") return;

    const lateDetailsText = getCellText(cells[7]) || "";
    // Parse "3(15m), 10(2m)" into [15, 2]
    const lateMins = (lateDetailsText.match(/\((\d+)m?\)/g) || []).map(m => parseInt(m.replace(/[()m]/g, '')));

    employees.push({
      name,
      pdays: parseInt(getCellText(cells[2]) || 0),
      leave: parseInt(getCellText(cells[3]) || 0),
      absent: parseInt(getCellText(cells[4]) || 0),
      late: parseInt(getCellText(cells[6]) || 0),
      over20: lateMins.filter(m => m > 20).length,
      lateMins: lateMins
    });
  });
  return employees;
}

const editedData = loadEditedAttendance();
const manualMap = {};
editedData.forEach(e => {
  manualMap[normalize(e.name)] = e;
});

// ─── PAYROLL LOGIC ─────────────────────────────────────────────────────────

function findStaffConfig(empName) {
  return findStaffCfg(empName, config.staff) || { basic: 0, allowance: 0, bank: { acct: "", mob: "" } };
}

function computePayroll(emp, manual) {
  const staffCfg = findStaffConfig(emp.name);
  const exc = staffCfg.exceptions || {};
  const basic    = staffCfg.basic || 0;
  const genAllow = staffCfg.allowance || 0;
  const perDay   = basic > 0 ? Math.round(basic / 25) : 0;
  
  let autoLate = 0, autoOver20 = 0, autoLateMins = [], excludedDaysPresent = 0;

  (emp.dailyLogs || []).forEach(log => {
    if (config.holidays.includes(log.day)) return;

    let thresholdStr = config.policies.standardThreshold;
    const isSaturday = calculatedSaturdays.includes(log.day);

    if (config.daySpecificThresholds[log.day]) {
      thresholdStr = config.daySpecificThresholds[log.day];
    } else if (isSaturday) {
      thresholdStr = null; // No lateness check for Saturdays
    } else if (staffCfg.threshold) {
      thresholdStr = staffCfg.threshold;
    }

    if (thresholdStr) {
      const thresholdMins = timeToMins(thresholdStr);
      const arrivalMins = timeToMins(log.time);
      const diff = arrivalMins - thresholdMins;

      if (diff > 0) {
        autoLate++;
        autoLateMins.push(diff);
        if (diff > 20) autoOver20++;
      }
    }
    if (config.tiffinExclusionDays.includes(log.day) || calculatedSaturdays.includes(log.day)) excludedDaysPresent++;
  });

  const isOverride = (field) => manual && manual[field] !== (emp.baseline ? emp.baseline[field] : 0);

  let finalLate    = isOverride('late') ? manual.late : autoLate;
  let finalOver20  = isOverride('over20') ? manual.over20 : autoOver20;
  let finalPdays   = isOverride('pdays') ? manual.pdays : (emp.baseline ? emp.baseline.pdays : 0);
  let finalAbsent  = isOverride('absent') ? manual.absent : (emp.baseline ? emp.baseline.absent : 0);
  const finalLeave   = isOverride('leave') ? manual.leave : (emp.baseline ? emp.baseline.leave : 0);
  let finalLateMins = isOverride('late') ? (manual.lateMins || []) : autoLateMins;

  // Apply exception overrides
  if (exc.overridePdays !== null && exc.overridePdays !== undefined) finalPdays = exc.overridePdays;
  if (exc.overrideAbsent !== null && exc.overrideAbsent !== undefined) finalAbsent = exc.overrideAbsent;
  if (exc.skipLateCheck) { finalLate = 0; finalOver20 = 0; finalLateMins = []; }

  const tiffinEligibleDays = Math.max(0, finalPdays - excludedDaysPresent);
  const tiffin   = tiffinEligibleDays * config.policies.tiffinRate;
  const gross    = basic + genAllow;
  let absDed   = finalAbsent * perDay;
  if (exc.skipAbsentDeduction) absDed = 0;
  
  let lateDed = 0;
  if (!exc.skipLateCheck) {
    lateDed += finalOver20 * config.policies.over20Fine;
    if (finalLate >= 3) lateDed += perDay;
    if (finalLate >= 4) {
      const nonOver20 = finalLateMins.filter(m => m <= 20).sort((a,b) => b-a);
      const toFine = nonOver20.slice(Math.max(0, 3 - finalOver20));
      toFine.forEach(m => {
        const rule = config.policies.latePenalties.find(r => m >= r.min);
        if (rule) lateDed += rule.fine;
      });
    }
  }

  // Exception additions
  const ot = exc.ot || 0;
  const increment = exc.increment || 0;
  const bonus = exc.bonus || 0;
  const pfDeduction = exc.pfDeduction || 0;
  const pfReturn = exc.pfReturn || 0;

  const totalDed = absDed + lateDed;
  const net      = Math.max(0, gross - totalDed) + tiffin + ot + increment + bonus - pfDeduction + pfReturn;

  // Track specific dates for notifications
  const absentDates = [];
  const leaveDates = emp.baseline ? (emp.baseline.leaveDates || []) : [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (ALL_HOLIDAYS.includes(d)) continue;
    if (leaveDates.includes(d)) continue;
    if (!(emp.dailyLogs || []).some(log => log.day === d)) {
      absentDates.push(d);
    }
  }

  // Format detailed lateness string: "Day(Mins)"
  const lateInfo = (emp.dailyLogs || []).map(log => {
    if (ALL_HOLIDAYS.includes(log.day)) return null;
    let thresholdStr = config.policies.standardThreshold;
    if (config.daySpecificThresholds[log.day]) thresholdStr = config.daySpecificThresholds[log.day];
    else if (calculatedSaturdays.includes(log.day)) return null;
    else if (staffCfg.threshold) thresholdStr = staffCfg.threshold;

    if (!thresholdStr) return null;
    const diff = timeToMins(log.time) - timeToMins(thresholdStr);
    return diff > 0 ? `${log.day}(${diff}m)` : null;
  }).filter(Boolean);

  // Add Lv: (leave dates) to markings alongside Ab: and Lt:
  const markings = [
    absentDates.length ? `Ab:${absentDates.join(',')}` : '',
    lateInfo.length ? `Lt:${lateInfo.join(',')}` : '',
    leaveDates.length ? `Lv:${leaveDates.join(',')}` : ''
  ].filter(Boolean).join(' ');

  const calculationNote = `${emp.name} -> Basic:${basic} + Allow:${genAllow} + Tiffin:${tiffin}` +
    (ot ? ` + OT:${ot}` : '') + (increment ? ` + Incr:${increment}` : '') + (bonus ? ` + Bonus:${bonus}` : '') +
    ` - AbsDed:${absDed} - LateDed:${lateDed}` +
    (pfDeduction ? ` - PF:${pfDeduction}` : '') + (pfReturn ? ` + PFRet:${pfReturn}` : '') +
    ` = Net:${net}`;

  return { 
    ...emp, ...staffCfg.bank, role: staffCfg.role || "Teacher",
    basic, genAllow, tiffin, gross, perDay, absDed, lateDed, totalDed, net,
    ot, increment, bonus, pfDeduction, pfReturn,
    pdays: finalPdays, absent: finalAbsent, leave: finalLeave, late: finalLate, over20: finalOver20, lateMins: finalLateMins,
    absentDates, leaveDates, lateInfo, markings,
    calculationNote, excNote: exc.note || ""
  };
}

// Map EVERYONE from config.staff (Source of Truth)
const payroll = config.staff.map(s => {
  const norm = normalize(s.name);
  // Find record in attendance data
  const emp = attendanceData.find(a => {
    const aNorm = normalize(a.name);
    return aNorm === norm;
  });

  const manual = manualMap[norm];

  if (emp) {
    return computePayroll(emp, manual);
  } else {
    // Zero-data fallback for staff missing from attendance file
    const basic = s.basic || 0;
    const genAllow = s.allowance || 0;
    const exc = s.exceptions || {};
    const ot = exc.ot || 0;
    const increment = exc.increment || 0;
    const bonus = exc.bonus || 0;
    const pfDeduction = exc.pfDeduction || 0;
    const pfReturn = exc.pfReturn || 0;
    const gross = basic + genAllow;
    const perDay = Math.round(basic / 25);
    const net = gross + ot + increment + bonus - pfDeduction + pfReturn;
    return {
      name: s.name, role: s.role || "Teacher",
      basic, genAllow, tiffin: 0, gross, perDay, absDed: 0, lateDed: 0, totalDed: 0, net,
      ot, increment, bonus, pfDeduction, pfReturn,
      pdays: 0, absent: 0, leave: 0, late: 0, over20: 0, lateMins: [],
      absentDates: [], leaveDates: [], lateInfo: [], markings: "No attendance data found.",
      calculationNote: `${s.name} -> No attendance data found. Basic salary applied.`,
      acct: s.bank?.acct || "", mob: s.bank?.mob || s.mob || "",
      excNote: exc.note || ""
    };
  }
});

// ─── REPORT GENERATION ─────────────────────────────────────────────────────
const monthName = new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });

function buildMonthlyAll() {
  const colW = [2200,530,530,530,530,430,530,530,530,680,680,680,820,680,680,900,700,900,1200,700];
  const totalW = colW.reduce((a,b)=>a+b,0);
  const headers = ["Teachers' Name","W. Days","P. Days","Casual Leave","A. Days","Late","Over Time","Increment","Bonus","PF Deductions","PF Return","Per Day Salary","Basic Salary","Allowances","Tiffin Allow.","Total Salary","Total Ded.","Net Payable","Details","Markings"];

  const hdrRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders, width:{size:colW[i],type:WidthType.DXA}, shading:{fill:"1F497D"}, margins:{top:60,bottom:60,left:60,right:60},
      children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:h,bold:true,color:"FFFFFF",size:15,font:"Arial"})]})]
    }))
  });

  const dataRows = payroll.map((p, idx) => {
    const empWorkingDays = Math.max(WORKING_DAYS, p.pdays);
    return new TableRow({
      children: [p.name, empWorkingDays, p.pdays, p.leave, p.absent, p.late, p.ot || 0, p.increment || 0, p.bonus || 0, p.pfDeduction || 0, p.pfReturn || 0, p.perDay.toLocaleString(), p.basic.toLocaleString(), p.genAllow.toLocaleString(), p.tiffin.toLocaleString(), p.gross.toLocaleString(), p.totalDed.toLocaleString(), p.net.toLocaleString(), p.markings, p.excNote || ""].map((v, i) => new TableCell({
        borders, width:{size:colW[i],type:WidthType.DXA}, shading: idx%2===0?{fill:"EEF4FB"}:undefined, margins:{top:40,bottom:40,left:60,right:60},
        children:[new Paragraph({alignment: i===0?AlignmentType.LEFT:AlignmentType.CENTER, children:[new TextRun({text:String(v),size:15,bold:i===0,font:"Arial"})]})]
      }))
    });
  });

  const totNet = payroll.reduce((s,e)=>s+e.net,0);
  return new Document({ sections:[{
    properties:{page:{size:{width:12240,height:15840,orientation:PageOrientation.LANDSCAPE},margin:{top:720,right:500,bottom:720,left:500}}},
    children:[
      para([bold(config.schoolName,32)],AlignmentType.CENTER,0,60),
      para([bold(`Monthly Report — ${monthName} ${config.year}`,24)],AlignmentType.CENTER,0,80),
      new Table({width:{size:totalW,type:WidthType.DXA},rows:[hdrRow,...dataRows]}),
      para([bold("Grand Net Payable: ",20),bold("BDT "+totNet.toLocaleString(),22)],AlignmentType.RIGHT,200,0),
      para([new PageBreak()]),
      para([bold("Detailed Calculation Breakdowns", 24)], AlignmentType.CENTER, 200, 200),
      ...payroll.map(p => 
        para([run(p.calculationNote, 18)], AlignmentType.LEFT, 40, 40)
      )
    ]
  }]});
}

function buildSalaryReport() {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const sections = [];

  payroll.forEach((p, empIdx) => {
    const titleParas = [
      para([bold(config.schoolName, 28)], AlignmentType.CENTER),
      para([bold("Teacher's Monthly Report", 22)], AlignmentType.CENTER, 40, 40),
      para([bold("Name: ", 20), run(p.name.toUpperCase(), 20), new TextRun({ text: "          ", size: 20 }), bold("Session: ", 20), run(String(config.year), 20)], AlignmentType.LEFT, 0, 80),
    ];
    const headers1 = ["Month","Total Working Days","Days Present","Days Absent","Late","Over Time (hrs)","Increment","Provident Fund Deductions","Provident Fund Return","Per Day Salary (25 WD)","Basic Salary","Allowances","Total Salary","Total Deductions","Net Payable","Markings","Teacher's Signature","Authorities Signature"];
    const colW1 = [900,700,700,700,500,600,600,900,900,800,800,700,800,900,800,700,900,900];
    const totalW1 = colW1.reduce((a,b)=>a+b,0);

    const monthRows = months.map((m, mi) => {
      const isCurrent = mi === config.month - 1;
      const shade = isCurrent ? "FFF2CC" : (mi % 2 === 0 ? "EEF4FB" : null);
      const vals = isCurrent
        ? [m, WORKING_DAYS, p.pdays, p.absent, p.late, 0, 0, 0, 0, p.perDay.toLocaleString(), p.basic.toLocaleString(), (p.genAllow+p.tiffin).toLocaleString(), p.gross.toLocaleString(), p.totalDed.toLocaleString(), p.net.toLocaleString(), p.totalDed > 0 ? `Ded: ${p.totalDed}` : "Full Pay", "", ""]
        : [m,"","","","","","","","","","","","","","","","",""];
      return new TableRow({
        children: vals.map((v, i) => new TableCell({
          borders, width:{size:colW1[i],type:WidthType.DXA}, shading: shade ? {fill:shade} : undefined, margins:{top:40,bottom:40,left:50,right:50},
          children:[new Paragraph({alignment: i===0 ? AlignmentType.LEFT : AlignmentType.CENTER, children:[new TextRun({text:String(v),size:15,bold:isCurrent&&i===0,font:"Arial"})]})]
        }))
      });
    });

    sections.push(
      ...(empIdx === 0 ? [] : [para([new PageBreak()])]),
      ...titleParas,
      new Table({ width:{size:totalW1,type:WidthType.DXA}, rows:[new TableRow({ children: headers1.map((h, i) => new TableCell({ borders, width:{size:colW1[i],type:WidthType.DXA}, shading:{fill:"1F497D"}, margins:{top:50,bottom:50,left:50,right:50}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:h,bold:true,color:"FFFFFF",size:14,font:"Arial"})]})] })) }), ...monthRows] }),
      para([], AlignmentType.LEFT, 200, 0),
      para([run(`Net Payable (${monthName} ${config.year}): `, 18), bold("BDT " + p.net.toLocaleString(), 20)], AlignmentType.LEFT, 0, 0)
    );
  });
  return new Document({ sections:[{ properties: { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, right: 500, bottom: 720, left: 500 } } }, children: sections }]});
}

function buildBankLetter() {
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
        ...cashStaff.map((emp, idx) => new TableRow({ children: [String(idx+1).padStart(2,"0"), emp.name, emp.role, `${emp.pdays}P / ${emp.absent}Ab`, emp.totalDed > 0 ? emp.totalDed.toLocaleString() : "—", emp.net.toLocaleString()].map((v,i)=>new TableCell({ borders, width:{size:colWC[i],type:WidthType.DXA}, shading:idx%2===0?{fill:"EFF5EC"}:undefined, children:[new Paragraph({alignment:i<=1?AlignmentType.LEFT:AlignmentType.CENTER, children:[new TextRun({text:String(v),size:17,font:"Arial"})]})] })) })),
        new TableRow({ children: [new TableCell({columnSpan:5, borders, children:[new Paragraph({alignment:AlignmentType.RIGHT, children:[bold("TOTAL (Cash Disbursement):",18)]})]}), new TableCell({borders, shading:{fill:"FFD700"}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[bold("BDT "+cashTotal.toLocaleString(),20)]})]})] })
      ]}),
      para([], AlignmentType.LEFT, 300, 0),
      para([bold("GRAND TOTAL: BDT " + (bankTotal+cashTotal).toLocaleString(), 24)], AlignmentType.RIGHT)
    ]
  }]});
}

async function main() {
  // Locked config guard
  if (config.locked) {
    console.error("❌ config.json is locked. Unlock it before generating new reports.");
    process.exit(1);
  }

  const isDryRun = process.argv.includes('--dry-run');
  const baseFilename = `-${monthName}-${config.year}.docx`;
  console.log("Generating Final Reports...");
  fs.writeFileSync(`output/Monthly-All${baseFilename}`, await Packer.toBuffer(buildMonthlyAll()));
  fs.writeFileSync(`output/Salary-Report${baseFilename}`, await Packer.toBuffer(buildSalaryReport()));
  fs.writeFileSync(`output/Bank-Transfer${baseFilename}`, await Packer.toBuffer(buildBankLetter()));
  console.log(`✓ Reports generated in output/ for ${monthName} ${config.year}`);

  // CSV export for bank transfer
  const bankStaffCSV = payroll.filter(e => e.acct).sort((a,b) => b.net - a.net);
  const csvLines = ["SL,Name,Branch,Account,Mobile,Salary"];
  bankStaffCSV.forEach((e, i) => csvLines.push(`${i+1},"${e.name}","Halishahar","${e.acct}","${e.mob}",${e.net}`));
  fs.writeFileSync(`output/Bank-Transfer-${monthName}-${config.year}.csv`, csvLines.join('\n'));
  console.log(`✓ CSV exported: output/Bank-Transfer-${monthName}-${config.year}.csv`);
  
  // Save final results for notifications
  if (!fs.existsSync('temp')) fs.mkdirSync('temp');
  fs.writeFileSync('temp/final_payroll.json', JSON.stringify(payroll, null, 2));
  console.log('✓ Final payroll data saved to temp/final_payroll.json');

  if (isDryRun) {
    console.log("\nDRY RUN — Bank/Cash split:");
    const bStaff = payroll.filter(e => e.acct);
    const cStaff = payroll.filter(e => !e.acct);
    bStaff.forEach(e => console.log(`  [BANK] ${e.name.padEnd(30)} BDT ${e.net}`));
    cStaff.forEach(e => console.log(`  [CASH] ${e.name.padEnd(30)} BDT ${e.net}`));
    console.log(`  Bank Total: BDT ${bStaff.reduce((s,e) => s+e.net, 0).toLocaleString()}`);
    console.log(`  Cash Total: BDT ${cStaff.reduce((s,e) => s+e.net, 0).toLocaleString()}`);
  }

  console.log("\nSummary:");
  payroll.filter(e => e.net > 0).forEach(e => console.log(`${e.name.padEnd(25)} | Net: ${e.net}`));
}

module.exports = { main };
if (require.main === module) main().catch(console.error);
