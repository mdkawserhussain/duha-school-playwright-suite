import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: Array<{ className: string; totalDue: number; studentCount: number }>;
}

export default function DuesByClass({ data }: Props) {
  if (data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d.className),
    datasets: [
      {
        label: 'Outstanding Dues (৳)',
        data: data.map(d => d.totalDue),
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `৳${ctx.raw.toLocaleString()} (${data[ctx.dataIndex]?.studentCount || 0} students)`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => `৳${(v / 1000).toFixed(0)}k` },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Outstanding Dues by Class</h2>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
