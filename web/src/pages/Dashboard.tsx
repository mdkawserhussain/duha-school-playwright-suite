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

export default function Dashboard() {
  const { data, isLoading } = useQuery('dashboard', () => api<DashboardData>('/dashboard'));

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <SummaryCards
        totalDues={data?.totalDues || 0}
        totalRuns={data?.totalRuns || 0}
        latestRun={data?.latestRun}
      />
      <DuesByClass data={data?.byClass || []} />
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
