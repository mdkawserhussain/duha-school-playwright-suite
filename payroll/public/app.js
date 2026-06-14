// Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global SSE logger listener
let eventSource = null;
function startLogListening() {
  if (eventSource) {
    eventSource.close();
  }

  const consoleBox = document.getElementById('console-logs');
  if (!consoleBox) return;

  eventSource = new EventSource('/api/logs');
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      consoleBox.innerText += data.message + '\n';
      consoleBox.scrollTop = consoleBox.scrollHeight;
    } catch (e) {
      consoleBox.innerText += event.data + '\n';
      consoleBox.scrollTop = consoleBox.scrollHeight;
    }
  };

  eventSource.onerror = () => {
    consoleBox.innerText += '⚠️ Connection to log stream lost. Reconnecting...\n';
    consoleBox.scrollTop = consoleBox.scrollHeight;
  };
}

// ─── UTILITY FORMATTING ──────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

// ─── API ACTIONS ────────────────────────────────────────────────────────────
async function runPhase(phaseName, queryParams = '') {
  const consoleBox = document.getElementById('console-logs');
  if (consoleBox) consoleBox.innerText = ''; // Clear logs on start

  showToast(`Running phase: ${phaseName}...`, 'info');
  try {
    const res = await fetch(`/api/run/${phaseName}${queryParams}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`${phaseName} pipeline execution initiated!`, 'success');
      // Periodically refresh data and outputs list
      setTimeout(refreshDashboardData, 3000);
    } else {
      showToast(`Failed to trigger ${phaseName}: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error running phase: ${err.message}`, 'error');
  }
}

// Load and list output files
async function loadOutputs() {
  const container = document.getElementById('outputs-list');
  if (!container) return;

  try {
    const res = await fetch('/api/outputs');
    const files = await res.json();

    if (!files.length) {
      container.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">No reports generated yet.</td></tr>';
      return;
    }

    container.innerHTML = files.map(file => `
      <tr>
        <td style="font-weight: 600;">${file.name}</td>
        <td>${formatBytes(file.size)}</td>
        <td>${formatDate(file.mtime)}</td>
        <td>
          <a href="/api/download/${file.name}" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Download</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load generated reports.', 'error');
  }
}

// Upload file helper
async function uploadFile(inputId, endpoint, labelId) {
  const input = document.getElementById(inputId);
  if (!input || !input.files.length) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const label = document.getElementById(labelId);
  if (label) label.innerText = `Uploading ${file.name}...`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Successfully uploaded ${file.name}!`, 'success');
      if (label) label.innerText = `Uploaded: ${file.name}`;
    } else {
      showToast(`Upload failed: ${data.error}`, 'error');
      if (label) label.innerText = `Upload failed`;
    }
  } catch (err) {
    showToast(`Error uploading: ${err.message}`, 'error');
    if (label) label.innerText = `Upload failed`;
  }
}

// Fetch stats and update dashboard
async function refreshDashboardData() {
  // Update reports listing
  loadOutputs();

  // Try loading stats from final_payroll.json if it exists
  const staffCountBox = document.getElementById('stat-staff-count');
  const workingDaysBox = document.getElementById('stat-working-days');
  const totalNetBox = document.getElementById('stat-total-net');
  const statusMonth = document.getElementById('status-month');
  const schoolTitle = document.getElementById('school-title');

  try {
    // 1. Fetch Config
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    
    if (schoolTitle) schoolTitle.innerText = config.schoolName;
    if (statusMonth) statusMonth.innerText = `${new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' })} ${config.year}`;
    if (staffCountBox) staffCountBox.innerText = `${config.staff.length}`;

    // 2. Fetch Payroll Data for Net Total
    const payrollRes = await fetch('/api/payroll');
    const payroll = await payrollRes.json();
    if (payroll && payroll.length && totalNetBox) {
      const sumNet = payroll.reduce((acc, p) => acc + (parseInt(p.net) || 0), 0);
      totalNetBox.innerText = `BDT ${sumNet.toLocaleString()}`;
    } else if (totalNetBox) {
      totalNetBox.innerText = 'BDT 0';
    }
  } catch (err) {
    console.warn('Could not fully populate stats yet.');
  }
}

// Initial onload for main dashboard
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('console-logs')) {
    startLogListening();
    refreshDashboardData();
    // Refresh outputs every 10 seconds automatically
    setInterval(loadOutputs, 10000);
  }
});
