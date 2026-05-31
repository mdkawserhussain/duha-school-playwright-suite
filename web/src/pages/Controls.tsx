import { useState, useEffect, useRef } from 'react';

export default function Controls() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [year, setYear] = useState('2026');
  const [shift, setShift] = useState('');
  const [cls, setCls] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

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

      // Connect to SSE log stream
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
              {running ? 'Running...' : 'Start Extraction'}
            </button>
          </div>
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
