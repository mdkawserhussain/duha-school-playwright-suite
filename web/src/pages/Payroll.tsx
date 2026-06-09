import { useState, useEffect, useRef } from 'react';

const API = '';

interface StatusData {
  jsAgv8Connected: boolean;
  jsAgv8Url: string;
  hasConfig: boolean;
  hasParsedJson: boolean;
  staffCount: number;
  month: number;
  year: number;
  locked: boolean;
  lastAuditStatus: string;
  lastAuditDate: string | null;
}

interface StaffSalary {
  name: string;
  role: string;
  basic: number;
  allowance: number;
  pdays: number;
  absent: number;
  leave: number;
  late: number;
  over20: number;
  lateMins: number[];
  perDay: number;
  gross: number;
  tiffin: number;
  absDed: number;
  lateDed: number;
  totalDed: number;
  net: number;
  ot: number;
  increment: number;
  bonus: number;
  pfDeduction: number;
  pfReturn: number;
  markings: string;
  dailyLogs: Array<{ day: number; time: string }>;
  exceptions: Record<string, any>;
  absentDates: number[];
  lateInfo: string[];
  calculationNote: string;
  acct: string;
  excNote: string;
}

interface PreviewData {
  year: number;
  month: number;
  schoolName: string;
  policies: {
    standardTiming: string;
    tiffinRate: number;
    over20Fine: number;
    latePenalties: Array<{ min: number; fine: number }>;
  };
  staff: StaffSalary[];
  summary: {
    totalStaff: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    totalTiffin: number;
  };
}

interface VerifyData {
  connected: boolean;
  reportText: string;
  overallStatus: string;
  mathErrors: Array<{ name: string; calcNet: number; reportNet: number; status: string }>;
}

interface NameMatch {
  portal: string;
  config: string;
}

interface NamesData {
  matched: NameMatch[];
  unmatchedPortal: string[];
  unmatchedConfig: string[];
}

interface FileEntry {
  name: string;
  size: number;
  date: string;
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Overview Panel ──────────────────────────────────────────────────────────

function OverviewPanel({ status, onRunPipeline }: { status: StatusData | null; onRunPipeline: (phases: number[]) => void }) {
  const [selectedPhases, setSelectedPhases] = useState([1, 3, 5, 8]);
  const [running, setRunning] = useState(false);

  const togglePhase = (p: number) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleRun = async () => {
    setRunning(true);
    await onRunPipeline(selectedPhases);
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className={`px-4 py-3 rounded-lg border ${status?.jsAgv8Connected ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <div className="text-xs text-gray-500 dark:text-gray-400">js-agv8 Status</div>
          <div className={`text-lg font-bold ${status?.jsAgv8Connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {status?.jsAgv8Connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          <div className="text-xs text-gray-500">{status?.jsAgv8Url || 'N/A'}</div>
        </div>

        <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Month</div>
          <div className="text-lg font-bold dark:text-white">{MONTH_NAMES[status?.month || 0]} {status?.year || ''}</div>
        </div>

        <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Staff</div>
          <div className="text-lg font-bold dark:text-white">{status?.staffCount || 0}</div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${status?.locked ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="text-xs text-gray-500 dark:text-gray-400">Config</div>
          <div className={`text-lg font-bold ${status?.locked ? 'text-yellow-600 dark:text-yellow-400' : 'dark:text-white'}`}>
            {status?.locked ? '🔒 Locked' : '🔓 Unlocked'}
          </div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${status?.lastAuditStatus === 'passed' ? 'border-green-500/30 bg-green-500/10' : status?.lastAuditStatus === 'failed' ? 'border-red-500/30 bg-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="text-xs text-gray-500 dark:text-gray-400">Last Audit</div>
          <div className={`text-lg font-bold ${status?.lastAuditStatus === 'passed' ? 'text-green-600 dark:text-green-400' : status?.lastAuditStatus === 'failed' ? 'text-red-600 dark:text-red-400' : 'dark:text-white'}`}>
            {status?.lastAuditStatus === 'passed' ? '✅ Passed' : status?.lastAuditStatus === 'failed' ? '❌ Failed' : 'Unknown'}
          </div>
          {status?.lastAuditDate && (
            <div className="text-xs text-gray-500">{new Date(status.lastAuditDate).toLocaleDateString()}</div>
          )}
        </div>
      </div>

      {/* Run Pipeline */}
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-sm font-semibold mb-3 dark:text-white">Run Pipeline</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { id: 1, label: 'Phase 1: Parse', desc: 'Parse att.docx' },
            { id: 3, label: 'Phase 3: Reports', desc: 'Generate reports' },
            { id: 5, label: 'Phase 5: Verify', desc: 'Audit & verify' },
            { id: 8, label: 'Phase 8: WhatsApp', desc: 'WhatsApp links' },
          ].map(p => (
            <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedPhases.includes(p.id)}
                onChange={() => togglePhase(p.id)}
                className="rounded"
              />
              <div>
                <div className="text-sm font-medium dark:text-white">{p.label}</div>
                <div className="text-xs text-gray-500">{p.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={handleRun}
          disabled={running || !status?.jsAgv8Connected}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {running ? '⏳ Running...' : '▶️ Run Pipeline'}
        </button>
        {!status?.jsAgv8Connected && (
          <p className="text-xs text-red-500 mt-2">js-agv8 server not connected. Start it first: cd js-agv8 && node server.js</p>
        )}
      </div>
    </div>
  );
}

// ─── Preview Panel ───────────────────────────────────────────────────────────

function PreviewPanel({ data }: { data: PreviewData | null }) {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  if (!data) return <div className="text-gray-500 dark:text-gray-400">Loading preview...</div>;

  const sorted = [...data.staff].sort((a: any, b: any) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  const filtered = filter
    ? sorted.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.role.toLowerCase().includes(filter.toLowerCase()))
    : sorted;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-indigo-400 transition dark:text-gray-300"
    >
      {children} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Filter by name or role..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm dark:text-white w-64"
        />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} staff | Net Total: <span className="font-semibold text-indigo-600 dark:text-indigo-400">BDT {fmt(data.summary.totalNet)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortHeader field="name">Name</SortHeader>
              <SortHeader field="role">Role</SortHeader>
              <SortHeader field="pdays">PDays</SortHeader>
              <SortHeader field="absent">Absent</SortHeader>
              <SortHeader field="late">Late</SortHeader>
              <SortHeader field="basic">Basic</SortHeader>
              <SortHeader field="tiffin">Tiffin</SortHeader>
              <SortHeader field="totalDed">Deductions</SortHeader>
              <SortHeader field="net">Net</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(s => (
              <>
                <tr
                  key={s.name}
                  onClick={() => setExpandedRow(expandedRow === s.name ? null : s.name)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <td className="px-3 py-2 font-medium dark:text-white">{s.name}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{s.role}</td>
                  <td className="px-3 py-2 text-center tabular-nums dark:text-white">{s.pdays}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-red-600 dark:text-red-400">{s.absent}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-yellow-600 dark:text-yellow-400">{s.late}</td>
                  <td className="px-3 py-2 text-right tabular-nums dark:text-white">{fmt(s.basic)}</td>
                  <td className="px-3 py-2 text-right tabular-nums dark:text-white">{fmt(s.tiffin)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400">{fmt(s.totalDed)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-600 dark:text-green-400">{fmt(s.net)}</td>
                </tr>
                {expandedRow === s.name && (
                  <tr key={`${s.name}-detail`}>
                    <td colSpan={9} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Per Day:</span>{' '}
                          <span className="font-medium dark:text-white">{fmt(s.perDay)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross:</span>{' '}
                          <span className="font-medium dark:text-white">{fmt(s.gross)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Absent Ded:</span>{' '}
                          <span className="font-medium text-red-600 dark:text-red-400">{fmt(s.absDed)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Late Ded:</span>{' '}
                          <span className="font-medium text-red-600 dark:text-red-400">{fmt(s.lateDed)}</span>
                        </div>
                        {s.ot > 0 && <div><span className="text-gray-500">OT:</span> <span className="font-medium text-green-600">{fmt(s.ot)}</span></div>}
                        {s.increment > 0 && <div><span className="text-gray-500">Increment:</span> <span className="font-medium text-green-600">{fmt(s.increment)}</span></div>}
                        {s.bonus > 0 && <div><span className="text-gray-500">Bonus:</span> <span className="font-medium text-green-600">{fmt(s.bonus)}</span></div>}
                        {s.pfDeduction > 0 && <div><span className="text-gray-500">PF Ded:</span> <span className="font-medium text-red-600">{fmt(s.pfDeduction)}</span></div>}
                        {s.pfReturn > 0 && <div><span className="text-gray-500">PF Return:</span> <span className="font-medium text-green-600">{fmt(s.pfReturn)}</span></div>}
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-500">Markings:</span>{' '}
                          <span className="font-mono text-xs dark:text-gray-300">{s.markings || '—'}</span>
                        </div>
                        {s.calculationNote && (
                          <div className="col-span-2 md:col-span-4 text-gray-500 font-mono text-[10px] break-all">
                            {s.calculationNote}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Verify Panel ────────────────────────────────────────────────────────────

function VerifyPanel({ data }: { data: VerifyData | null }) {
  if (!data) return <div className="text-gray-500 dark:text-gray-400">Loading verification...</div>;

  return (
    <div className="space-y-4">
      <div className={`px-4 py-3 rounded-lg border ${data.overallStatus === 'passed' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
        <div className={`text-lg font-bold ${data.overallStatus === 'passed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {data.overallStatus === 'passed' ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED'}
        </div>
        <div className="text-sm text-gray-500 mt-1">{data.mathErrors.length} math errors found</div>
      </div>

      {data.mathErrors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase dark:text-gray-300">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase dark:text-gray-300">Calc Net</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase dark:text-gray-300">Report Net</th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.mathErrors.map((err, i) => (
                <tr key={i} className="bg-red-50 dark:bg-red-900/20">
                  <td className="px-3 py-2 font-medium dark:text-white">{err.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums dark:text-white">{fmt(err.calcNet)}</td>
                  <td className="px-3 py-2 text-right tabular-nums dark:text-white">{fmt(err.reportNet)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      {err.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.reportText && (
        <details className="rounded-lg border border-gray-200 dark:border-gray-700">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium dark:text-white">
            View Full Audit Report
          </summary>
          <pre className="px-4 py-3 text-xs bg-gray-50 dark:bg-gray-800 overflow-auto max-h-96 dark:text-gray-300 font-mono">
            {data.reportText}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Config Panel ────────────────────────────────────────────────────────────

function ConfigPanel({ config, onSave }: { config: any; onSave: (data: any) => void }) {
  const [editData, setEditData] = useState<any>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEditData(config); }, [config]);

  if (!editData) return <div className="text-gray-500 dark:text-gray-400">Loading config...</div>;

  const updateStaff = (idx: number, field: string, value: any) => {
    const updated = { ...editData };
    updated.staff = [...editData.staff];
    updated.staff[idx] = { ...updated.staff[idx], [field]: value };
    setEditData(updated);
  };

  const updateException = (idx: number, field: string, value: any) => {
    const updated = { ...editData };
    updated.staff = [...editData.staff];
    updated.staff[idx] = {
      ...updated.staff[idx],
      exceptions: { ...updated.staff[idx].exceptions, [field]: value },
    };
    setEditData(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(editData);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold dark:text-white">
          Staff Configuration ({editData.staff?.length || 0} entries)
        </h3>
        <div className="flex items-center gap-2">
          {editData.locked && (
            <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              🔒 Config is locked
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || editData.locked}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : '💾 Save Config'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase dark:text-gray-300">Name</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase dark:text-gray-300">Basic</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase dark:text-gray-300">Allowance</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase dark:text-gray-300">Role</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase dark:text-gray-300">Skip Late</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase dark:text-gray-300">Skip Absent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {editData.staff?.map((s: any, idx: number) => (
              <tr key={s.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2 font-medium dark:text-white whitespace-nowrap">{s.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={s.basic}
                    onChange={e => updateStaff(idx, 'basic', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={s.allowance}
                    onChange={e => updateStaff(idx, 'allowance', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={s.role || ''}
                    onChange={e => updateStaff(idx, 'role', e.target.value)}
                    className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={s.exceptions?.skipLateCheck || false}
                    onChange={e => updateException(idx, 'skipLateCheck', e.target.checked)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={s.exceptions?.skipAbsentDeduction || false}
                    onChange={e => updateException(idx, 'skipAbsentDeduction', e.target.checked)}
                    className="rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Files Panel ─────────────────────────────────────────────────────────────

function FilesPanel({ files }: { files: FileEntry[] | null }) {
  if (!files) return <div className="text-gray-500 dark:text-gray-400">Loading files...</div>;
  if (files.length === 0) return <div className="text-gray-500 dark:text-gray-400">No output files found.</div>;

  const groups: Record<string, FileEntry[]> = { Reports: [], Bank: [], WhatsApp: [], Audit: [], Other: [] };
  for (const f of files) {
    if (f.name.startsWith('audit')) groups.Audit.push(f);
    else if (f.name.startsWith('Bank')) groups.Bank.push(f);
    else if (f.name.startsWith('WhatsApp') || f.name.startsWith('wa-')) groups.WhatsApp.push(f);
    else if (f.name.endsWith('.docx') || f.name.endsWith('.csv')) groups.Reports.push(f);
    else groups.Other.push(f);
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, entries]) => {
        if (entries.length === 0) return null;
        return (
          <div key={group}>
            <h4 className="text-sm font-semibold mb-2 dark:text-white">{group}</h4>
            <div className="grid gap-2">
              {entries.map(f => (
                <div key={f.name} className="flex items-center justify-between px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div>
                    <div className="text-sm font-medium dark:text-white">{f.name}</div>
                    <div className="text-xs text-gray-500">{fmtBytes(f.size)} · {new Date(f.date).toLocaleDateString()}</div>
                  </div>
                  <a
                    href={`/api/payroll/files/${encodeURIComponent(f.name)}`}
                    download
                    className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 transition"
                  >
                    ⬇ Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Names Panel ─────────────────────────────────────────────────────────────

function NamesPanel({ data }: { data: NamesData | null }) {
  if (!data) return <div className="text-gray-500 dark:text-gray-400">Loading name matches...</div>;
  if (data.error) return <div className="text-gray-500 dark:text-gray-400">{data.error}</div>;

  const total = data.matched.length + data.unmatchedPortal.length;
  const matchRate = total > 0 ? Math.round((data.matched.length / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10">
          <div className="text-xs text-gray-500">Matched</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {data.matched.length}/{total} ({matchRate}%)
          </div>
        </div>
        <div className="px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <div className="text-xs text-gray-500">Portal Unmatched</div>
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{data.unmatchedPortal.length}</div>
        </div>
        <div className="px-4 py-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
          <div className="text-xs text-gray-500">Config Unmatched</div>
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{data.unmatchedConfig.length}</div>
        </div>
      </div>

      {data.unmatchedPortal.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-yellow-600 dark:text-yellow-400">
            ⚠️ Portal names not in config
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.unmatchedPortal.map(name => (
              <span key={name} className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.unmatchedConfig.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">
            ⚠️ Config staff not in portal attendance
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.unmatchedConfig.map(name => (
              <span key={name} className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.matched.length > 0 && (
        <details className="rounded-lg border border-gray-200 dark:border-gray-700">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium dark:text-white">
            View All Matches ({data.matched.length})
          </summary>
          <div className="px-4 py-3 max-h-64 overflow-y-auto">
            <table className="min-w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.matched.map((m, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4 text-gray-600 dark:text-gray-400">{m.portal}</td>
                    <td className="py-1 text-gray-400">→</td>
                    <td className="py-1 pl-4 font-medium dark:text-white">{m.config}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Main Payroll Page ───────────────────────────────────────────────────────

const SUB_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'preview', label: 'Preview' },
  { key: 'verify', label: 'Verify' },
  { key: 'config', label: 'Config' },
  { key: 'files', label: 'Files' },
  { key: 'names', label: 'Names' },
];

export default function Payroll() {
  const [subTab, setSubTab] = useState('overview');
  const [status, setStatus] = useState<StatusData | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [verify, setVerify] = useState<VerifyData | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [names, setNames] = useState<NamesData | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/status`);
      setStatus(await res.json());
    } catch { setStatus(null); }
  };

  const fetchPreview = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/preview`);
      setPreview(await res.json());
    } catch { setPreview(null); }
  };

  const fetchVerify = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/verify`);
      setVerify(await res.json());
    } catch { setVerify(null); }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/config`);
      setConfig(await res.json());
    } catch { setConfig(null); }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/files`);
      setFiles(await res.json());
    } catch { setFiles(null); }
  };

  const fetchNames = async () => {
    try {
      const res = await fetch(`${API}/api/payroll/names`);
      setNames(await res.json());
    } catch { setNames(null); }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (subTab === 'preview') fetchPreview();
    if (subTab === 'verify') fetchVerify();
    if (subTab === 'config') fetchConfig();
    if (subTab === 'files') fetchFiles();
    if (subTab === 'names') fetchNames();
  }, [subTab]);

  const handleRunPipeline = async (phases: number[]) => {
    try {
      await fetch(`${API}/api/payroll/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases }),
      });
      fetchStatus();
    } catch (err) {
      console.error('Pipeline run failed:', err);
    }
  };

  const handleSaveConfig = async (data: any) => {
    try {
      await fetch(`${API}/api/payroll/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchConfig();
    } catch (err) {
      console.error('Config save failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Payroll — {status ? `${MONTH_NAMES[status.month]} ${status.year}` : 'Loading...'}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">DUHA INTERNATIONAL SCHOOL</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              subTab === tab.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-panel content */}
      {subTab === 'overview' && <OverviewPanel status={status} onRunPipeline={handleRunPipeline} />}
      {subTab === 'preview' && <PreviewPanel data={preview} />}
      {subTab === 'verify' && <VerifyPanel data={verify} />}
      {subTab === 'config' && <ConfigPanel config={config} onSave={handleSaveConfig} />}
      {subTab === 'files' && <FilesPanel files={files} />}
      {subTab === 'names' && <NamesPanel data={names} />}
    </div>
  );
}
