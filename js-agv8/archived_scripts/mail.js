const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const nodemailer = require('nodemailer');

function normalize(name) { return name.toLowerCase().replace(/[^a-z]/g, '').trim(); }

function getLatestReport(prefix) {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) return null;
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith(prefix) && f.endsWith('.docx'));
  if (files.length === 0) return null;
  return files.map(f => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtime }))
              .sort((a, b) => b.time - a.time)[0].name;
}

function parseMonthlyAll(filePath) {
  console.log(`Parsing ${filePath}...`);
  const zip = new AdmZip(path.join('output', filePath));
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const payroll = [];
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 18) return;
    const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    const name = getCellText(cells[0]);
    if (!name || name === "Teachers' Name" || name === "Grand Net Payable:") return;
    payroll.push({
      name, pdays: getCellText(cells[2]), absent: getCellText(cells[4]), late: getCellText(cells[5]),
      basic: getCellText(cells[12]), allowance: getCellText(cells[13]), tiffin: getCellText(cells[14]),
      totalDed: getCellText(cells[16]), net: getCellText(cells[17]), details: getCellText(cells[18])
    });
  });
  return payroll;
}

function getEmailHTML(p, monthName, schoolName) {
  const primaryColor = "#1F497D";
  const secondaryColor = "#EEF4FB";
  const detailHTML = p.details ? `
    <div style="margin-top: 15px; padding: 15px; background: #FFF9C4; border-left: 4px solid #FBC02D; font-size: 14px; color: #5D4037;">
      <strong>Attendance Details:</strong><br>
      ${p.details.replace('Ab:', '• Absent Dates: ').replace('Lt:', '<br>• Late Info: ')}
    </div>` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <div style="background: ${primaryColor}; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${schoolName}</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Salary Slip — ${monthName}</p>
      </div>
      <div style="padding: 30px; background: white;">
        <p>Dear <strong>${p.name}</strong>,</p>
        <p>Your salary for ${monthName} has been processed. Below is a summary:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: ${secondaryColor};">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Basic Salary</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.basic}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Allowances</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.allowance}</td>
          </tr>
          <tr style="background: ${secondaryColor};">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tiffin Allowance</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.tiffin}</td>
          </tr>
          <tr style="color: #d9534f;">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Deductions</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">- BDT ${p.totalDed}</td>
          </tr>
          <tr style="background: ${primaryColor}; color: white; font-size: 18px;">
            <td style="padding: 15px;"><strong>Net Payable</strong></td>
            <td style="padding: 15px; text-align: right;"><strong>BDT ${p.net}</strong></td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid ${primaryColor}; font-size: 14px;">
          <strong>Summary:</strong> Present: ${p.pdays} | Absent: ${p.absent} | Late: ${p.late}
        </div>
        ${detailHTML}
        <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">This is an automated message. Please contact HR for queries.</p>
      </div>
    </div>`;
}

async function main() {
  const reportFile = getLatestReport('Monthly-All-');
  if (!reportFile) { console.error("No report found."); process.exit(1); }
  const payroll = parseMonthlyAll(reportFile);
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const monthName = reportFile.match(/Monthly-All-(.*)-\d{4}\.docx/)?.[1] || "Month";
  
  const mode = process.argv[2];
  const testEmail = process.argv[3];

  const transporter = nodemailer.createTransport({
    host: config.notifications.email.host, port: config.notifications.email.port, secure: config.notifications.email.port === 465,
    auth: { user: config.notifications.email.user, pass: config.notifications.email.pass }
  });

  if (mode === '--test' && testEmail) {
    console.log(`\nSending test email to ${testEmail}...`);
    try {
      await transporter.sendMail({ 
        from: `"${config.schoolName} HR" <${config.notifications.email.user}>`, 
        to: testEmail, 
        subject: `Test Salary Slip — ${monthName}`, 
        html: getEmailHTML(payroll[0], monthName, config.schoolName) 
      });
      console.log(`✓ Test email sent successfully!`);
    } catch (err) { console.error(`✗ Test failed:`, err.message); }
    process.exit(0);
  }

  console.log(`\nSending emails...`);
  let sent = 0, failed = 0, skipped = 0;
  for (const p of payroll) {
    if (p.net === "0" || p.net === "") continue;
    const s = config.staff.find(s => normalize(s.name) === normalize(p.name) || normalize(p.name).includes(normalize(s.name)) || normalize(s.name).includes(normalize(p.name)));
    const email = s?.email;
    if (email && email.includes('@')) {
      try {
        await transporter.sendMail({ from: `"${config.schoolName} HR" <${config.notifications.email.user}>`, to: email, subject: `Salary Slip — ${monthName}`, html: getEmailHTML(p, monthName, config.schoolName) });
        console.log(`✓ Sent: ${p.name} (${email})`); sent++;
      } catch (err) { console.error(`✗ Failed for ${p.name}:`, err.message); failed++; }
    } else skipped++;
  }
  console.log(`\nDone: ${sent} Sent, ${failed} Failed, ${skipped} Skipped.`);
}
main().catch(console.error);
