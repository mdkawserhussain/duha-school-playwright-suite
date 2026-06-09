import { useState, useRef, useEffect, Fragment } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import SummaryCards from '../components/SummaryCards';
import DuesByClass from '../components/DuesByClass';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function parsePaidFromCell(value: any): number {
  const s = String(value ?? '');
  const match = s.match(/paid\s*:\s*([\d,]+)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) || 0 : 0;
}

function parseDueFromCell(value: any): number {
  const s = String(value ?? '');
  const match = s.match(/due\s*:\s*([\d,]+)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) || 0 : 0;
}

function parseTotalDue(value: any): number {
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value ?? '').replace(/,/g, ''));
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

interface DashboardData {
  latestRun: any;
  totalRuns: number;
  totalDues: number;
  byClass: Array<{ className: string; totalDue: number; studentCount: number }>;
  recentRuns: any[];
}

interface Student {
  'User ID': string;
  'Std Name': string;
  '_class': string;
  '_shift': string;
  'Total Due': number | string;
  'Total Paid': number | string;
  [key: string]: any;
}

function StudentDetail({ student, periodMonths }: { student: Student; periodMonths: string[] }) {
  const feeColumns = Object.keys(student).filter(k =>
    !MONTHS.includes(k) &&
    !['Std Name', 'User ID', '_class', '_shift', '_year', 'SL', 'Roll', 'Contact No', 'Total Paid', 'Total Due'].includes(k) &&
    student[k] && String(student[k]).trim() !== ''
  );

  return (
    <div className="p-5 bg-surface-2 rounded-xl border text-sm">
      {/* Student header */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b">
        <div className="w-10 h-10 bg-accent-dim text-txt-1 rounded-full flex items-center justify-center font-bold text-sm">
          {(student['Std Name'] || '?')[0]}
        </div>
        <div>
          <h3 className="font-semibold text-txt-1">{student['Std Name']}</h3>
          <div className="text-xs text-txt-2">ID: {student['User ID']} · {student['_class']} · {student['_shift']}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-txt-2">Total Due</div>
          <div className="text-lg font-bold text-red-600">৳{parseTotalDue(student['Total Due']).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monthly Breakdown */}
        <div>
          <h4 className="font-semibold text-txt-2 mb-2 text-xs uppercase tracking-wide">Monthly Dues</h4>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map(m => {
              const val = student[m] || '';
              const paid = parsePaidFromCell(val);
              const due = parseDueFromCell(val);
              const inPeriod = periodMonths.includes(m);
              const hasValue = paid > 0 || due > 0;
              return (
                <div key={m} className={`px-2 py-1.5 rounded-lg text-xs text-center ${
                  !inPeriod ? 'bg-surface-2 text-txt-2' :
                  due > 0 ? 'bg-red-900/20 border border-red-500/30 text-red-700' :
                  paid > 0 ? 'bg-green-900/20 border border-green-500/30 text-green-700' :
                  'bg-surface-2 border border-bdr text-txt-2'
                }`}>
                  <div className="font-medium text-[10px]">{m.slice(0, 3)}</div>
                  <div className="font-semibold">
                    {hasValue ? `৳${(due > 0 ? due : paid).toLocaleString()}` : '—'}
                  </div>
                  <div className="text-[9px] opacity-70">{due > 0 ? 'Due' : paid > 0 ? 'Paid' : ''}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-right text-xs font-semibold text-red-600">
            Due (period): ৳{periodMonths.reduce((sum, m) => sum + parseDueFromCell(student[m]), 0).toLocaleString()}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div>
          <h4 className="font-semibold text-txt-2 mb-2 text-xs uppercase tracking-wide">Fee Dues</h4>
          <div className="space-y-1">
            {feeColumns.slice(0, 12).map(f => {
              const val = student[f] || '';
              const paid = parsePaidFromCell(val);
              const due = parseDueFromCell(val);
              return (
                <div key={f} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-xs ${due > 0 ? 'bg-red-900/20 border border-red-100' : 'bg-surface-2 border border-bdr'}`}>
                  <span className="text-txt-2 truncate">{f}</span>
                  <span className={`font-medium shrink-0 ml-2 ${due > 0 ? 'text-red-600' : 'text-txt-2'}`}>
                    {due > 0 ? `৳${due.toLocaleString()}` : paid > 0 ? `৳${paid.toLocaleString()}` : '—'}
                    {due > 0 && <span className="text-[9px] ml-1 opacity-60">DUE</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dashboard-period') || '[]'); } catch { return []; }
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery('dashboard', () => api<DashboardData>('/dashboard'));
  const { data: students } = useQuery<Student[]>('students', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/output/accounts_receivable_dues_enriched_${today}.json`);
    if (!res.ok) return [];
    return res.json();
  }, { retry: false });

  const periodMonths = getPeriodMonths(selectedMonths);

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => {
      const next = prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
      localStorage.setItem('dashboard-period', JSON.stringify(next));
      return next;
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) return <div className="text-center py-12 text-txt-2">Loading...</div>;

  const searchResults = search.trim()
    ? (students || []).filter(s => {
        const q = search.toLowerCase();
        return (
          (s['Std Name'] || '').toLowerCase().includes(q) ||
          (s['User ID'] || '').toLowerCase().includes(q) ||
          (s['_class'] || '').toLowerCase().includes(q)
        );
      }).slice(0, 10)
    : [];

  const selectedStudent = selectedStudentId
    ? (students || []).find(s => s['User ID'] === selectedStudentId) || null
    : null;

  return (
    <div className="space-y-6">
      <SummaryCards
        totalDues={data?.totalDues || 0}
        totalRuns={data?.totalRuns || 0}
        latestRun={data?.latestRun}
      />
      <DuesByClass data={data?.byClass || []} />

      {/* Student Search */}
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Students with Dues</h2>
          {/* Period Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-txt-2 mr-1">Period:</span>
            {MONTHS.map(m => (
              <button
                key={m}
                onClick={() => toggleMonth(m)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition ${
                  selectedMonths.includes(m)
                    ? 'bg-accent-dim text-txt-1 border-accent/30'
                    : 'bg-surface-2 text-txt-2 border-bdr hover:bg-surface-2'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
            {selectedMonths.length > 0 && (
              <button
                onClick={() => { setSelectedMonths([]); localStorage.removeItem('dashboard-period'); }}
                className="ml-1 text-[10px] text-txt-2 hover:text-txt-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Input with Dropdown */}
        <div ref={searchRef} className="relative mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedStudentId(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, ID, or class..."
                className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setSelectedStudentId(null); setShowDropdown(false); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-2 hover:text-txt-2"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-surface-2 border rounded-xl shadow-lg max-h-80 overflow-y-auto">
              {searchResults.map((s) => {
                const periodDue = periodMonths.reduce((sum, m) => sum + parseDueFromCell(s[m]), 0);
                const totalDue = parseTotalDue(s['Total Due']);
                return (
                  <button
                    key={s['User ID']}
                    onClick={() => {
                      setSelectedStudentId(s['User ID']);
                      setShowDropdown(false);
                      setSearch(s['Std Name']);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent-dim text-left transition border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent-dim text-accent rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {(s['Std Name'] || '?')[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-txt-1">{s['Std Name']}</div>
                        <div className="text-xs text-txt-2">ID: {s['User ID']} · {s['_class']} · {s['_shift']}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {selectedMonths.length > 0 && (
                        <div className="text-xs text-txt-2">
                          Period: <span className="font-medium text-red-500">৳{periodDue.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="text-sm font-semibold text-red-600">৳{totalDue.toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {showDropdown && search.trim() && searchResults.length === 0 && (
            <div className="absolute z-20 mt-1 w-full bg-surface-2 border rounded-xl shadow-lg p-4 text-center text-txt-2 text-sm">
              No students match "{search}"
            </div>
          )}
        </div>

        {/* Selected Student Detail */}
        {selectedStudent && (
          <StudentDetail student={selectedStudent} periodMonths={periodMonths} />
        )}

        {/* Empty state */}
        {!selectedStudent && !search && (
          <div className="text-center py-8 text-txt-2">
            Type a student name, ID, or class to search
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {data?.recentRuns && data.recentRuns.length > 0 && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-txt-2 border-b">
                <th className="pb-2">Time</th>
                <th className="pb-2">Duration</th>
                <th className="pb-2">Raw</th>
                <th className="pb-2">Due</th>
                <th className="pb-2">Failed</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.map((run: any) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(run.timestamp).toLocaleString()}</td>
                  <td className="py-2">{run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : '—'}</td>
                  <td className="py-2">{run.raw_count}</td>
                  <td className="py-2">{run.due_count}</td>
                  <td className="py-2">{run.failed_combos > 0 ? <span className="text-red-600">{run.failed_combos}</span> : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
