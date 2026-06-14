import { useState, useEffect } from 'react';

interface FinancialStatus {
  status: string;
  hasRaw: boolean;
  ledgerCount: number;
  lastUpdated: string | null;
}

interface CashFlowSummary {
  period: { from: string; to: string };
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  incomeByType: Record<string, number>;
  expenseByType: Record<string, number>;
}

export default function Financial() {
  const [status, setStatus] = useState<FinancialStatus | null>(null);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchSummary();
  }, []);

  const fetchStatus = async () => {
    try {
      const resp = await fetch('/api/financial/status');
      const data = await resp.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const resp = await fetch('/api/financial/summary');
      const data = await resp.json();
      if (data.status === 'ready') {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/financial/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_date: fromDate, to_date: toDate, status: 'approved' })
      });

      const data = await resp.json();
      if (data.success) {
        await fetchStatus();
        await fetchSummary();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string) => {
    window.open(`/api/financial/download/${format}`, '_blank');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Financial Reports</h1>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Status</h2>
        {status ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{status.status === 'ready' ? 'Ready' : 'No Data'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ledgers</p>
              <p className="font-medium">{status.ledgerCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">
                {status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>

      {/* Generate Report */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Total Income</p>
              <p className="text-xl font-bold text-green-700">{summary.totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Total Expense</p>
              <p className="text-xl font-bold text-red-700">{summary.totalExpense.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Net Cash Flow</p>
              <p className="text-xl font-bold text-blue-700">{summary.netCashFlow.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Closing Balance</p>
              <p className="text-xl font-bold text-purple-700">{summary.closingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Download Reports</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleDownload('json')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Download JSON
          </button>
          <button
            onClick={() => handleDownload('excel')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}
