import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export const whatsappRouter = Router();

const outputDir = path.resolve(process.cwd(), 'output');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const IDENTITY_KEYS = ['Std Name', 'User ID', '_class', '_shift', '_year', 'SL', 'Roll', 'Contact No', 'Total Paid', 'Total Due'];

interface DuesColumn {
  name: string;
  amount: number;
}

interface StaffLink {
  name: string;
  phone: string;
  message: string;
  link: string;
}

interface ParentLink {
  studentName: string;
  studentId: string;
  className: string;
  parentPhone: string;
  totalDue: number;
  periodDue: number;
  monthlyDues: DuesColumn[];
  feeDues: DuesColumn[];
  message: string;
  link: string;
}

function parseDueFromCell(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  const match = s.match(/due\s*:\s*([\d,]+)/i);
  if (match) return parseFloat(match[1].replace(/,/g, '')) || 0;
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function getPeriodMonths(selectedMonths: string[]): string[] {
  if (!selectedMonths || selectedMonths.length === 0) return MONTHS;
  let latestIdx = 0;
  for (const m of selectedMonths) {
    const idx = MONTHS.findIndex(mm => mm.toLowerCase() === m.toLowerCase());
    if (idx > latestIdx) latestIdx = idx;
  }
  return MONTHS.slice(0, latestIdx + 1);
}

function isFeeColumn(col: string): boolean {
  return !MONTHS.includes(col) && !IDENTITY_KEYS.includes(col);
}

function computeStudentDues(
  record: Record<string, any>,
  periodMonths: string[],
  selectedColumns: string[] | null
): {
  totalDue: number;
  periodDue: number;
  monthlyDues: DuesColumn[];
  feeDues: DuesColumn[];
} {
  const totalDue = parseDueFromCell(record['Total Due']);

  // Monthly dues within period — only if month columns are in selectedColumns
  const monthlyDues: DuesColumn[] = [];
  for (const m of periodMonths) {
    if (selectedColumns && !selectedColumns.includes(m)) continue;
    const due = parseDueFromCell(record[m]);
    if (due > 0) monthlyDues.push({ name: m.slice(0, 3), amount: due });
  }
  const periodDue = monthlyDues.reduce((sum, d) => sum + d.amount, 0);

  // Fee dues — only columns in selectedColumns that are fee columns
  const feeDues: DuesColumn[] = [];
  const feeCols = selectedColumns
    ? selectedColumns.filter(c => isFeeColumn(c))
    : Object.keys(record).filter(c => isFeeColumn(c));
  for (const key of feeCols) {
    const due = parseDueFromCell(record[key]);
    if (due > 0) feeDues.push({ name: key, amount: due });
  }

  return { totalDue, periodDue, monthlyDues, feeDues };
}

function composeStaffMessage(name: string, present: number, absent: number, late: number): string {
  const genId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const year = new Date().getFullYear();
  return `*DUHA INTERNATIONAL SCHOOL*\n*OFFICIAL SALARY SLIP*\n\n==============================\n*REF:* #DIS-${genId}-${monthName.substring(0, 3).toUpperCase()}\n*NAME:* ${name}\n*PERIOD:* ${monthName} ${year}\n==============================\n\n*ATTENDANCE DETAILS*\n✅ Present    : ${present} Days\n❌ Absent     : ${absent} Days\n⏳ Lateness   : ${late} Entries\n\n==============================\n_This is an automated HR notification._`;
}

function composeParentMessage(
  studentName: string,
  studentId: string,
  className: string,
  periodDue: number,
  monthlyDues: DuesColumn[],
  feeDues: DuesColumn[],
  periodLabel: string
): string {
  let body = `*DUHA INTERNATIONAL SCHOOL*\n*OUTSTANDING DUES NOTICE*\n\nDear Parent,\nThis is to notify you that child *${studentName}* (ID: ${studentId}, Class: ${className})\nhas outstanding balances:\n`;

  if (monthlyDues.length > 0) {
    body += `\n📋 *Monthly Dues (${periodLabel}):*\n`;
    for (const d of monthlyDues) {
      body += `  • ${d.name}: ৳${d.amount.toLocaleString()}\n`;
    }
  }

  if (feeDues.length > 0) {
    body += `\n📋 *Fee Dues:*\n`;
    for (const d of feeDues) {
      body += `  • ${d.name}: ৳${d.amount.toLocaleString()}\n`;
    }
  }

  body += `\n💰 *Total Due:* BDT ${periodDue.toLocaleString()}\n\nPlease settle the balance as possible.\n_Automated Accounts System_`;
  return body;
}

function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

function findLatestFile(prefix: string): string | null {
  try {
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
    if (files.length === 0) return null;
    return path.join(outputDir, files.sort().pop()!);
  } catch {
    return null;
  }
}

function generateLinksInternal(periodMonths?: string[], selectedColumns?: string[] | null): { staffLinks: StaffLink[]; parentLinks: ParentLink[] } {
  const pm = periodMonths && periodMonths.length > 0 ? getPeriodMonths(periodMonths) : MONTHS;
  const periodLabel = periodMonths && periodMonths.length > 0
    ? `${pm[0].slice(0, 3)} - ${pm[pm.length - 1].slice(0, 3)}`
    : 'All Months';

  const staffLinks: StaffLink[] = [];
  const parentLinks: ParentLink[] = [];

  // Staff links from attendance data
  const attendanceFile = findLatestFile('attendance');
  if (attendanceFile) {
    try {
      const attendanceData = JSON.parse(fs.readFileSync(attendanceFile, 'utf-8'));
      const employeeMap = new Map<string, { present: number; absent: number; late: number; phone: string }>();
      for (const record of attendanceData) {
        const id = record['Employee ID'] || record.employee_id || '';
        const phone = record.Contact || record.contact_number || '';
        if (!id) continue;
        const key = String(id);
        if (!employeeMap.has(key)) {
          employeeMap.set(key, { present: 0, absent: 0, late: 0, phone });
        }
        const emp = employeeMap.get(key)!;
        const status = record.Status || '';
        if (status === 'Present') emp.present++;
        else if (status === 'Absent') emp.absent++;
        if (record.Late) emp.late++;
      }
      for (const [id, emp] of employeeMap) {
        const name = attendanceData.find((r: any) => String(r['Employee ID'] || r.employee_id) === id)?.Name || id;
        const msg = composeStaffMessage(name, emp.present, emp.absent, emp.late);
        staffLinks.push({ name, phone: emp.phone, message: msg, link: buildWhatsAppLink(emp.phone, msg) });
      }
    } catch { /* ignore */ }
  }

  // Parent links from dues data with per-column breakdown
  const duesFile = findLatestFile('accounts_receivable_dues_enriched');
  if (duesFile) {
    try {
      const duesData = JSON.parse(fs.readFileSync(duesFile, 'utf-8'));
      for (const record of duesData) {
        const { totalDue, periodDue, monthlyDues, feeDues } = computeStudentDues(record, pm, selectedColumns ?? null);

        // Only include if there are dues in the filtered columns
        if (periodDue <= 0 && feeDues.length === 0) continue;

        const studentName = record['Std Name'] || record.name || '';
        const studentId = record['User ID'] || record.studentId || '';
        const className = record._class || record.Class || '';
        const parentPhone = record['Contact No'] || record.contact_number || '';
        if (!parentPhone) continue;

        // Total due for message = sum of filtered monthly + fee dues
        const filteredTotal = periodDue + feeDues.reduce((sum, d) => sum + d.amount, 0);

        const msg = composeParentMessage(studentName, studentId, className, filteredTotal, monthlyDues, feeDues, periodLabel);
        parentLinks.push({
          studentName,
          studentId,
          className,
          parentPhone,
          totalDue,
          periodDue: filteredTotal,
          monthlyDues,
          feeDues,
          message: msg,
          link: buildWhatsAppLink(parentPhone, msg),
        });
      }
    } catch { /* ignore */ }
  }

  return { staffLinks, parentLinks };
}

function buildDashboardHtml(staffLinks: StaffLink[], parentLinks: ParentLink[]): string {
  const staffRows = staffLinks.map(s => {
    const msg = encodeURIComponent(s.message);
    return `<div class="bg-white rounded-lg shadow p-4 flex justify-between items-center">
      <div>
        <div class="font-semibold text-gray-800">${s.name}</div>
        <div class="text-sm text-gray-500">${s.phone || 'No phone'}</div>
      </div>
      <a href="https://wa.me/${(s.phone || '').replace(/[^0-9]/g, '')}?text=${msg}" target="_blank"
         class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
        Send Slip
      </a>
    </div>`;
  }).join('\n');

  const parentRows = parentLinks.map(p => {
    const msg = encodeURIComponent(p.message);
    const monthlyDetail = p.monthlyDues.map(d => `${d.name}: ৳${d.amount.toLocaleString()}`).join(', ');
    const feeDetail = p.feeDues.map(d => `${d.name}: ৳${d.amount.toLocaleString()}`).join(', ');
    return `<tr class="border-b">
      <td class="p-2">${p.studentName}</td>
      <td class="p-2">${p.className}</td>
      <td class="p-2 text-right">BDT ${p.periodDue.toLocaleString()}</td>
      <td class="p-2 text-xs text-gray-500">${monthlyDetail || '—'}</td>
      <td class="p-2 text-xs text-gray-500">${feeDetail || '—'}</td>
      <td class="p-2">
        <a href="https://wa.me/${(p.parentPhone || '').replace(/[^0-9]/g, '')}?text=${msg}" target="_blank"
           class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded font-semibold text-sm">
          Send
        </a>
      </td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Links Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen p-6">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">WhatsApp Links Dashboard</h1>

    <div class="flex gap-4 mb-6">
      <button onclick="showTab('staff')" id="tab-staff" class="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white">Staff Salary Slips (${staffLinks.length})</button>
      <button onclick="showTab('parent')" id="tab-parent" class="px-4 py-2 rounded-lg font-semibold bg-gray-300 text-gray-700">Parent Due Reminders (${parentLinks.length})</button>
    </div>

    <div id="panel-staff" class="space-y-3">
      ${staffRows || '<div class="text-center py-8 text-gray-400">No staff links</div>'}
    </div>

    <div id="panel-parent" class="hidden">
      <table class="w-full bg-white rounded-lg shadow">
        <thead>
          <tr class="border-b bg-gray-50">
            <th class="p-2 text-left">Student</th>
            <th class="p-2 text-left">Class</th>
            <th class="p-2 text-right">Period Due</th>
            <th class="p-2 text-left">Monthly Dues</th>
            <th class="p-2 text-left">Fee Dues</th>
            <th class="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          ${parentRows || '<tr><td colspan="6" class="p-4 text-center text-gray-400">No parent links</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function showTab(tab) {
      document.getElementById('panel-staff').classList.toggle('hidden', tab !== 'staff');
      document.getElementById('panel-parent').classList.toggle('hidden', tab !== 'parent');
      document.getElementById('tab-staff').classList.toggle('bg-blue-600', tab === 'staff');
      document.getElementById('tab-staff').classList.toggle('text-white', tab === 'staff');
      document.getElementById('tab-staff').classList.toggle('bg-gray-300', tab !== 'staff');
      document.getElementById('tab-staff').classList.toggle('text-gray-700', tab !== 'staff');
      document.getElementById('tab-parent').classList.toggle('bg-blue-600', tab === 'parent');
      document.getElementById('tab-parent').classList.toggle('text-white', tab === 'parent');
      document.getElementById('tab-parent').classList.toggle('bg-gray-300', tab !== 'parent');
      document.getElementById('tab-parent').classList.toggle('text-gray-700', tab !== 'parent');
    }
  </script>
</body>
</html>`;
}

// GET /api/whatsapp/links — return last generated links
whatsappRouter.get('/links', (_req, res) => {
  try {
    const cacheFile = path.join(outputDir, 'wa-data.json');
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      return res.json(cached);
    }
    const { staffLinks, parentLinks } = generateLinksInternal();
    res.json({ staffLinks, parentLinks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/generate — generate links with period + selected columns filter
whatsappRouter.post('/generate', (req, res) => {
  try {
    const { periodMonths, selectedColumns } = req.body || {};
    // null = no column filter (show all), [] = no columns selected (show nothing), [...]= filter
    const cols = selectedColumns !== undefined ? (Array.isArray(selectedColumns) && selectedColumns.length > 0 ? selectedColumns : null) : null;
    const { staffLinks, parentLinks } = generateLinksInternal(periodMonths, cols);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const cacheFile = path.join(outputDir, 'wa-data.json');
    fs.writeFileSync(cacheFile, JSON.stringify({
      staffLinks,
      parentLinks,
      generatedAt: new Date().toISOString(),
      periodMonths,
      selectedColumns: cols,
    }, null, 2));

    // Also generate the HTML dashboard
    const html = buildDashboardHtml(staffLinks, parentLinks);
    const htmlFile = path.join(outputDir, 'WhatsApp-Links-Dashboard.html');
    fs.writeFileSync(htmlFile, html, 'utf-8');

    res.json({ staffLinks, parentLinks, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
