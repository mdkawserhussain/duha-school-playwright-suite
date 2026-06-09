import { useQuery } from 'react-query';
import { api } from '../lib/api';

export default function RunHistory() {
  const { data, isLoading } = useQuery('runs', () => api<{ runs: any[]; total: number }>('/runs?limit=50'));

  if (isLoading) return <div className="text-center py-12 text-txt-2">Loading...</div>;

  return (
    <div className="bg-surface-2 bg-surface-2 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 text-txt-1">Run History ({data?.total || 0} total)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-txt-2 border-b border-bdr">
              <th className="pb-2">#</th>
              <th className="pb-2">Timestamp</th>
              <th className="pb-2">Duration</th>
              <th className="pb-2">Raw Records</th>
              <th className="pb-2">Due Students</th>
              <th className="pb-2">Failed Combos</th>
            </tr>
          </thead>
          <tbody>
            {data?.runs.map((run: any) => (
              <tr key={run.id} className="border-b border-bdr last:border-0 hover:bg-surface-2 hover:bg-surface-2/50">
                <td className="py-2 text-txt-2">{run.id}</td>
                <td className="py-2 text-txt-2">{new Date(run.timestamp).toLocaleString()}</td>
                <td className="py-2 text-txt-2">{run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : '—'}</td>
                <td className="py-2 text-txt-2">{run.raw_count}</td>
                <td className="py-2 font-medium text-txt-2">{run.due_count}</td>
                <td className="py-2">
                  {run.failed_combos > 0 ? (
                    <span className="text-red-600 font-medium">{run.failed_combos}</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
