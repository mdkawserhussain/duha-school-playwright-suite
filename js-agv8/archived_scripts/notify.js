const fs = require('fs');
const nodemailer = require('nodemailer');

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
if (!fs.existsSync('temp/final_payroll.json')) {
  console.error("Error: temp/final_payroll.json not found. Run all.js first.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const payroll = JSON.parse(fs.readFileSync('temp/final_payroll.json', 'utf8'));
const monthName = new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });

// ─── EMAIL SETUP ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: config.notifications.email.host,
  port: config.notifications.email.port,
  secure: config.notifications.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.notifications.email.user,
    pass: config.notifications.email.pass,
  },
});

// ─── TEMPLATES ──────────────────────────────────────────────────────────────
function getEmailHTML(p) {
  const primaryColor = "#1F497D";
  const secondaryColor = "#EEF4FB";
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <div style="background: ${primaryColor}; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${config.schoolName}</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Salary Slip — ${monthName} ${config.year}</p>
      </div>
      
      <div style="padding: 30px; background: white;">
        <p>Dear <strong>${p.name}</strong>,</p>
        <p>Your salary for ${monthName} ${config.year} has been processed. Below is a summary of your earnings and deductions:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: ${secondaryColor};">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Basic Salary</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.basic.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Allowances</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.genAllow.toLocaleString()}</td>
          </tr>
          <tr style="background: ${secondaryColor};">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tiffin Allowance</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">BDT ${p.tiffin.toLocaleString()}</td>
          </tr>
          <tr style="color: #d9534f;">
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Deductions</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">- BDT ${p.totalDed.toLocaleString()}</td>
          </tr>
          <tr style="background: ${primaryColor}; color: white; font-size: 18px;">
            <td style="padding: 15px;"><strong>Net Payable</strong></td>
            <td style="padding: 15px; text-align: right;"><strong>BDT ${p.net.toLocaleString()}</strong></td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid ${primaryColor}; font-size: 14px;">
          <strong>Attendance Summary:</strong><br>
          Present: ${p.pdays} days | Absent: ${p.absent} days | Late: ${p.late} times
        </div>
        
        <p style="margin-top: 30px; font-size: 13px; color: #777; text-align: center;">
          This is an automatically generated email. If you have any queries, please contact the HR department.
        </p>
      </div>
      
      <div style="background: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #999;">
        &copy; ${config.year} ${config.schoolName} | Confidential
      </div>
    </div>
  `;
}

function getWhatsAppMessage(p) {
  return `*${config.schoolName} - Salary Summary*\n` +
         `--------------------------\n` +
         `Dear *${p.name}*,\n` +
         `Your salary for *${monthName} ${config.year}* is ready.\n\n` +
         `💰 *Net Payable: BDT ${p.net.toLocaleString()}*\n` +
         `--------------------------\n` +
         `• Basic: BDT ${p.basic.toLocaleString()}\n` +
         `• Allowances: BDT ${p.genAllow.toLocaleString()}\n` +
         `• Tiffin: BDT ${p.tiffin.toLocaleString()}\n` +
         `• Deductions: - BDT ${p.totalDed.toLocaleString()}\n\n` +
         `📊 *Attendance:* ${p.pdays}P / ${p.absent}Ab / ${p.late}L\n\n` +
         `_Please contact HR for details._`;
}

// ─── EXECUTION ──────────────────────────────────────────────────────────────
async function sendNotifications() {
  console.log(`Starting notifications for ${monthName} ${config.year}...\n`);
  
  let successEmail = 0;
  let failedEmail = 0;
  let skippedEmail = 0;
  
  const waLinks = [];

  for (const p of payroll) {
    if (p.net <= 0) continue;

    // 1. Email
    if (p.email && p.email.includes('@')) {
      try {
        await transporter.sendMail({
          from: `"${config.schoolName} HR" <${config.notifications.email.user}>`,
          to: p.email,
          subject: `Salary Slip — ${monthName} ${config.year}`,
          html: getEmailHTML(p),
        });
        console.log(`✓ Email sent to: ${p.name} (${p.email})`);
        successEmail++;
      } catch (err) {
        console.error(`✗ Failed to send email to ${p.name}:`, err.message);
        failedEmail++;
      }
    } else {
      skippedEmail++;
    }

    // 2. WhatsApp
    const phone = p.mob || p.phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(getWhatsAppMessage(p));
      const waLink = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      waLinks.push({ name: p.name, link: waLink });
    }
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  console.log(`\n--- Notification Summary ---`);
  console.log(`Emails: ${successEmail} Sent, ${failedEmail} Failed, ${skippedEmail} Skipped (no email)`);
  
  if (waLinks.length > 0) {
    const waLogFile = `output/WhatsApp-Links-${monthName}-${config.year}.html`;
    const htmlLinks = waLinks.map(w => 
      `<div style="margin-bottom:10px;">
        <strong style="display:inline-block; width:200px;">${w.name}:</strong> 
        <a href="${w.link}" target="_blank" style="background:#25D366; color:white; padding:5px 10px; text-decoration:none; border-radius:5px;">Send WhatsApp</a>
      </div>`
    ).join('');
    
    const waHTML = `
      <html>
        <body style="font-family:sans-serif; padding:20px;">
          <h2>WhatsApp Notification Links — ${monthName} ${config.year}</h2>
          <p>Click the buttons below to send the pre-filled salary summaries via WhatsApp Web/Desktop.</p>
          <hr>
          ${htmlLinks}
        </body>
      </html>
    `;
    
    fs.writeFileSync(waLogFile, waHTML);
    console.log(`✓ WhatsApp links generated: ${waLogFile}`);
  }
}

sendNotifications().catch(console.error);
