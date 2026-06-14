const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// ─── HELPERS ───────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
function normalize(name) { return name.toLowerCase().replace(/[^a-z]/g, '').trim(); }

function getLatestReport(prefix) {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) return null;
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith(prefix) && f.endsWith('.docx'));
  if (files.length === 0) return null;
  return files.map(f => ({ name: f, path: path.join(outputDir, f), time: fs.statSync(path.join(outputDir, f)).mtime }))
              .sort((a, b) => b.time - a.time)[0].path;
}

function extractMonthFromFile(filePath) {
  const base = path.basename(filePath);
  const match = base.match(/Monthly-All-(\w+)-(\d{4})/);
  if (match) return { month: match[1], year: match[2] };
  return null;
}

// ─── PARSING ───────────────────────────────────────────────────────────────
function parseMonthlyAll(filePath) {
  console.log(`Parsing ${path.basename(filePath)}...`);
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>').slice(1);
  const payroll = [];

  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 20) return;
    const getCellText = (cell) => {
      if (!cell) return "";
      return (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('').trim();
    };
    const name = getCellText(cells[1]);
    if (!name || name === "Teachers' Name" || name === "Grand Net Payable:") return;

    payroll.push({
      name,
      wdays: getCellText(cells[2]),
      pdays: getCellText(cells[3]),
      leave: getCellText(cells[4]),
      absent: getCellText(cells[5]),
      late: getCellText(cells[6]),
      ot: getCellText(cells[7]),
      increment: getCellText(cells[8]),
      bonus: getCellText(cells[9]),
      pfDeduction: getCellText(cells[10]),
      pfReturn: getCellText(cells[11]),
      basic: getCellText(cells[13]),
      allowance: getCellText(cells[14]),
      tiffin: getCellText(cells[15]),
      totalDed: getCellText(cells[17]),
      net: getCellText(cells[18]),
      details: getCellText(cells[19])
    });
  });
  return payroll;
}

function formatLogs(str, monthName, year) {
  if (!str) return "";

  const expandDates = (datesStr) => {
    if (!datesStr) return "";
    return datesStr.split(/[,;\n]/).map(d => {
      const day = d.trim();
      if (!day) return "";
      const match = day.match(/^(\d{1,2})\s*(\(.*\))?$/);
      if (match) {
        const dNum = match[1].padStart(2, '0');
        const suffix = match[2] ? match[2].trim() : "";
        return `${dNum}-${monthName}-${year}${suffix}`;
      }
      return day;
    }).filter(Boolean).join(', ');
  };

  const extractSection = (text, codes) => {
    const pattern = codes.join('|');
    const regex = new RegExp(`(?:${pattern}):\\s*([\\s\\S]*?)(?=(?:Ab:|Lt:|Lv:|Absent:|Late:|Leave:|\\n\\n|$))`, 'gi');
    let matches = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push(m[1].trim());
    }
    return matches.join(', ');
  };

  let output = [];

  const abContent = extractSection(str, ['Ab', 'Absent']);
  if (abContent) output.push(`❌ ABSENT DATES: ${expandDates(abContent)}`);

  const ltContent = extractSection(str, ['Lt', 'Late']);
  if (ltContent) output.push(`🕒 LATE DATES: ${expandDates(ltContent)}`);

  const lvContent = extractSection(str, ['Lv', 'Leave']);
  if (lvContent) output.push(`🍃 LEAVE DATES: ${expandDates(lvContent)}`);

  if (output.length === 0 && str.trim()) return str.trim();

  return output.join('\n');
}

function getWhatsAppMessage(t, monthName, schoolName, year) {
  const genId = Math.random().toString(36).substring(2, 8).toUpperCase();

  let logContent = formatLogs(t.details, monthName, year);
  const detailStr = logContent ? `\n\n*REMARKS & LOGS*\n${logContent}` : '';

  const otLine = parseInt(t.ot || 0) > 0 ? `\n- Overtime     : BDT ${t.ot}` : '';
  const incrLine = parseInt(t.increment || 0) > 0 ? `\n- Increment    : BDT ${t.increment}` : '';
  const bonusLine = parseInt(t.bonus || 0) > 0 ? `\n- Bonus        : BDT ${t.bonus}` : '';
  const pfLine = parseInt(t.pfDeduction || 0) > 0 ? `\n- PF Deduction : - BDT ${t.pfDeduction}` : '';
  const pfRetLine = parseInt(t.pfReturn || 0) > 0 ? `\n- PF Return    : BDT ${t.pfReturn}` : '';

  return `*${schoolName.toUpperCase()}*
*OFFICIAL SALARY SLIP*

==============================
*REF:* #DIS-${genId}-${monthName.substring(0,3).toUpperCase()}
*NAME:* ${t.name}
*PERIOD:* ${monthName} ${year}
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
✅ Leaves     : ${t.leave} Days
❌ Absent     : ${t.absent} Days
⏳ Lateness   : ${t.late} Entries
${detailStr}

==============================
_This is an automated HR notification._
_Please contact HR for any clarification._`;
}

function saveDataFile(teachers, monthName, schoolName, year) {
  const dataFile = `output/wa-data-${monthName}-${year}.js`;
  const entries = teachers.map(t => {
    const cleanPhone = (t.mob || "").replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : (cleanPhone.length === 10 ? '880' + cleanPhone : cleanPhone);
    const msg = getWhatsAppMessage(t, monthName, schoolName, year).replace(/`/g, '\\`');

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
  console.log(`\n✓ Generated Backup Data: ${dataFile}`);
}

function generateLinks(monthName, schoolName, year) {
  const html = `
    <html>
      <head>
        <title>WhatsApp Links - ${monthName} ${year}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="wa-data-${monthName}-${year}.js"></script>
      </head>
      <body style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding:20px; background:#f4f7f9; max-width:700px; margin:auto;">
        <div style="background:#1F497D; color:white; padding:30px; border-radius:10px; margin-bottom:20px; text-align:center;">
          <h1 id="schoolTitle" style="margin:0; font-size:24px;">${schoolName}</h1>
          <p id="dashboardSub" style="margin:10px 0 0; opacity:0.8;">WhatsApp Salary Slips — ${monthName} ${year}</p>
        </div>
        <div id="linksContainer"></div>
        <script>
          const container = document.getElementById('linksContainer');
          if (!window.waData) {
            container.innerHTML = '<div style="color:red; padding:20px; text-align:center;">Error: wa-data-${monthName}-${year}.js not found.</div>';
          } else {
            window.waData.forEach(t => {
              const msg = encodeURIComponent(t.message);
              const link = \`https://wa.me/\${t.phone}?text=\${msg}\`;
              const row = document.createElement('div');
              row.style = "margin-bottom:15px; padding:15px; border:1px solid #ddd; border-radius:10px; display:flex; justify-content:space-between; align-items:center; background:#fff; box-shadow:0 2px 5px rgba(0,0,0,0.05);";
              row.innerHTML = \`
                <div>
                  <div style="font-size:16px; font-weight:bold; color:#1F497D;">\${t.name}</div>
                  <div style="font-size:13px; color:#666;">\${t.phone || 'No phone'} | Net: BDT \${t.net}</div>
                </div>
                <a href="\${link}" target="_blank" style="background:#25D366; color:white; padding:10px 20px; text-decoration:none; border-radius:30px; font-weight:bold; font-size:14px;">Send WhatsApp</a>
              \`;
              container.appendChild(row);
            });
          }
        </script>
      </body>
    </html>`;
  const file = `output/WhatsApp-Links-${monthName}-${year}.html`;
  fs.writeFileSync(file, html);
  console.log(`✓ Generated Backup Dashboard: ${file}`);
}

// ─── WHATSAPP SENDER ───────────────────────────────────────────────────────
async function sendAll(teachers, monthName, schoolName, year) {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  console.log('Initializing WhatsApp Client...');

  await new Promise((resolve, reject) => {
    client.on('qr', qr => {
      console.log('Scan this QR with your phone once:');
      qrcode.generate(qr, { small: true });
    });
    client.on('ready', () => {
      console.log('Client ready!');
      resolve();
    });
    client.on('auth_failure', (msg) => {
      console.error('Authentication failure:', msg);
      reject(new Error(msg));
    });
    client.initialize();
  });

  console.log(`\nSending ${teachers.length} salary slips for ${monthName} ${year}...\n`);
  let sent = 0, failed = 0;

  for (const t of teachers) {
    const cleanPhone = (t.mob || '').replace(/[^0-9]/g, '');
    const phone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;

    if (!phone || phone.length < 11) {
      console.log(`⚠  Skipped: ${t.name} — no phone`);
      failed++;
      continue;
    }

    const chatId = `${phone}@c.us`;
    const message = getWhatsAppMessage(t, monthName, schoolName, year);

    try {
      const isRegistered = await client.isRegisteredUser(chatId);
      if (!isRegistered) {
        console.log(`⚠  ${t.name} (${phone}) — not on WhatsApp`);
        failed++;
        continue;
      }

      await client.sendMessage(chatId, message);
      console.log(`✓  Sent → ${t.name}`);
      sent++;
    } catch (err) {
      console.log(`✗  Failed → ${t.name}: ${err.message}`);
      failed++;
    }

    await delay(4000);
  }

  console.log(`\nDone. ✓ ${sent} sent  ✗ ${failed} failed`);
  await client.destroy();
}

// ─── LOAD DATA FROM JS FILE ────────────────────────────────────────────────
function loadDataFile(jsPath) {
  const content = fs.readFileSync(jsPath, 'utf-8');

  // Extract monthName and schoolName from window assignments
  const monthMatch = content.match(/window\.monthName\s*=\s*"([^"]+)"/);
  const schoolMatch = content.match(/window\.schoolName\s*=\s*"([^"]+)"/);
  const monthName = monthMatch ? monthMatch[1] : null;
  const schoolName = schoolMatch ? schoolMatch[1] : null;

  // Extract waData array using regex
  const dataMatch = content.match(/window\.waData\s*=\s*\[([\s\S]*)\];/);
  if (!dataMatch) {
    console.error('Error: Could not parse waData from file.');
    process.exit(1);
  }

  // Parse the array entries by splitting on objects
  const entriesStr = dataMatch[1];
  const entries = [];
  const entryRegex = /\{[\s\S]*?\}/g;
  let match;
  while ((match = entryRegex.exec(entriesStr)) !== null) {
    const entry = match[0];
    const nameMatch = entry.match(/name:\s*"([^"]*?)"/);
    const phoneMatch = entry.match(/phone:\s*"([^"]*?)"/);
    const netMatch = entry.match(/net:\s*"([^"]*?)"/);
    const noteMatch = entry.match(/note:\s*"([^"]*?)"/);
    const msgMatch = entry.match(/message:\s*`([\s\S]*?)`/);

    if (nameMatch && phoneMatch) {
      entries.push({
        name: nameMatch[1],
        phone: phoneMatch[1],
        net: netMatch ? netMatch[1] : '',
        note: noteMatch ? noteMatch[1] : '',
        message: msgMatch ? msgMatch[1] : ''
      });
    }
  }

  return { monthName, schoolName, entries };
}

// ─── CLI ARGS ──────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    generate: args.includes('generate'),
    send: args.includes('send'),
    preview: args.includes('--preview')
  };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  const mode = args.generate && !args.send ? 'generate' :
               args.send && !args.generate ? 'send' : 'both';

  console.log('═══════════════════════════════════════════════');
  console.log(`  WhatsApp Salary Slips — ${mode.toUpperCase()} mode`);
  console.log('═══════════════════════════════════════════════\n');

  // ── GENERATE ─────────────────────────────────────────────────────────────
  if (mode === 'generate' || mode === 'both') {
    const reportFile = getLatestReport('Monthly-All-');
    if (!reportFile) {
      console.error("Error: No Monthly-All report found in output/ folder.");
      process.exit(1);
    }

    const fileInfo = extractMonthFromFile(reportFile);
    if (!fileInfo) {
      console.error("Error: Could not detect month/year from filename.");
      process.exit(1);
    }
    const { month: monthName, year } = fileInfo;
    console.log(`Detected: ${monthName} ${year}\n`);

    const payroll = parseMonthlyAll(reportFile);
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

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
          wdays: "0", pdays: "0", leave: "0", absent: "0", late: "0",
          ot: "0", increment: "0", bonus: "0", pfDeduction: "0", pfReturn: "0",
          basic: s.basic || "0", allowance: s.allowance || "0", tiffin: "0",
          totalDed: "0", net: "0", details: "No attendance data found.",
          mob: s.bank?.mob || s.mob || ""
        };
      }
    });

    saveDataFile(teachers, monthName, config.schoolName, year);
    generateLinks(monthName, config.schoolName, year);

    console.log(`\n→ Edit output/wa-data-${monthName}-${year}.js if needed, then run:`);
    console.log(`  node wa3.js send\n`);
  }

  // ── SEND ─────────────────────────────────────────────────────────────────
  if (mode === 'send' || mode === 'both') {
    // Find the latest wa-data file
    const dataFiles = fs.readdirSync('output')
      .filter(f => f.startsWith('wa-data-') && f.endsWith('.js'))
      .sort()
      .reverse();

    if (dataFiles.length === 0) {
      console.error("Error: No wa-data-*.js file found in output/.");
      console.error("Run 'node wa3.js generate' first.");
      process.exit(1);
    }

    const latestDataFile = path.join('output', dataFiles[0]);
    console.log(`Loading data from: ${latestDataFile}\n`);

    const { monthName, schoolName, entries } = loadDataFile(latestDataFile);

    if (!entries || entries.length === 0) {
      console.error("Error: No entries found in data file.");
      process.exit(1);
    }

    console.log(`Loaded ${entries.length} staff entries`);
    console.log(`Month: ${monthName} | School: ${schoolName}\n`);

    if (args.preview) {
      console.log('--- PREVIEW (first 3 messages) ---\n');
      entries.slice(0, 3).forEach(t => {
        console.log(`To: ${t.name} (${t.phone})`);
        console.log(`Message:\n${t.message}\n`);
        console.log('='.repeat(50) + '\n');
      });
      return;
    }

    // Send via WhatsApp Web
    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
          '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'
        ]
      }
    });

    console.log('Initializing WhatsApp Client...');

    await new Promise((resolve, reject) => {
      client.on('qr', qr => {
        console.log('Scan this QR with your phone once:');
        qrcode.generate(qr, { small: true });
      });
      client.on('ready', () => { console.log('Client ready!\n'); resolve(); });
      client.on('auth_failure', (msg) => { reject(new Error(msg)); });
      client.initialize();
    });

    let sent = 0, failed = 0;

    for (const t of entries) {
      const phone = t.phone.replace(/[^0-9]/g, '');
      if (!phone || phone.length < 11) {
        console.log(`⚠  Skipped: ${t.name} — no phone`);
        failed++;
        continue;
      }

      const chatId = `${phone}@c.us`;

      try {
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
          console.log(`⚠  ${t.name} (${phone}) — not on WhatsApp`);
          failed++;
          continue;
        }

        await client.sendMessage(chatId, t.message);
        console.log(`✓  Sent → ${t.name}`);
        sent++;
      } catch (err) {
        console.log(`✗  Failed → ${t.name}: ${err.message}`);
        failed++;
      }

      await delay(4000);
    }

    console.log(`\nDone. ✓ ${sent} sent  ✗ ${failed} failed`);
    await client.destroy();
  }
}

main().catch(console.error);
