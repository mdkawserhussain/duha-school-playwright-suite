import { useQuery } from 'react-query';
import { api } from '../lib/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function Trends() {
  const { data, isLoading } = useQuery('trends', () => api<any[]>('/dues/trends'));

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const trends = (data || []).reverse();
  if (trends.length === 0) {
    return <div className="text-center py-12 text-gray-400">No trend data yet. Run at least 2 extractions to see trends.</div>;
  }

  const chartData = {
    labels: trends.map((t: any) => new Date(t.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Total Outstanding',
        data: trends.map((t: any) => t.totalDue || 0),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Students with Dues',
        data: trends.map((t: any) => t.studentCount || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            if (ctx.datasetIndex === 0) return `Dues: ৳${ctx.raw.toLocaleString()}`;
            return `Students: ${ctx.raw}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        ticks: { callback: (v: any) => `৳${(v / 1000).toFixed(0)}k` },
        title: { display: true, text: 'Outstanding Dues' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Students' },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Dues Over Time</h2>
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Run Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th>
                <th className="pb-2">Total Dues</th>
                <th className="pb-2">Students</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t: any) => (
                <tr key={t.runId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="py-2 font-medium">৳{(t.totalDue || 0).toLocaleString()}</td>
                  <td className="py-2">{t.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
