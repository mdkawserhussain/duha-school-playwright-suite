import { useQuery } from 'react-query';
import { api } from '../lib/api';

export default function Trends() {
  const { data, isLoading } = useQuery('trends', () => api<any[]>('/dues/trends'));

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const trends = data || [];
  if (trends.length === 0) {
    return <div className="text-center py-12 text-gray-400">No trend data yet. Run at least 2 extractions to see trends.</div>;
  }

  const maxDue = Math.max(...trends.map((t: any) => t.totalDue || 0));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Dues Over Time</h2>
        <div className="flex items-end gap-2 h-48">
          {trends.reverse().map((t: any) => (
            <div key={t.runId} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-gray-500">৳{((t.totalDue || 0) / 1000).toFixed(0)}k</div>
              <div
                className="w-full bg-indigo-400 rounded-t"
                style={{ height: `${maxDue > 0 ? ((t.totalDue || 0) / maxDue) * 140 : 0}px` }}
              />
              <div className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
