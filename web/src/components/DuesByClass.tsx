interface Props {
  data: Array<{ className: string; totalDue: number; studentCount: number }>;
}

export default function DuesByClass({ data }: Props) {
  if (data.length === 0) return null;

  const maxDue = Math.max(...data.map(d => d.totalDue));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Outstanding Dues by Class</h2>
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.className} className="flex items-center gap-3">
            <div className="w-20 text-sm text-right text-gray-600 truncate">{item.className}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full flex items-center px-2"
                style={{ width: `${maxDue > 0 ? (item.totalDue / maxDue) * 100 : 0}%`, minWidth: '2rem' }}
              >
                <span className="text-xs text-white font-medium">৳{item.totalDue.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-16 text-xs text-gray-400">{item.studentCount} students</div>
          </div>
        ))}
      </div>
    </div>
  );
}
