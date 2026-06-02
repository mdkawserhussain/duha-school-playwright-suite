import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const IDENTITY = ['_year', '_shift', '_class', 'SL', 'Std Name', 'User ID', 'Roll', 'Contact No'];
const TOTALS = ['Total Paid', 'Total Due'];

function parseDueFromCell(value: any): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  const match = s.match(/due\s*:\s*([\d,]+)/i);
  if (match) return parseFloat(match[1].replace(/,/g, '')) || 0;
  const num = parseFloat(s.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function passesFilters(
  row: Record<string, any>,
  opts: { dueOnly: boolean; minAmount: number; classFilter: string; shiftFilter: string; yearFilter: string },
  selectedColumns?: string[]
): boolean {
  if (opts.dueOnly) {
    // When specific columns are selected, check only those for "Due : N" patterns.
    // Use strict pattern matching (not parseDueFromCell) to avoid false positives
    // from identity columns like User ID (pure numbers > 0).
    if (selectedColumns && selectedColumns.length > 0) {
      const hasDue = selectedColumns.some(col => {
        const s = String(row[col] ?? '');
        return /due\s*:\s*[\d,]+/i.test(s);
      });
      if (!hasDue) return false;
    } else {
      const totalDue = parseDueFromCell(row['Total Due'] || row.totalDue || 0);
      if (totalDue <= 0) return false;
    }
  }
  if (opts.minAmount > 0) {
    const totalDue = parseDueFromCell(row['Total Due'] || row.totalDue || 0);
    if (totalDue < opts.minAmount) return false;
  }
  if (opts.classFilter) {
    const rowClass = String(row._class || row.Class || '').toLowerCase();
    if (!rowClass.includes(opts.classFilter.toLowerCase())) return false;
  }
  if (opts.shiftFilter) {
    const rowShift = String(row._shift || row.Shift || '').toLowerCase();
    if (!rowShift.includes(opts.shiftFilter.toLowerCase())) return false;
  }
  if (opts.yearFilter) {
    const rowYear = String(row._year || row.Year || '').toLowerCase();
    if (!rowYear.includes(opts.yearFilter.toLowerCase())) return false;
  }
  return true;
}

const STORAGE_KEY = 'export-columns';

function groupColumns(columns: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = { Identity: [], Fees: [], Monthly: [], Totals: [] };
  for (const col of columns) {
    if (IDENTITY.includes(col)) groups.Identity.push(col);
    else if (MONTHS.includes(col)) groups.Monthly.push(col);
    else if (TOTALS.includes(col)) groups.Totals.push(col);
    else groups.Fees.push(col);
  }
  return groups;
}

function parseServerColumns(csv: string): string[] {
  return csv.split(',').map(s => s.trim()).filter(Boolean);
}

function loadColumns(serverDefault?: string): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  if (serverDefault) return new Set(parseServerColumns(serverDefault));
  return new Set();
}

function saveColumns(cols: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...cols]));
}

const GROUP_COLORS: Record<string, string> = {
  Identity: 'bg-gray-100 text-gray-700 border-gray-300',
  Fees: 'bg-blue-50 text-blue-700 border-blue-300',
  Monthly: 'bg-amber-50 text-amber-700 border-amber-300',
  Totals: 'bg-green-50 text-green-700 border-green-300',
};

export default function Controls() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [year, setYear] = useState('2026');
  const [shift, setShift] = useState('');
  const [cls, setCls] = useState('');
  const [serverColumns, setServerColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() => loadColumns());
  const [dueOnly, setDueOnly] = useState(false);
  const [minAmount, setMinAmount] = useState(0);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('export-period') || '[]'); } catch { return []; }
  });
  const logRef = useRef<HTMLDivElement>(null);
  const [successModal, setSuccessModal] = useState<{
    show: boolean;
    rawCount: number;
    dueCount: number;
    combos: number;
    failedCombos: number;
    duration: string;
  } | null>(null);

  const columnGroups = groupColumns(serverColumns);

  const { data: status } = useQuery('status', () => api<{ running: boolean; pid: number | null }>('/status'), {
    refetchInterval: 2000,
  });

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.PORTAL_COLUMNS) {
          const cols = parseServerColumns(cfg.PORTAL_COLUMNS);
          setServerColumns(cols);
          const saved = loadColumns();
          if (saved.size === 0 || saved.size < cols.length * 0.5) {
            setSelectedColumns(new Set(cols));
            saveColumns(new Set(cols));
          } else {
            setSelectedColumns(saved);
          }
        }
        if (cfg.PORTAL_DUE_ONLY === 'true') setDueOnly(true);
        if (cfg.PORTAL_MIN_DUE) setMinAmount(parseFloat(cfg.PORTAL_MIN_DUE) || 0);
        if (cfg.PORTAL_CLASS) setCls(cfg.PORTAL_CLASS);
        if (cfg.PORTAL_SHIFT) setShift(cfg.PORTAL_SHIFT);
        if (cfg.PORTAL_YEAR) setYear(cfg.PORTAL_YEAR);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status && !status.running && running) setRunning(false);
  }, [status, running]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      saveColumns(next);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const cols = columnGroups[group] || [];
    setSelectedColumns(prev => {
      const next = new Set(prev);
      const allSelected = cols.every(c => next.has(c));
      cols.forEach(c => allSelected ? next.delete(c) : next.add(c));
      saveColumns(next);
      return next;
    });
  };

  const selectAll = () => { setSelectedColumns(new Set(serverColumns)); saveColumns(new Set(serverColumns)); };
  const selectNone = () => { setSelectedColumns(new Set()); saveColumns(new Set()); };

  // Build the filter object — shared by extraction and download
  const filterOpts = { dueOnly, minAmount, classFilter: cls, shiftFilter: shift, yearFilter: year };

  const startRun = async () => {
    setRunning(true);
    setLogs([]);

    // Same filters go to CLI args AND saved to .env
    const args: string[] = [];
    if (year) args.push('--year', year);
    if (shift) args.push('--shift', shift);
    if (cls) args.push('--class', cls);
    if (selectedMonths.length > 0) args.push('--period', selectedMonths.join(','));

    const filters = { dueOnly, minDue: minAmount, periodMonths: selectedMonths };

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args, filters }),
      });
      const { runId } = await res.json();

      const evtSource = new EventSource(`/api/run/${runId}/logs`);
      evtSource.onmessage = (event) => {
        const { message } = JSON.parse(event.data);
        setLogs(prev => [...prev, message]);
        // Detect successful completion
        if (message.includes('Process exited with code 0')) {
          evtSource.close();
          // Fetch latest run stats
          fetch('/api/runs?limit=1')
            .then(r => r.json())
            .then(({ runs }) => {
              if (runs && runs.length > 0) {
                const run = runs[0];
                const secs = Math.round(run.duration_ms / 1000);
                setSuccessModal({
                  show: true,
                  rawCount: run.raw_count,
                  dueCount: run.due_count,
                  combos: 21,
                  failedCombos: run.failed_combos,
                  duration: secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`,
                });
              }
            })
            .catch(() => {});
        }
      };
      evtSource.onerror = () => { setRunning(false); evtSource.close(); };
    } catch {
      setRunning(false);
      setLogs(prev => [...prev, 'Failed to start extraction']);
    }
  };

  const downloadFilteredJson = async (prefix: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/output/${prefix}_${today}.json`);
    if (!res.ok) { alert('File not found'); return; }
    const data: Record<string, any>[] = await res.json();
    const filtered = data
      .filter(row => passesFilters(row, filterOpts, [...selectedColumns]))
      .map(row => {
        const obj: Record<string, any> = {};
        selectedColumns.forEach(c => { if (c in row) obj[c] = row[c]; });
        return obj;
      });
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}_${today}.json`;
    a.click();
  };

  const downloadXlsx = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/export/xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: [...selectedColumns],
          rowFilters: { dueOnly, minAmount, classFilter: cls, shiftFilter: shift, yearFilter: year },
          periodMonths: selectedMonths,
        }),
      });
      if (!res.ok) { alert('Failed to generate Excel report'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dues_report_${today}.xlsx`;
      a.click();
    } catch { alert('Failed to download Excel report'); }
  };

  // Count active filters for the badge
  const activeFilters = [dueOnly, minAmount > 0, !!cls, !!shift, !!year, selectedMonths.length > 0].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Unified Extraction Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Extraction</h2>

        {/* Unified Filter Strip */}
        <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide self-center mr-1">
            Filters {activeFilters > 0 && <span className="ml-1 text-indigo-600">({activeFilters})</span>}
          </span>

          {/* Due Only */}
          <button onClick={() => setDueOnly(!dueOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
              dueOnly ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dueOnly ? 'bg-indigo-500' : 'bg-gray-300'}`} />
            Due {'>'} 0
          </button>

          {/* Min Amount */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Min</label>
            <input type="number" value={minAmount || ''}
              onChange={e => setMinAmount(parseFloat(e.target.value) || 0)}
              className="w-20 border rounded-lg px-2.5 py-2 text-xs" placeholder="0" min="0" />
          </div>

          {/* Class */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Class</label>
            <input value={cls} onChange={e => setCls(e.target.value)}
              className="w-28 border rounded-lg px-2.5 py-2 text-xs" placeholder="e.g. Play" />
          </div>

          {/* Shift */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Shift</label>
            <input value={shift} onChange={e => setShift(e.target.value)}
              className="w-28 border rounded-lg px-2.5 py-2 text-xs" placeholder="e.g. Day" />
          </div>

          {/* Year */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Year</label>
            <input value={year} onChange={e => setYear(e.target.value)}
              className="w-20 border rounded-lg px-2.5 py-2 text-xs" placeholder="2026" />
          </div>

          {/* Period (Month Range) */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">Period</label>
            <div className="flex gap-0.5">
              {MONTHS.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMonths(prev => {
                      const next = prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
                      localStorage.setItem('export-period', JSON.stringify(next));
                      return next;
                    });
                  }}
                  className={`px-1 py-1 text-[9px] rounded border transition ${
                    selectedMonths.includes(m)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
              {selectedMonths.length > 0 && (
                <button
                  onClick={() => { setSelectedMonths([]); localStorage.removeItem('export-period'); }}
                  className="px-1 text-[9px] text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Column Groups */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Columns</span>
            <div className="flex gap-1.5">
              <button onClick={selectAll} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[11px] font-medium transition">All</button>
              <button onClick={selectNone} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[11px] font-medium transition">None</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(columnGroups).map(([group, cols]) => {
              const selected = cols.filter(c => selectedColumns.has(c)).length;
              const allSel = selected === cols.length;
              const noneSel = selected === 0;
              const isExpanded = expandedGroup === group;
              return (
                <div key={group} className="relative">
                  <button onClick={() => setExpandedGroup(isExpanded ? null : group)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      allSel ? GROUP_COLORS[group] : noneSel ? 'bg-white text-gray-400 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-300'
                    }`}>
                    {group}
                    <span className={`text-[10px] px-1 rounded ${allSel ? 'bg-white/60' : 'bg-gray-100'}`}>
                      {selected}/{cols.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="absolute z-10 mt-1 w-64 bg-white border rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                      <button onClick={() => toggleGroup(group)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 mb-1.5 font-medium">
                        {allSel ? 'Deselect all' : 'Select all'}
                      </button>
                      {cols.map(col => (
                        <label key={col} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-gray-50 cursor-pointer rounded text-xs">
                          <input type="checkbox" checked={selectedColumns.has(col)}
                            onChange={() => toggleColumn(col)}
                            className="rounded border-gray-300 text-indigo-600" />
                          <span className={selectedColumns.has(col) ? 'text-gray-800' : 'text-gray-400'}>{col}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 text-[11px] text-gray-400">
            {selectedColumns.size} of {serverColumns.length} columns selected
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
          <button onClick={startRun} disabled={running}
            className={`px-5 py-2 rounded text-sm font-medium text-white transition ${
              running ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}>
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running...
              </span>
            ) : 'Start Extraction'}
          </button>

          <span className="text-gray-300 mx-1">|</span>

          <button onClick={downloadXlsx}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition">
            Excel
          </button>
          <button onClick={() => downloadFilteredJson('accounts_receivable_dues_enriched')}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition">
            Dues JSON
          </button>
          <button onClick={() => downloadFilteredJson('accounts_receivable_raw')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition">
            Raw JSON
          </button>
          <button onClick={() => downloadFilteredJson('attendance')}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition">
            Attendance
          </button>
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Live Output
          {running && <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
        </h2>
        <div ref={logRef}
          className="bg-gray-900 text-green-400 rounded p-4 h-96 overflow-y-auto font-mono text-xs leading-relaxed">
          {logs.length === 0 ? (
            <span className="text-gray-500">No output yet. Click "Start Extraction" to begin.</span>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </div>

      {/* Success Modal */}
      {successModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSuccessModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Extraction Complete</h3>
                <p className="text-xs text-gray-500">All data extracted successfully</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-indigo-600">{successModal.rawCount}</div>
                <div className="text-xs text-gray-500">Students Extracted</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600">{successModal.dueCount}</div>
                <div className="text-xs text-gray-500">With Dues</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{successModal.combos}</div>
                <div className="text-xs text-gray-500">Combos Processed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600">{successModal.duration}</div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
            </div>

            {successModal.failedCombos > 0 && (
              <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">
                {successModal.failedCombos} combo(s) failed — check logs for details
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setSuccessModal(null)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                OK
              </button>
              <button onClick={() => { setSuccessModal(null); downloadXlsx(); }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
