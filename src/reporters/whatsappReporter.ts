import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from '../utils/logger';

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
  message: string;
  link: string;
}

function composeStaffMessage(name: string, present: number, absent: number, late: number): string {
  const genId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const year = new Date().getFullYear();

  return `*DUHA INTERNATIONAL SCHOOL*\n*OFFICIAL SALARY SLIP*\n\n==============================\n*REF:* #DIS-${genId}-${monthName.substring(0, 3).toUpperCase()}\n*NAME:* ${name}\n*PERIOD:* ${monthName} ${year}\n==============================\n\n*ATTENDANCE DETAILS*\n✅ Present    : ${present} Days\n❌ Absent     : ${absent} Days\n⏳ Lateness   : ${late} Entries\n\n==============================\n_This is an automated HR notification._`;
}

function composeParentMessage(studentName: string, studentId: string, className: string, totalDue: number): string {
  return `*DUHA INTERNATIONAL SCHOOL*\n*OUTSTANDING DUES NOTICE*\n\nDear Parent,\nThis is to notify you that child *${studentName}* (ID: ${studentId}, Class: ${className})\nhas outstanding balances totaling *BDT ${totalDue.toLocaleString()}*.\n\nPlease settle the balance as possible.\n_Automated Accounts System_`;
}

function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppDashboard(
  attendanceData: Record<string, any>[],
  duesData: Record<string, any>[]
): void {
  // Aggregate attendance by employee
  const employeeMap = new Map<string, { present: number; absent: number; late: number; phone: string }>();
  for (const record of attendanceData) {
    const id = record['Employee ID'] || record.employee_id || '';
    const name = record.Name || record.name || '';
    const status = record.Status || '';
    const phone = record.Contact || record.contact_number || '';

    if (!id) continue;
    const key = String(id);
    if (!employeeMap.has(key)) {
      employeeMap.set(key, { present: 0, absent: 0, late: 0, phone });
    }
    const emp = employeeMap.get(key)!;
    if (status === 'Present') emp.present++;
    else if (status === 'Absent') emp.absent++;
    if (record.Late) emp.late++;
  }

  // Build staff links
  const staffLinks: StaffLink[] = [];
  for (const [id, emp] of employeeMap) {
    const name = attendanceData.find(r => String(r['Employee ID'] || r.employee_id) === id)?.Name || id;
    const msg = composeStaffMessage(name, emp.present, emp.absent, emp.late);
    staffLinks.push({
      name,
      phone: emp.phone,
      message: msg,
      link: buildWhatsAppLink(emp.phone, msg),
    });
  }

  // Build parent links from dues data
  const parentLinks: ParentLink[] = [];
  for (const record of duesData) {
    const due = parseFloat(String(record['Total Due'] || record.totalDue || '0').replace(/,/g, '')) || 0;
    if (due <= 0) continue;

    const studentName = record['Std Name'] || record.name || '';
    const studentId = record['User ID'] || record.studentId || '';
    const className = record._class || record.Class || '';
    const parentPhone = record['Contact No'] || record.contact_number || '';

    if (!parentPhone) continue;

    const msg = composeParentMessage(studentName, studentId, className, due);
    parentLinks.push({
      studentName,
      studentId,
      className,
      parentPhone,
      totalDue: due,
      message: msg,
      link: buildWhatsAppLink(parentPhone, msg),
    });
  }

  // Write data file
  if (!fs.existsSync(CONFIG.directories.output)) {
    fs.mkdirSync(CONFIG.directories.output, { recursive: true });
  }

  const dataFile = path.join(CONFIG.directories.output, 'wa-data.js');
  const dataContent = `const staffLinks = ${JSON.stringify(staffLinks, null, 2)};\nconst parentLinks = ${JSON.stringify(parentLinks, null, 2)};`;
  fs.writeFileSync(dataFile, dataContent, 'utf-8');
  log.info(`WhatsApp data written: ${dataFile}`);

  // Build HTML dashboard
  const html = buildDashboardHtml(staffLinks, parentLinks);
  const htmlFile = path.join(CONFIG.directories.output, 'WhatsApp-Links-Dashboard.html');
  fs.writeFileSync(htmlFile, html, 'utf-8');
  log.info(`WhatsApp dashboard written: ${htmlFile}`);

  log.info(`Generated ${staffLinks.length} staff links and ${parentLinks.length} parent links`);
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
    return `<tr class="border-b">
      <td class="p-2">${p.studentName}</td>
      <td class="p-2">${p.className}</td>
      <td class="p-2">BDT ${p.totalDue.toLocaleString()}</td>
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
  <div class="max-w-5xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">WhatsApp Links Dashboard</h1>

    <div class="flex gap-4 mb-6">
      <button onclick="showTab('staff')" id="tab-staff" class="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white">Staff Salary Slips (${staffLinks.length})</button>
      <button onclick="showTab('parent')" id="tab-parent" class="px-4 py-2 rounded-lg font-semibold bg-gray-300 text-gray-700">Parent Due Reminders (${parentLinks.length})</button>
    </div>

    <div id="panel-staff" class="space-y-3">
      ${staffRows}
    </div>

    <div id="panel-parent" class="hidden">
      <table class="w-full bg-white rounded-lg shadow">
        <thead>
          <tr class="border-b bg-gray-50">
            <th class="p-2 text-left">Student</th>
            <th class="p-2 text-left">Class</th>
            <th class="p-2 text-left">Due</th>
            <th class="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          ${parentRows}
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
