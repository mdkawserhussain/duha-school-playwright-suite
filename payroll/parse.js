const fs = require('fs');
const AdmZip = require('adm-zip');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ShadingType } = require('docx');
const { normalize, timeToMins, findStaffConfig: findStaffCfg, validateConfig, getSaturdays } = require('./utils');

// ─── DATA LOADING ──────────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
validateConfig(config);

// ─── UTILS ────────────────────────────────────────────────────────────────
const daysInMonth = new Date(config.year, config.month, 0).getDate();
const AUTO_HOLIDAYS = [];
for (let d = 1; d <= daysInMonth; d++) {
  const dayOfWeek = new Date(config.year, config.month - 1, d).getDay();
  if (dayOfWeek === 5) AUTO_HOLIDAYS.push(d); // Only Fridays
}
const ALL_HOLIDAYS = [...new Set([...config.holidays, ...AUTO_HOLIDAYS])];
const WORKING_DAYS = daysInMonth - ALL_HOLIDAYS.length;

// ─── HELPERS ───────────────────────────────────────────────────────────────
const calculatedSaturdays = getSaturdays(config.year, config.month);

function findStaffConfig(empName) {
  return findStaffCfg(empName, config.staff) || { basic: 0, allowance: 0, bank: { acct: "", mob: "" } };
}

/**
 * Parses att.docx XML to extract attendance and timestamps
 */
function parseAttendance(filePath) {
  console.log(`Parsing ${filePath}...`);
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  
  const rows = xml.split('</w:tr>');
  const employees = [];
  
  const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');

  // Find dailyColsCount dynamically from the row containing dates
  let dailyColsCount = 31; // fallback
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].split('</w:tc>');
    if (cells.length > 5) {
      const texts = cells.map(getCellText);
      const dayCells = texts.slice(2).filter(t => /^\d{2}[A-Za-z]{3}\s*\d{2}$/.test(t.replace(/\s+/g, '')));
      if (dayCells.length > 0) {
        dailyColsCount = dayCells.length;
        console.log(`Detected daily columns count: ${dailyColsCount}`);
        break;
      }
    }
  }

  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 2 + dailyColsCount + 5) return;

    // Get Name
    const nameMatch = cells[1].match(/<w:t>([^<]+)<\/w:t>/g);
    if (!nameMatch) return;
    const rawName = nameMatch.map(m => m.replace(/<\/?w:t>/g, '')).join(' ');
    if (rawName.includes('Name') || !rawName.trim()) return;

    const cleanedName = rawName.replace(/\(.*\)/, '').trim();
    const staffCfg = findStaffConfig(cleanedName);

    // Get Summaries using dynamic column offsets
    const rawAbsent = parseInt(getCellText(cells[2 + dailyColsCount + 3]) || 0);
    const leave  = parseInt(getCellText(cells[2 + dailyColsCount + 2]) || 0);
    const pdays  = parseInt(getCellText(cells[2 + dailyColsCount + 1]) || 0);

    // Extract daily timestamps and identify absent/late details
    const dailyLogs = [];
    const daysInMonth = new Date(config.year, config.month, 0).getDate();
    const presentDays = new Set();
    const leaveDays = new Set();
    const lateDetails = [];
    let lateCount = 0;
    let over20Count = 0;
    let lateMinsList = [];

    const calculatedSaturdays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(config.year, config.month - 1, d).getDay() === 6) calculatedSaturdays.push(d);
    }

    for (let i = 2; i < 2 + dailyColsCount; i++) {
      const day = i - 1;
      if (day > daysInMonth) break;

      const cellText = getCellText(cells[i]).toLowerCase();
      if (cellText.includes('le')) {
        leaveDays.add(day);
        continue;
      }
      
      const timeMatch = cellText.match(/(\d{1,2}:\d{2})(?:\s*([ap]m))?/i);
      const hasPr = cellText.includes('pr');

      if (timeMatch || hasPr) {
        presentDays.add(day);
        if (timeMatch) {
          let timeStr = timeMatch[1];
          let period = timeMatch[2] || 'AM'; 
          const logTime = `${timeStr} ${period.toUpperCase()}`;
          dailyLogs.push({ day, time: logTime });

          // Skip Holidays for lateness
          if (ALL_HOLIDAYS.includes(day)) continue;

          // Determine Threshold
          let thresholdStr = config.policies.standardTiming;
          const isSaturday = calculatedSaturdays.includes(day);

          if (config.daySpecificTimings[day]) {
            thresholdStr = config.daySpecificTimings[day];
          } else if (isSaturday) {
            thresholdStr = null; 
          } else if (staffCfg.customTiming) {
            thresholdStr = staffCfg.customTiming;
          }

          if (thresholdStr) {
            const thresholdMins = timeToMins(thresholdStr);
            const arrivalMins = timeToMins(logTime);
            const diff = arrivalMins - thresholdMins;

            if (diff > 0) {
              lateCount++;
              lateMinsList.push(diff);
              lateDetails.push(`${day}(${diff}m)`);
              if (diff > 20) over20Count++;
            }
          }
        }
      }
    }

    // Filter out holidays and Saturdays from dailyLogs (not counted)
    const filteredLogs = dailyLogs.filter(log => !ALL_HOLIDAYS.includes(log.day) && !calculatedSaturdays.includes(log.day));

    const absentDates = [];
    const leaveDates = [];
    for (let d = 1; d <= dailyColsCount; d++) {
      if (leaveDays.has(d)) {
        leaveDates.push(d);
      } else if (!presentDays.has(d) && !ALL_HOLIDAYS.includes(d) && !(config.noAbsentDays || []).includes(d)) {
        absentDates.push(d);
      }
    }

    // Apply exception overrides from config
    const exc = staffCfg.exceptions || {};
    let finalPdays = presentDays.size;
    let finalAbsent = absentDates.length;
    let finalLate = lateCount;
    let finalOver20 = over20Count;
    let finalLateMins = lateMinsList;
    let finalLateDetails = lateDetails.join(', ');

    if (exc.overridePdays !== null && exc.overridePdays !== undefined) finalPdays = exc.overridePdays;
    if (exc.overrideAbsent !== null && exc.overrideAbsent !== undefined) finalAbsent = exc.overrideAbsent;
    if (exc.skipLateCheck) { finalLate = 0; finalOver20 = 0; finalLateMins = []; finalLateDetails = ''; }

    employees.push({
      name: staffCfg.name || cleanedName,
      role: staffCfg.role || "Teacher",
      dailyLogs: filteredLogs,
      dailyColsCount,
      baseline: {
        pdays: finalPdays,
        leave: leaveDates.length,
        absent: finalAbsent,
        absentDates: absentDates,
        leaveDates: leaveDates,
        late: finalLate,
        over20: finalOver20,
        lateMins: finalLateMins,
        lateDetails: finalLateDetails
      }
    });
  });
  
  return employees;
}

/**
 * Saves parsed data to a simple DOCX for review and manual editing
 */
async function saveToDocx(data, outputPath) {
  const headers = ["Name", "Role", "P", "L", "Ab", "Absent Dates", "Late", "Late Details (Day:Mins)"];
  
  const rows = [
    new TableRow({
      children: headers.map(h => new TableCell({
        shading: { fill: "D6E4F7" },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })]
      }))
    }),
    ...data.map(emp => new TableRow({
      children: [
        emp.name, 
        emp.role, 
        emp.baseline.pdays, 
        emp.baseline.leave, 
        emp.baseline.absent, 
        emp.baseline.absentDates.join(', '),
        emp.baseline.late, 
        emp.baseline.lateDetails
      ].map(v => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })] })]
      }))
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: `Attendance Data - ${new Date(config.year, config.month-1).toLocaleString('en-US', {month:'long'})} ${config.year}`, heading: "Heading1" }),
        new Paragraph({ text: "Instructions: The table below is pre-filled with auto-calculated data based on config.json (holidays, thresholds, etc.). You can edit these values. Save this file before running all.js.", spacing: { after: 200 } }),
        new Table({ 
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows 
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Created editable doc: ${outputPath}`);
}

async function main() {
  try {
    if (!fs.existsSync('temp')) fs.mkdirSync('temp');
    const data = parseAttendance('input/att.docx');
    
    // Save as JSON for Phase 2
    fs.writeFileSync('temp/parsed.json', JSON.stringify(data, null, 2));
    console.log('✓ Saved data to temp/parsed.json');

    // Save as DOCX for review
    await saveToDocx(data, 'temp/parsed.docx');

    // Unmatched staff warnings
    const parsedNames = data.map(e => normalize(e.name));
    const configNames = config.staff.map(s => normalize(s.name));
    const unmatchedInAtt = data.filter(e => !configNames.some(cn => cn === normalize(e.name) || cn.includes(normalize(e.name)) || normalize(e.name).includes(cn)));
    const missingFromAtt = config.staff.filter(s => !parsedNames.some(pn => pn === normalize(s.name) || pn.includes(normalize(s.name)) || normalize(s.name).includes(pn)));

    if (unmatchedInAtt.length) {
      unmatchedInAtt.forEach(e => console.log(`⚠️  In att.docx but NOT in config: "${e.name}" (check spelling)`));
    }
    if (missingFromAtt.length) {
      missingFromAtt.forEach(s => console.log(`⚠️  In config but NOT in att.docx: "${s.name}" (no attendance data)`));
    }

    // Parse summary file
    const monthName = new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });
    const summary = [
      `Parse Summary — ${monthName} ${config.year}`,
      `Total parsed: ${data.length}`,
      `Working days (auto): ${WORKING_DAYS}`,
      `Holidays: ${config.holidays.join(', ')} (Fridays auto-added: ${AUTO_HOLIDAYS.join(', ')})`,
      `Saturdays: ${calculatedSaturdays.join(', ')}`,
      `Unmatched in config: ${unmatchedInAtt.length}${unmatchedInAtt.length ? ' — ' + unmatchedInAtt.map(e => e.name).join(', ') : ''}`,
      `Missing from att: ${missingFromAtt.length}${missingFromAtt.length ? ' — ' + missingFromAtt.map(s => s.name).join(', ') : ''}`
    ].join('\n');
    fs.writeFileSync('temp/parse-summary.txt', summary);
    console.log('✓ Parse summary saved to temp/parse-summary.txt');
    
    console.log('\nSummary:');
    console.log(`Total staff parsed: ${data.length}`);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('att.docx')) {
      console.log('Hint: Make sure att.docx exists in the input folder.');
    } else {
      console.error(err);
    }
  }
}

module.exports = { main, saveToDocx };
if (require.main === module) main();
