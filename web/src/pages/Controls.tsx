import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

export default function Controls() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [year, setYear] = useState('2026');
  const [shift, setShift] = useState('');
  const [cls, setCls] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery('status', () => api<{ running: boolean; pid: number | null }>('/status'), {
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (status && !status.running && running) {
      setRunning(false);
    }
  }, [status, running]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const startRun = async () => {
    setRunning(true);
    setLogs([]);

    const args: string[] = [];
    if (year) args.push('--year', year);
    if (shift) args.push('--shift', shift);
    if (cls) args.push('--class', cls);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args }),
      });
      const { runId } = await res.json();

      const evtSource = new EventSource(`/api/run/${runId}/logs`);
      evtSource.onmessage = (event) => {
        const { message } = JSON.parse(event.data);
        setLogs(prev => [...prev, message]);
      };
      evtSource.onerror = () => {
        setRunning(false);
        evtSource.close();
      };
    } catch {
      setRunning(false);
      setLogs(prev => [...prev, 'Failed to start extraction']);
    }
  };

  const downloadFile = async (prefix: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const url = `/output/${prefix}_${today}.json`;
    const res = await fetch(url);
    if (!res.ok) { alert('File not found'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}_${today}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filter Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Run Extraction</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <input
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Day Shift (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <input
              value={cls}
              onChange={e => setCls(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="One,Two (optional)"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startRun}
              disabled={running}
              className={`w-full py-2 px-4 rounded text-sm font-medium text-white transition ${
                running
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running...
                </span>
              ) : 'Start Extraction'}
            </button>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Export Data</h2>
        <div className="flex gap-3">
          <button onClick={() => downloadFile('accounts_receivable_dues_enriched')}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition">
            Download Dues JSON
          </button>
          <button onClick={() => downloadFile('accounts_receivable_raw')}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition">
            Download Raw JSON
          </button>
          <button onClick={() => downloadFile('attendance')}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition">
            Download Attendance
          </button>
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Live Output
          {running && <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
        </h2>
        <div
          ref={logRef}
          className="bg-gray-900 text-green-400 rounded p-4 h-96 overflow-y-auto font-mono text-xs leading-relaxed"
        >
          {logs.length === 0 ? (
            <span className="text-gray-500">No output yet. Click "Start Extraction" to begin.</span>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
