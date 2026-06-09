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
        <div className={`px-4 py-3 rounded-lg border ${status?.jsAgv8Connected ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'}`}>
          <div className="text-xs text-txt-2">js-agv8 Status</div>
          <div className={`text-lg font-bold ${status?.jsAgv8Connected ? 'text-green-400' : 'text-red-400'}`}>
            {status?.jsAgv8Connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          <div className="text-xs text-txt-2">{status?.jsAgv8Url || 'N/A'}</div>
        </div>

        <div className="px-4 py-3 rounded-lg border border-bdr">
          <div className="text-xs text-txt-2">Month</div>
          <div className="text-lg font-bold text-txt-1">{MONTH_NAMES[status?.month || 0]} {status?.year || ''}</div>
        </div>

        <div className="px-4 py-3 rounded-lg border border-bdr">
          <div className="text-xs text-txt-2">Staff</div>
          <div className="text-lg font-bold text-txt-1">{status?.staffCount || 0}</div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${status?.locked ? 'border-yellow-500/30 bg-yellow-900/20' : 'border-bdr'}`}>
          <div className="text-xs text-txt-2">Config</div>
          <div className={`text-lg font-bold ${status?.locked ? 'text-yellow-400' : 'text-txt-1'}`}>
            {status?.locked ? '🔒 Locked' : '🔓 Unlocked'}
          </div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${status?.lastAuditStatus === 'passed' ? 'border-green-500/30 bg-green-900/20' : status?.lastAuditStatus === 'failed' ? 'border-red-500/30 bg-red-900/20' : 'border-bdr'}`}>
          <div className="text-xs text-txt-2">Last Audit</div>
          <div className={`text-lg font-bold ${status?.lastAuditStatus === 'passed' ? 'text-green-400' : status?.lastAuditStatus === 'failed' ? 'text-red-400' : 'text-txt-1'}`}>
            {status?.lastAuditStatus === 'passed' ? '✅ Passed' : status?.lastAuditStatus === 'failed' ? '❌ Failed' : 'Unknown'}
          </div>
          {status?.lastAuditDate && (
            <div className="text-xs text-txt-2">{new Date(status.lastAuditDate).toLocaleDateString()}</div>
          )}
        </div>
      </div>

      {/* Run Pipeline */}
      <div className="p-4 rounded-lg border border-bdr bg-surface-2 bg-surface-2">
        <h3 className="text-sm font-semibold mb-3 text-txt-1">Run Pipeline</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { id: 1, label: 'Phase 1: Parse', desc: 'Parse att.docx' },
            { id: 3, label: 'Phase 3: Reports', desc: 'Generate reports' },
            { id: 5, label: 'Phase 5: Verify', desc: 'Audit & verify' },
            { id: 8, label: 'Phase 8: WhatsApp', desc: 'WhatsApp links' },
          ].map(p => (
            <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded border border-bdr cursor-pointer hover:bg-surface-2 hover:bg-surface-2">
              <input
                type="checkbox"
                checked={selectedPhases.includes(p.id)}
                onChange={() => togglePhase(p.id)}
                className="rounded"
              />
              <div>
                <div className="text-sm font-medium text-txt-1">{p.label}</div>
                <div className="text-xs text-txt-2">{p.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={handleRun}
          disabled={running || !status?.jsAgv8Connected}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
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

  if (!data) return <div className="text-txt-2">Loading preview...</div>;

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
      className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-accent transition text-txt-2"
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
          className="px-3 py-1.5 rounded border border-bdr-strong bg-surface-2 bg-surface-2 text-sm text-txt-1 w-64"
        />
        <div className="text-sm text-txt-2">
          {filtered.length} staff | Net Total: <span className="font-semibold text-accent">BDT {fmt(data.summary.totalNet)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-bdr">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-2">
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
          <tbody className="divide-y divide-bdr">
            {filtered.map(s => (
              <>
                <tr
                  key={s.name}
                  onClick={() => setExpandedRow(expandedRow === s.name ? null : s.name)}
                  className="cursor-pointer hover:bg-surface-2 hover:bg-surface-2/50 transition"
                >
                  <td className="px-3 py-2 font-medium text-txt-1">{s.name}</td>
                  <td className="px-3 py-2 text-txt-2">{s.role}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-txt-1">{s.pdays}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-red-400">{s.absent}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-yellow-400">{s.late}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-txt-1">{fmt(s.basic)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-txt-1">{fmt(s.tiffin)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmt(s.totalDed)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-400">{fmt(s.net)}</td>
                </tr>
                {expandedRow === s.name && (
                  <tr key={`${s.name}-detail`}>
                    <td colSpan={9} className="px-4 py-3 bg-surface-2/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-txt-2">Per Day:</span>{' '}
                          <span className="font-medium text-txt-1">{fmt(s.perDay)}</span>
                        </div>
                        <div>
                          <span className="text-txt-2">Gross:</span>{' '}
                          <span className="font-medium text-txt-1">{fmt(s.gross)}</span>
                        </div>
                        <div>
                          <span className="text-txt-2">Absent Ded:</span>{' '}
                          <span className="font-medium text-red-400">{fmt(s.absDed)}</span>
                        </div>
                        <div>
                          <span className="text-txt-2">Late Ded:</span>{' '}
                          <span className="font-medium text-red-400">{fmt(s.lateDed)}</span>
                        </div>
                        {s.ot > 0 && <div><span className="text-txt-2">OT:</span> <span className="font-medium text-green-600">{fmt(s.ot)}</span></div>}
                        {s.increment > 0 && <div><span className="text-txt-2">Increment:</span> <span className="font-medium text-green-600">{fmt(s.increment)}</span></div>}
                        {s.bonus > 0 && <div><span className="text-txt-2">Bonus:</span> <span className="font-medium text-green-600">{fmt(s.bonus)}</span></div>}
                        {s.pfDeduction > 0 && <div><span className="text-txt-2">PF Ded:</span> <span className="font-medium text-red-600">{fmt(s.pfDeduction)}</span></div>}
                        {s.pfReturn > 0 && <div><span className="text-txt-2">PF Return:</span> <span className="font-medium text-green-600">{fmt(s.pfReturn)}</span></div>}
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-txt-2">Markings:</span>{' '}
                          <span className="font-mono text-xs text-txt-2">{s.markings || '—'}</span>
                        </div>
                        {s.calculationNote && (
                          <div className="col-span-2 md:col-span-4 text-txt-2 font-mono text-[10px] break-all">
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
  if (!data) return <div className="text-txt-2">Loading verification...</div>;

  return (
    <div className="space-y-4">
      <div className={`px-4 py-3 rounded-lg border ${data.overallStatus === 'passed' ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'}`}>
        <div className={`text-lg font-bold ${data.overallStatus === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
          {data.overallStatus === 'passed' ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED'}
        </div>
        <div className="text-sm text-txt-2 mt-1">{data.mathErrors.length} math errors found</div>
      </div>

      {data.mathErrors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-bdr">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-txt-2">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-txt-2">Calc Net</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-txt-2">Report Net</th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-txt-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {data.mathErrors.map((err, i) => (
                <tr key={i} className="bg-red-900/20 bg-red-900/20">
                  <td className="px-3 py-2 font-medium text-txt-1">{err.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-txt-1">{fmt(err.calcNet)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-txt-1">{fmt(err.reportNet)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded text-xs bg-red-900 text-red-300">
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
        <details className="rounded-lg border border-bdr">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-txt-1">
            View Full Audit Report
          </summary>
          <pre className="px-4 py-3 text-xs bg-surface-2 overflow-auto max-h-96 text-txt-2 font-mono">
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

  if (!editData) return <div className="text-txt-2">Loading config...</div>;

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
        <h3 className="text-sm font-semibold text-txt-1">
          Staff Configuration ({editData.staff?.length || 0} entries)
        </h3>
        <div className="flex items-center gap-2">
          {editData.locked && (
            <span className="px-2 py-1 rounded text-xs bg-yellow-900 text-yellow-300">
              🔒 Config is locked
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || editData.locked}
            className="px-4 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : '💾 Save Config'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-bdr max-h-[600px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-2 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-txt-2">Name</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-txt-2">Basic</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-txt-2">Allowance</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-txt-2">Role</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-txt-2">Skip Late</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-txt-2">Skip Absent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {editData.staff?.map((s: any, idx: number) => (
              <tr key={s.name} className="hover:bg-surface-2 hover:bg-surface-2/50">
                <td className="px-3 py-2 font-medium text-txt-1 whitespace-nowrap">{s.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={s.basic}
                    onChange={e => updateStaff(idx, 'basic', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border border-bdr-strong bg-surface-2 bg-surface-2 text-sm text-txt-1 tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={s.allowance}
                    onChange={e => updateStaff(idx, 'allowance', parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border border-bdr-strong bg-surface-2 bg-surface-2 text-sm text-txt-1 tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={s.role || ''}
                    onChange={e => updateStaff(idx, 'role', e.target.value)}
                    className="w-24 px-2 py-1 rounded border border-bdr-strong bg-surface-2 bg-surface-2 text-sm text-txt-1"
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
  if (!files) return <div className="text-txt-2">Loading files...</div>;
  if (files.length === 0) return <div className="text-txt-2">No output files found.</div>;

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
            <h4 className="text-sm font-semibold mb-2 text-txt-1">{group}</h4>
            <div className="grid gap-2">
              {entries.map(f => (
                <div key={f.name} className="flex items-center justify-between px-3 py-2 rounded border border-bdr bg-surface-2 bg-surface-2">
                  <div>
                    <div className="text-sm font-medium text-txt-1">{f.name}</div>
                    <div className="text-xs text-txt-2">{fmtBytes(f.size)} · {new Date(f.date).toLocaleDateString()}</div>
                  </div>
                  <a
                    href={`/api/payroll/files/${encodeURIComponent(f.name)}`}
                    download
                    className="px-3 py-1 text-xs bg-accent-dim text-txt-1 rounded hover:bg-accent-dim transition"
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
  if (!data) return <div className="text-txt-2">Loading name matches...</div>;
  if (data.error) return <div className="text-txt-2">{data.error}</div>;

  const total = data.matched.length + data.unmatchedPortal.length;
  const matchRate = total > 0 ? Math.round((data.matched.length / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="px-4 py-3 rounded-lg border border-green-500/30 bg-green-900/20">
          <div className="text-xs text-txt-2">Matched</div>
          <div className="text-lg font-bold text-green-400">
            {data.matched.length}/{total} ({matchRate}%)
          </div>
        </div>
        <div className="px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-900/20">
          <div className="text-xs text-txt-2">Portal Unmatched</div>
          <div className="text-lg font-bold text-yellow-400">{data.unmatchedPortal.length}</div>
        </div>
        <div className="px-4 py-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
          <div className="text-xs text-txt-2">Config Unmatched</div>
          <div className="text-lg font-bold text-orange-400">{data.unmatchedConfig.length}</div>
        </div>
      </div>

      {data.unmatchedPortal.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-yellow-400">
            ⚠️ Portal names not in config
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.unmatchedPortal.map(name => (
              <span key={name} className="px-2 py-1 rounded text-xs bg-yellow-900 text-yellow-300">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.unmatchedConfig.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-orange-400">
            ⚠️ Config staff not in portal attendance
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.unmatchedConfig.map(name => (
              <span key={name} className="px-2 py-1 rounded text-xs bg-orange-900 text-orange-300">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.matched.length > 0 && (
        <details className="rounded-lg border border-bdr">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-txt-1">
            View All Matches ({data.matched.length})
          </summary>
          <div className="px-4 py-3 max-h-64 overflow-y-auto">
            <table className="min-w-full text-xs">
              <tbody className="divide-y divide-bdr">
                {data.matched.map((m, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4 text-txt-2">{m.portal}</td>
                    <td className="py-1 text-txt-2">→</td>
                    <td className="py-1 pl-4 font-medium text-txt-1">{m.config}</td>
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
        <h2 className="text-xl font-bold text-txt-1">Payroll — {status ? `${MONTH_NAMES[status.month]} ${status.year}` : 'Loading...'}</h2>
        <p className="text-sm text-txt-2">DUHA INTERNATIONAL SCHOOL</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-bdr">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              subTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-txt-2 hover:text-txt-2 hover:text-txt-2'
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
