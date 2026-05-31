import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { log } from '../utils/logger';

interface DashboardData {
  byClass: Record<string, number>;
  totalPaid: number;
  totalOutstanding: number;
  monthlyTrend: Record<string, number>;
  topDefaulters: Array<{ name: string; class: string; totalDue: number }>;
}

function computeDashboardData(data: Record<string, any>[]): DashboardData {
  const byClass: Record<string, number> = {};
  let totalPaid = 0;
  let totalOutstanding = 0;
  const monthlyTrend: Record<string, number> = {};

  for (const record of data) {
    const cls = record._class || record.Class || 'Unknown';
    const paid = parseFloat(String(record['Total Paid'] || record.totalPaid || '0').replace(/,/g, '')) || 0;
    const due = parseFloat(String(record['Total Due'] || record.totalDue || '0').replace(/,/g, '')) || 0;

    byClass[cls] = (byClass[cls] || 0) + due;
    totalPaid += paid;
    totalOutstanding += due;

    // Monthly trend
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    for (const month of months) {
      const val = record[month] || '';
      const match = val.match(/Due\s*:\s*([\d,]+)/i);
      if (match) {
        const dueAmt = parseFloat(match[1].replace(/,/g, '')) || 0;
        monthlyTrend[month] = (monthlyTrend[month] || 0) + dueAmt;
      }
    }
  }

  // Top defaulters
  const topDefaulters = data
    .filter(r => {
      const due = parseFloat(String(r['Total Due'] || r.totalDue || '0').replace(/,/g, '')) || 0;
      return due > 0;
    })
    .map(r => ({
      name: r['Std Name'] || r.name || 'Unknown',
      class: r._class || r.Class || 'Unknown',
      totalDue: parseFloat(String(r['Total Due'] || r.totalDue || '0').replace(/,/g, '')) || 0,
    }))
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 10);

  return { byClass, totalPaid, totalOutstanding, monthlyTrend, topDefaulters };
}

function generateHtml(dashData: DashboardData, dateStr: string): string {
  const classLabels = JSON.stringify(Object.keys(dashData.byClass));
  const classValues = JSON.stringify(Object.values(dashData.byClass));
  const monthLabels = JSON.stringify(Object.keys(dashData.monthlyTrend));
  const monthValues = JSON.stringify(Object.values(dashData.monthlyTrend));
  const pieLabels = JSON.stringify(['Paid', 'Outstanding']);
  const pieValues = JSON.stringify([dashData.totalPaid, dashData.totalOutstanding]);

  const defaulterRows = dashData.topDefaulters.map((d, i) =>
    `<tr><td>${i + 1}</td><td>${d.name}</td><td>${d.class}</td><td>${d.totalDue.toLocaleString()}</td></tr>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dues Dashboard - ${dateStr}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100 min-h-screen p-6">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Dues Dashboard</h1>
    <p class="text-gray-600 mb-8">Generated: ${dateStr}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700">Total Paid</h2>
        <p class="text-2xl font-bold text-green-600">BDT ${dashData.totalPaid.toLocaleString()}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700">Total Outstanding</h2>
        <p class="text-2xl font-bold text-red-600">BDT ${dashData.totalOutstanding.toLocaleString()}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700">Classes</h2>
        <p class="text-2xl font-bold text-blue-600">${Object.keys(dashData.byClass).length}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Outstanding by Class</h2>
        <canvas id="chartByClass" height="200"></canvas>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Collection Rate</h2>
        <canvas id="chartCollection" height="200"></canvas>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">Monthly Trend</h2>
      <canvas id="chartTrend" height="150"></canvas>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">Top 10 Defaulters</h2>
      <table class="w-full text-left">
        <thead>
          <tr class="border-b">
            <th class="p-2">#</th>
            <th class="p-2">Name</th>
            <th class="p-2">Class</th>
            <th class="p-2">Total Due</th>
          </tr>
        </thead>
        <tbody>
          ${defaulterRows}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    new Chart(document.getElementById('chartByClass'), {
      type: 'bar',
      data: { labels: ${classLabels}, datasets: [{ label: 'Outstanding (BDT)', data: ${classValues}, backgroundColor: 'rgba(239, 68, 68, 0.7)' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    new Chart(document.getElementById('chartCollection'), {
      type: 'doughnut',
      data: { labels: ${pieLabels}, datasets: [{ data: ${pieValues}, backgroundColor: ['#22c55e', '#ef4444'] }] }
    });
    new Chart(document.getElementById('chartTrend'), {
      type: 'line',
      data: { labels: ${monthLabels}, datasets: [{ label: 'Dues (BDT)', data: ${monthValues}, borderColor: '#ef4444', fill: false }] },
      options: { responsive: true }
    });
  </script>
</body>
</html>`;
}

export function generateHtmlDashboard(data: Record<string, any>[]): void {
  const dashData = computeDashboardData(data);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const html = generateHtml(dashData, dateStr);

  if (!fs.existsSync(CONFIG.directories.output)) {
    fs.mkdirSync(CONFIG.directories.output, { recursive: true });
  }

  const outputPath = path.join(CONFIG.directories.output, `dues_dashboard_${dateStr}.html`);
  fs.writeFileSync(outputPath, html, 'utf-8');
  log.info(`HTML dashboard written: ${outputPath}`);
}
