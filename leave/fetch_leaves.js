const fs   = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// ─── Style constants (matching leave.py palette) ─────────────────────────────
const C = {
  AUTO:  'FFDDEEFF', // auto-calc cell bg (blue tint)
  INPUT: 'FFFFFAEE', // user-input cell bg (yellow tint)
  ALT:   'FFEAF2FF', // alternate row bg
  WHITE: 'FFFFFFFF',
  // Status colours
  GF: 'FFC6EFCE', GT: 'FF276221', // Approved  — green
  OF: 'FFFFEB9C', OT: 'FF7F3F00', // Pending   — amber
  RF: 'FFFFC7CE', RT: 'FF9C0006', // Cancelled — red
};

const mkFill   = (argb)              => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const mkFont   = (bold=false, sz=9, argb='FF000000') =>
                 ({ name: 'Arial', bold, size: sz, color: { argb } });
const mkAlign  = (h='center', v='center', wrap=true) =>
                 ({ horizontal: h, vertical: v, wrapText: wrap });
const mkBorder = () => {
  const s = { style: 'thin', color: { argb: 'FFBBBBBB' } };
  return { left: s, right: s, top: s, bottom: s };
};

function statusStyle(status) {
  const map = {
    'Approved':  { fill: mkFill(C.GF), font: mkFont(true, 9, C.GT) },
    'Pending':   { fill: mkFill(C.OF), font: mkFont(true, 9, C.OT) },
    'Cancelled': { fill: mkFill(C.RF), font: mkFont(true, 9, C.RT) },
  };
  return map[status] || { fill: mkFill(C.WHITE), font: mkFont() };
}

// ─── Utility helpers ─────────────────────────────────────────────────────────
const norm = (s) => (s || '').trim().toLowerCase();

function titleCase(str) {
  return (str || '').trim().replace(/\w\S*/g, w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

function capStatus(s) {
  if (!s) return 'Pending';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Convert an Excel date cell value to "YYYY-MM-DD" without UTC shift
function cellDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

// Parse a single API leave record into a clean object
function parseApiRecord(r) {
  const gen = r.site_employee_leave_generate;
  const emp = r.employee_history;
  return {
    apiId:       r.id,
    staffName:   (emp?.user?.first_name || '').trim(),
    leaveType:   gen?.academic_leave_type?.name || '',
    reason:      r.reason || '',
    fromDate:    r.from_date,     // "YYYY-MM-DD"
    toDate:      r.to_date,       // "YYYY-MM-DD"
    days:        r.spend_leave_days || 1,
    requestDate: r.request_date || r.from_date,
    status:      capStatus(r.leave_status),
  };
}

// ─── Excel sync logic ─────────────────────────────────────────────────────────
async function syncToExcel(xlsxPath, parsedRecords) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);

  const cfgSheet = wb.getWorksheet('Config');
  const recSheet = wb.getWorksheet('Leave Records');

  if (!recSheet) {
    console.error('❌  "Leave Records" sheet not found in workbook.');
    return 0;
  }

  // Build Config name map: norm(name) → exact name stored in Config
  // This ensures written names always match the VLOOKUP source
  const cfgNames = new Map();
  if (cfgSheet) {
    for (let r = 7; r <= 106; r++) {
      const v = cfgSheet.getCell(r, 2).value; // Col B = staff name
      if (v && typeof v === 'string' && v.trim()) {
        cfgNames.set(norm(v), v.trim());
      }
    }
  }
  console.log(`  Config names loaded: ${cfgNames.size}`);

  // Scan existing rows to build dedup set + find last occupied row
  // Dedup key: norm(name)|norm(leaveType)|fromDate|toDate
  const seen    = new Set();
  let lastRow   = 3; // row 3 is the header

  recSheet.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn < 4) return;
    const nameVal = row.getCell(2).value; // Col B
    if (!nameVal) return;
    const typeVal = row.getCell(4).value || '';
    const fromVal = row.getCell(6).value;
    const toVal   = row.getCell(7).value;
    const key = `${norm(String(nameVal))}|${norm(String(typeVal))}|${cellDateStr(fromVal)}|${cellDateStr(toVal)}`;
    seen.add(key);
    if (rn > lastRow) lastRow = rn;
  });

  console.log(`  Existing records: ${seen.size}  |  Last data row: ${lastRow}`);

  let added = 0;

  for (const rec of parsedRecords) {
    const key = `${norm(rec.staffName)}|${norm(rec.leaveType)}|${rec.fromDate}|${rec.toDate}`;
    if (seen.has(key)) continue; // already in spreadsheet

    // Match API name to exact Config name (case-insensitive); fall back to title-cased API name
    const resolvedName = cfgNames.get(norm(rec.staffName)) || titleCase(rec.staffName);

    const rn     = ++lastRow;
    const isAlt  = (rn - 4) % 2 === 0;
    const rowBg  = isAlt ? C.ALT : C.WHITE;

    // Use noon UTC to avoid any timezone-induced date shift
    const fromDt = new Date(rec.fromDate    + 'T12:00:00Z');
    const toDt   = new Date(rec.toDate      + 'T12:00:00Z');
    const reqDt  = new Date(rec.requestDate + 'T12:00:00Z');

    const row = recSheet.getRow(rn);
    row.height = 17;

    // Col A — SL# (auto formula)
    const cellA = row.getCell(1);
    cellA.value     = { formula: `IF(B${rn}="","",ROW()-3)` };
    cellA.fill      = mkFill(C.AUTO);
    cellA.font      = mkFont();
    cellA.alignment = mkAlign();
    cellA.border    = mkBorder();

    // Col B — Staff Name
    const cellB = row.getCell(2);
    cellB.value     = resolvedName;
    cellB.fill      = mkFill(C.INPUT);
    cellB.font      = mkFont(true);
    cellB.alignment = mkAlign('left');
    cellB.border    = mkBorder();

    // Col C — Designation (auto VLOOKUP formula)
    const cellC = row.getCell(3);
    cellC.value     = { formula: `IFERROR(VLOOKUP(B${rn},Config!$B$7:$C$106,2,0),"")` };
    cellC.fill      = mkFill(C.AUTO);
    cellC.font      = mkFont();
    cellC.alignment = mkAlign('left');
    cellC.border    = mkBorder();

    // Col D — Leave Type
    const cellD = row.getCell(4);
    cellD.value     = rec.leaveType;
    cellD.fill      = mkFill(C.INPUT);
    cellD.font      = mkFont();
    cellD.alignment = mkAlign();
    cellD.border    = mkBorder();

    // Col E — Reason
    const cellE = row.getCell(5);
    cellE.value     = rec.reason;
    cellE.fill      = mkFill(C.INPUT);
    cellE.font      = mkFont();
    cellE.alignment = mkAlign('left');
    cellE.border    = mkBorder();

    // Col F — From Date
    const cellF = row.getCell(6);
    cellF.value     = fromDt;
    cellF.numFmt    = 'DD-MMM-YYYY';
    cellF.fill      = mkFill(C.INPUT);
    cellF.font      = mkFont();
    cellF.alignment = mkAlign();
    cellF.border    = mkBorder();

    // Col G — To Date
    const cellG = row.getCell(7);
    cellG.value     = toDt;
    cellG.numFmt    = 'DD-MMM-YYYY';
    cellG.fill      = mkFill(C.INPUT);
    cellG.font      = mkFont();
    cellG.alignment = mkAlign();
    cellG.border    = mkBorder();

    // Col H — Month (auto formula)
    const cellH = row.getCell(8);
    cellH.value     = { formula: `IF(F${rn}="","",TEXT(F${rn},"MMMM YYYY"))` };
    cellH.fill      = mkFill(C.AUTO);
    cellH.font      = mkFont();
    cellH.alignment = mkAlign();
    cellH.border    = mkBorder();

    // Col I — Days
    const cellI = row.getCell(9);
    cellI.value     = rec.days;
    cellI.fill      = mkFill(C.INPUT);
    cellI.font      = mkFont(true);
    cellI.alignment = mkAlign();
    cellI.border    = mkBorder();

    // Col J — Request Date
    const cellJ = row.getCell(10);
    cellJ.value     = reqDt;
    cellJ.numFmt    = 'DD-MMM-YYYY';
    cellJ.fill      = mkFill(C.INPUT);
    cellJ.font      = mkFont();
    cellJ.alignment = mkAlign();
    cellJ.border    = mkBorder();

    // Col K — Status (colour-coded)
    const cellK = row.getCell(11);
    const ss        = statusStyle(rec.status);
    cellK.value     = rec.status;
    cellK.fill      = ss.fill;
    cellK.font      = ss.font;
    cellK.alignment = mkAlign();
    cellK.border    = mkBorder();

    row.commit();
    seen.add(key);
    added++;

    console.log(`  ✓ Row ${rn}: ${resolvedName.padEnd(30)} | ${rec.leaveType.padEnd(15)} | ${rec.fromDate} → ${rec.toDate} | ${rec.status}`);
  }

  if (added > 0) {
    await wb.xlsx.writeFile(xlsxPath);
    console.log(`\n✅  ${added} new record(s) written → ${path.basename(xlsxPath)}`);
  } else {
    console.log('\n✅  No new records — spreadsheet is already up to date.');
  }

  return added;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const fetchLeaveApplications = async () => {
  const url = 'https://duhais.eduexpert24.com/site/employee-leave/application-list?search_leave_type=&search_text=&search_date=&search_leave_status=&paginate=100';

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cookie': 'remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6IkdJeGFqZ2VVMHVoS0VrYlJRazBSOVE9PSIsInZhbHVlIjoid2N5RWN4b1RERVU5ODZ1K29SbUlHYWdEdFNSTi91MlV1M3ZMbVg1QjIzdnlCVDdqbTJzMFVqdjhWL0VBeUhVRktuZDA5TVFRcjJkbWtzcWp4cEZQOFFabFRsUEw4ZmU4NC8zUHM4ZGM3RkN4ejQvTUh6NlJEaGh6VTBxcS9kSm9La1NCWU1tQS81eG01WTdVMHJCeE9IRldYYi9zdW9yWTZ2YktTcU1JOThrZWxWaC9aYmRpSGowWUN3SURiQVpWTUNTOHFiZURSenlOMnlrN3Q5SUpsWkpjNTN0U05oRGcybHlTR3ZHM0t6cz0iLCJtYWMiOiJkNWEyZmZmZDU0MjNlMmE0ODM2MGQ3OTBlNGE5NDhjY2QwMmMyYTBjZmQ5N2Q5Yzc4NmI5NjI4YzQ1NDkwNjgwIiwidGFnIjoiIn0%3D; XSRF-TOKEN=eyJpdiI6IjJya0xQOFNvYkF2WVgybG45VzFJcHc9PSIsInZhbHVlIjoiQWtzN09ncjhKd291UDI3SFRVWVdocWFYYUhpSnZTTCtQbnVCWUJjVWdlN3JUWmhia3c2NDBDSi9hWTJhZ2F5ZUVGK3BNalpCeGxpUjVncXFSZ011NFd1bEFuckVVZmNuc2ZhbjZYQ1E2WmoyeG4yenFpd1ZmOVFwMkQzZklnY2siLCJtYWMiOiJjZmJjMmJhMzkyYWRjYmVkOTc5YmQ3YTJlYjA4MDEzNGIxZGZjZDQxNGI4ZGRkZWEyYzgyYmJmYjYwYmExNjVmIiwidGFnIjoiIn0%3D; eduexpert24_session=eyJpdiI6IkJQRVJYYU1OUnZxSXBqY0c1aFBHSEE9PSIsInZhbHVlIjoibXZGTFU5akMxQkZwYUp4cDFCMysweHJKUTZqbHp6cmVVcVUyL1ZpdFQreUtDdnlRSmtOREhmWm11NkhRbDVRVEVzNmQ1cDE3R3dPT0JZQjFYSCtxeVhzTTFsUlg1bUtoZHFad1RqVGd5VnFRcEZ2dDZsVEJzZ3diWFhEbDllK2QiLCJtYWMiOiJkMGQzOWUzMjMzNTZmZjIwOWVhMWYwMGYzYjIyNTkzZDljZDA5ODdiYjNhYTAwOTlhMDJjYmI5YWIxY2RhZDNmIiwidGFnIjoiIn0%3D',
    'Referer': 'https://duhais.eduexpert24.com/site/employee-leave/leave-approve',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'X-XSRF-TOKEN': 'eyJpdiI6IjJya0xQOFNvYkF2WVgybG45VzFJcHc9PSIsInZhbHVlIjoiQWtzN09ncjhKd291UDI3SFRVWVdocWFYYUhpSnZTTCtQbnVCWUJjVWdlN3JUWmhia3c2NDBDSi9hWTJhZ2F5ZUVGK3BNalpCeGxpUjVncXFSZ011NFd1bEFuckVVZmNuc2ZhbjZYQ1E2WmoyeG4yenFpd1ZmOVFwMkQzZklnY2siLCJtYWMiOiJjZmJjMmJhMzkyYWRjYmVkOTc5YmQ3YTJlYjA4MDEzNGIxZGZjZDQxNGI4ZGRkZWEyYzgyYmJmYjYwYmExNjVmIiwidGFnIjoiIn0=',
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-gpc': '1'
  };

  try {
    console.log('🔄  Fetching leave applications from API...');
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // ── Save raw JSON ──────────────────────────────────────────────────
    const jsonPath = path.join(__dirname, 'employee_leaves.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾  JSON saved → ${jsonPath}`);

    // ── Extract leave entries (handles paginated array or single page) ──
    let allRecords = [];
    if (Array.isArray(data)) {
      // Response is an array of pages: [{current_page, data: [...]}, ...]
      for (const page of data) {
        if (Array.isArray(page.data)) allRecords.push(...page.data);
      }
    } else if (data && Array.isArray(data.data)) {
      // Single page: {current_page, data: [...]}
      allRecords = data.data;
    }

    console.log(`📋  Leave records from API: ${allRecords.length}`);

    if (allRecords.length === 0) {
      console.log('⚠️   No records returned from API.');
      return;
    }

    // ── Parse & sync to Excel ──────────────────────────────────────────
    const parsed   = allRecords.map(parseApiRecord);
    const xlsxPath = path.join(__dirname, 'Duha_Leave_Ledger_v2_Configurable.xlsx');
    await syncToExcel(xlsxPath, parsed);

  } catch (error) {
    console.error('❌  Fetch error:', error.message);
  }
};

fetchLeaveApplications();
