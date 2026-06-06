const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { normalize, formatLogs, getMonthName } = require('./utils');

function getLatestReport(prefix) {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) return null;
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith(prefix) && f.endsWith('.docx'));
  if (files.length === 0) return null;
  return files.map(f => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtime }))
              .sort((a, b) => b.time - a.time)[0].name;
}

// ─── PARSING ───────────────────────────────────────────────────────────────
function parseMonthlyAll(filePath) {
  console.log(`Parsing ${filePath}...`);
  const zip = new AdmZip(path.join('output', filePath));
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const payroll = [];
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 19) return; // Support at least 19 columns (including Details at index 18)
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    const name = getCellText(cells[0]);
    if (!name || name === "Teachers' Name" || name === "Grand Net Payable:") return;
    payroll.push({
      name, pdays: getCellText(cells[2]), absent: getCellText(cells[4]), late: getCellText(cells[5]),
      ot: getCellText(cells[6]), increment: getCellText(cells[7]), bonus: getCellText(cells[8]),
      pfDeduction: getCellText(cells[9]), pfReturn: getCellText(cells[10]),
      basic: getCellText(cells[12]), allowance: getCellText(cells[13]), tiffin: getCellText(cells[14]),
      totalDed: getCellText(cells[16]), net: getCellText(cells[17]), details: getCellText(cells[18])
    });
  });
  return payroll;
}



function getWhatsAppMessage(t, monthName, schoolName, config) {
  const genId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Format details to be more readable with full dates
  let logContent = formatLogs(t.details, monthName, config.year);
  const detailStr = logContent ? `\n\n*REMARKS & LOGS*\n${logContent}` : '';

  // Build optional financial lines
  const otLine = parseInt(t.ot || 0) > 0 ? `\n- Overtime     : BDT ${t.ot}` : '';
  const incrLine = parseInt(t.increment || 0) > 0 ? `\n- Increment    : BDT ${t.increment}` : '';
  const bonusLine = parseInt(t.bonus || 0) > 0 ? `\n- Bonus        : BDT ${t.bonus}` : '';
  const pfLine = parseInt(t.pfDeduction || 0) > 0 ? `\n- PF Deduction : - BDT ${t.pfDeduction}` : '';
  const pfRetLine = parseInt(t.pfReturn || 0) > 0 ? `\n- PF Return    : BDT ${t.pfReturn}` : '';

  // Exception note from config
  const staffCfg = config.staff.find(s => normalize(s.name) === normalize(t.name));
  const excNote = staffCfg?.exceptions?.note || '';
  const noteStr = excNote ? `\n\n📌 *NOTE:* ${excNote}` : '';
  
  return `*${schoolName.toUpperCase()}*
*OFFICIAL SALARY SLIP*

==============================
*REF:* #DIS-${genId}-${monthName.substring(0,3).toUpperCase()}
*NAME:* ${t.name}
*PERIOD:* ${monthName} ${config.year}
==============================

*FINANCIAL SUMMARY*
- Base Salary  : BDT ${t.basic}
- Allowances   : BDT ${t.allowance}
- Tiffin Alloc : BDT ${t.tiffin}${otLine}${incrLine}${bonusLine}${pfLine}${pfRetLine}
- Deductions   : - BDT ${t.totalDed}

------------------------------
💰 *NET PAYABLE: BDT ${t.net}*
------------------------------

*ATTENDANCE DETAILS*
✅ Present    : ${t.pdays} Days
❌ Absent     : ${t.absent} Days
⏳ Lateness   : ${t.late} Entries
${detailStr}${noteStr}

==============================
_This is an automated HR notification._
_Please contact HR for any clarification._`;
}

function saveDataFile(teachers, monthName, schoolName) {
  const dataFile = `output/wa-data-${monthName}.js`;
  if (fs.existsSync(dataFile)) {
    console.log(`\n! Data file already exists: ${dataFile}. Skipping overwrite to preserve manual updates.`);
    return;
  }

  const entries = teachers.map(t => {
    const cleanPhone = (t.mob || "").replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : (cleanPhone.length === 10 ? '880' + cleanPhone : cleanPhone);
    const msg = getWhatsAppMessage(t, monthName, schoolName, config).replace(/`/g, '\\`');
    
    return `  {
    name: "${t.name}",
    phone: "${finalPhone}",
    net: "${t.net}",
    note: "",
    message: \`${msg}\`
  }`;
  }).join(',\n');

  const content = `window.monthName = "${monthName}";\nwindow.schoolName = "${schoolName}";\nwindow.waData = [\n${entries}\n];`;
  fs.writeFileSync(dataFile, content);
  console.log(`\n✓ Generated Message Data: ${dataFile}`);
}

function generateLinks(monthName, schoolName) {
  const html = `
    <html>
      <head>
        <title>WhatsApp Links - ${monthName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="wa-data-${monthName}.js"></script>
      </head>
      <body style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding:20px; background:#f4f7f9; max-width:700px; margin:auto;">
        <div style="background:#1F497D; color:white; padding:30px; border-radius:10px; margin-bottom:20px; text-align:center;">
          <h1 id="schoolTitle" style="margin:0; font-size:24px;">${schoolName}</h1>
          <p id="dashboardSub" style="margin:10px 0 0; opacity:0.8;">WhatsApp Notification Dashboard — ${monthName}</p>
        </div>
        <div style="background:#fff3cd; color:#856404; padding:15px; border-radius:8px; margin-bottom:20px; font-size:14px; border:1px solid #ffeeba;">
          <strong>Instructions:</strong> Click the "Send WhatsApp" buttons below to open WhatsApp with the pre-filled salary summary. 
          You can edit the messages and <code>note</code> in <code>wa-data-${monthName}.js</code> and refresh this page.
        </div>
        <div id="linksContainer"></div>
        <div style="margin-top:30px; text-align:center; color:#999; font-size:12px;">
          &copy; ${new Date().getFullYear()} ${schoolName}
        </div>

        <script>
          const container = document.getElementById('linksContainer');
          if (!window.waData) {
            container.innerHTML = '<div style="color:red; padding:20px; text-align:center;">Error: wa-data-${monthName}.js not found or invalid.</div>';
          } else {
            window.waData.forEach(t => {
              const parts = t.message.split('_This is an automated HR notification._');
              const noteStr = t.note ? '\\n\\n*NOTE:* ' + t.note + '\\n' : '\\n';
              const fullMsg = parts[0].trim() + noteStr + '\\n_This is an automated HR notification._' + (parts[1] || '');
              
              const msg = encodeURIComponent(fullMsg);
              const link = \`https://wa.me/\${t.phone}?text=\${msg}\`;
              const noteBadge = t.note ? \`<div style="font-size:12px; color:#d9534f; margin-top:5px;"><strong>Note:</strong> \${t.note}</div>\` : '';
              
              const row = document.createElement('div');
              row.style = "margin-bottom:15px; padding:15px; border:1px solid #ddd; border-radius:10px; display:flex; justify-content:space-between; align-items:center; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.05);";
              row.innerHTML = \`
                <div>
                  <div style="font-size:16px; font-weight:bold; color:#1F497D;">\${t.name} \${t.note ? '📌' : ''}</div>
                  <div style="font-size:13px; color:#666;">\${t.phone || 'No phone'} | Net: BDT \${t.net}</div>
                  \${noteBadge}
                </div>
                <a href="\${link}" target="_blank" style="background:#25D366; color:white; padding:10px 20px; text-decoration:none; border-radius:30px; font-weight:bold; font-size:14px; transition:0.3s; display:inline-block;">Send WhatsApp</a>
              \`;
              container.appendChild(row);
            });
          }
        </script>
      </body>
    </html>`;

  const file = `output/WhatsApp-Links-${monthName}.html`;
  fs.writeFileSync(file, html);
  console.log(`\n✓ Generated Link Dashboard: ${file}`);
  console.log("Tip: Open this file in your browser to send messages.");
}


async function main() {
  const isPreview = process.argv.includes('--preview');
  const reportFile = getLatestReport('Monthly-All-');
  if (!reportFile) {
    console.error("Error: No Monthly-All report found in output/ folder.");
    process.exit(1);
  }

  const payroll = parseMonthlyAll(reportFile);
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const monthName = getMonthName(config);

  // Map EVERYONE from config.staff
  const teachers = config.staff.map(s => {
    const norm = normalize(s.name);
    const p = payroll.find(p => {
      const pNorm = normalize(p.name);
      return pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm);
    });

    if (p) {
      return { ...p, mob: s.bank?.mob || s.mob || "" };
    } else {
      return {
        name: s.name,
        pdays: "0", absent: "0", late: "0",
        ot: "0", increment: "0", bonus: "0", pfDeduction: "0", pfReturn: "0",
        basic: s.basic || "0", allowance: s.allowance || "0", tiffin: "0",
        totalDed: "0", net: "0", details: "No attendance data found.",
        mob: s.bank?.mob || s.mob || ""
      };
    }
  });

  if (isPreview) {
    console.log(`\n--- PREVIEW MODE (first 3 messages) ---\n`);
    teachers.slice(0, 3).forEach(t => {
      console.log(getWhatsAppMessage(t, monthName, config.schoolName, config));
      console.log('\n' + '='.repeat(50) + '\n');
    });
    return;
  }

  saveDataFile(teachers, monthName, config.schoolName);
  generateLinks(monthName, config.schoolName);

  // Staff count summary
  const withPhone = teachers.filter(t => (t.mob || "").replace(/[^0-9]/g, '').length > 0);
  const withoutPhone = teachers.filter(t => (t.mob || "").replace(/[^0-9]/g, '').length === 0);
  console.log(`\n✓ Generated ${teachers.length} messages (${withPhone.length} with phone, ${withoutPhone.length} without phone number)`);
  if (withoutPhone.length) {
    console.log(`⚠️  Staff without phone numbers: ${withoutPhone.map(t => t.name).join(', ')}`);
  }
}

module.exports = { main };
if (require.main === module) main().catch(console.error);
