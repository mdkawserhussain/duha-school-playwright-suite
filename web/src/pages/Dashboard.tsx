import { useState, Fragment } from 'react';
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
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Breakdown */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Monthly Dues</h4>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map(m => {
              const val = student[m] || '';
              const paid = parsePaidFromCell(val);
              const due = parseDueFromCell(val);
              const inPeriod = periodMonths.includes(m);
              return (
                <div key={m} className={`px-2 py-1 rounded text-xs ${!inPeriod ? 'bg-gray-100 text-gray-400' : due > 0 ? 'bg-red-50 text-red-700' : paid > 0 ? 'bg-green-50 text-green-700' : 'bg-white text-gray-400'}`}>
                  <div className="font-medium">{m.slice(0, 3)}</div>
                  <div>{due > 0 ? `৳${due.toLocaleString()}` : paid > 0 ? `৳${paid.toLocaleString()}` : '—'}</div>
                  <div className="text-[10px]">{due > 0 ? 'Due' : paid > 0 ? 'Paid' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Fee Dues</h4>
          <div className="space-y-1">
            {feeColumns.slice(0, 10).map(f => {
              const val = student[f] || '';
              const paid = parsePaidFromCell(val);
              const due = parseDueFromCell(val);
              return (
                <div key={f} className={`flex justify-between px-2 py-1 rounded text-xs ${due > 0 ? 'bg-red-50' : 'bg-white'}`}>
                  <span className="text-gray-600 truncate">{f}</span>
                  <span className={`font-medium ${due > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {due > 0 ? `৳${due.toLocaleString()}` : paid > 0 ? `৳${paid.toLocaleString()}` : '—'}
                    {due > 0 && <span className="text-red-400 ml-1">Due</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Period-filtered Due Total */}
          <div className="mt-3 pt-2 border-t flex justify-between text-sm font-semibold">
            <span>Total Due (period)</span>
            <span className="text-red-600">
              ৳{periodMonths.reduce((sum, m) => sum + parseDueFromCell(student[m]), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dashboard-period') || '[]'); } catch { return []; }
  });

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

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const filteredStudents = (students || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s['Std Name'] || '').toLowerCase().includes(q) ||
      (s['User ID'] || '').toLowerCase().includes(q) ||
      (s['_class'] || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <SummaryCards
        totalDues={data?.totalDues || 0}
        totalRuns={data?.totalRuns || 0}
        latestRun={data?.latestRun}
      />
      <DuesByClass data={data?.byClass || []} />

      {/* Student Search with Period Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Students with Dues</h2>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Period:</span>
              {MONTHS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMonth(m)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition ${
                    selectedMonths.includes(m)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
              {selectedMonths.length > 0 && (
                <button
                  onClick={() => { setSelectedMonths([]); localStorage.removeItem('dashboard-period'); }}
                  className="ml-1 text-[10px] text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or class..."
              className="border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Class</th>
                    <th className="pb-2">Shift</th>
                    <th className="pb-2 text-right">Due (period)</th>
                    <th className="pb-2 text-right">Total Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.slice(0, 100).map((s, i) => {
                    const periodDue = periodMonths.reduce((sum, m) => sum + parseDueFromCell(s[m]), 0);
                    const isExpanded = selectedStudent === s['User ID'];
                    return (
                      <Fragment key={i}>
                        <tr
                          className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-indigo-50' : ''}`}
                          onClick={() => setSelectedStudent(isExpanded ? null : s['User ID'])}
                        >
                          <td className="py-2 text-gray-500">{s['User ID']}</td>
                          <td className="py-2 font-medium">{s['Std Name']}</td>
                          <td className="py-2">{s['_class']}</td>
                          <td className="py-2">{s['_shift']}</td>
                          <td className="py-2 text-right font-medium text-red-600">
                            {selectedMonths.length > 0 ? `৳${periodDue.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 text-right font-medium text-red-600">
                            ৳{parseTotalDue(s['Total Due']).toLocaleString()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6}>
                              <StudentDetail student={s} periodMonths={periodMonths} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
            {filteredStudents.length > 100 && (
              <div className="text-center py-2 text-gray-400 text-sm">
                Showing 100 of {filteredStudents.length} students
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {search ? 'No students match your search' : 'No student data available. Run an extraction first.'}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {data?.recentRuns && data.recentRuns.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
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
