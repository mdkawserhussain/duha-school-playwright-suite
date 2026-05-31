import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import SummaryCards from '../components/SummaryCards';
import DuesByClass from '../components/DuesByClass';

interface DashboardData {
  latestRun: any;
  totalRuns: number;
  totalDues: number;
  byClass: Array<{ className: string; totalDue: number; studentCount: number }>;
  recentRuns: any[];
}

interface Student {
  'Student ID': string;
  'Name': string;
  'Class': string;
  'Shift': string;
  'Total Due': number;
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery('dashboard', () => api<DashboardData>('/dashboard'));
  const { data: students } = useQuery<Student[]>('students', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/output/accounts_receivable_dues_enriched_${today}.json`);
    if (!res.ok) return [];
    return res.json();
  }, { retry: false });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const filteredStudents = (students || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s['Name'] || '').toLowerCase().includes(q) ||
      (s['Student ID'] || '').toLowerCase().includes(q) ||
      (s['Class'] || '').toLowerCase().includes(q)
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

      {/* Student Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Students with Dues</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or class..."
            className="border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Class</th>
                  <th className="pb-2">Shift</th>
                  <th className="pb-2 text-right">Total Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 100).map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-500">{s['Student ID']}</td>
                    <td className="py-2 font-medium">{s['Name']}</td>
                    <td className="py-2">{s['Class']}</td>
                    <td className="py-2">{s['Shift']}</td>
                    <td className="py-2 text-right font-medium text-red-600">
                      ৳{(s['Total Due'] || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
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
