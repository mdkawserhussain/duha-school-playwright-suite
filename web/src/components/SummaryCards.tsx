interface Props {
  totalDues: number;
  totalRuns: number;
  latestRun: any;
}

export default function SummaryCards({ totalDues, totalRuns, latestRun }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="text-sm text-txt-2">Total Outstanding</div>
        <div className="text-2xl font-bold text-red-600 mt-1">
          ৳{totalDues.toLocaleString()}
        </div>
      </div>
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="text-sm text-txt-2">Total Runs</div>
        <div className="text-2xl font-bold text-accent mt-1">{totalRuns}</div>
      </div>
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="text-sm text-txt-2">Last Run</div>
        <div className="text-2xl font-bold text-green-600 mt-1">
          {latestRun ? new Date(latestRun.timestamp).toLocaleDateString() : 'Never'}
        </div>
        {latestRun && (
          <div className="text-xs text-txt-2 mt-1">
            {latestRun.due_count} due students
          </div>
        )}
      </div>
    </div>
  );
}
