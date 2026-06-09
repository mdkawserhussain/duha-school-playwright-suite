import { useState, useEffect } from 'react';

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  release: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpus: number;
  hostname: string;
  uptime: number;
}

interface FilePath {
  logsDir: string;
  errorsDir: string;
  outputDir: string;
  envFile: string;
  historyDb: string;
}

interface ErrorScreenshot {
  filename: string;
  timestamp: string;
  path: string;
  sizeKB: number;
}

interface ExtractionLog {
  filename: string;
  path: string;
  sizeKB: number;
  lines: number;
}

interface LogsData {
  system: SystemInfo;
  paths: FilePath;
  errors: ErrorScreenshot[];
  logs: ExtractionLog[];
  errorLog: { content: string; lines: number; sizeKB: number };
}

interface LogContent {
  filename: string;
  content: string;
  lines: number;
  tailLines: number;
}

export default function Logs() {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<LogContent | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    system: true,
    paths: true,
    errors: true,
    logs: true,
    errorLog: true,
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogContent = async (filename: string) => {
    try {
      setLoadingLog(true);
      setSelectedLog(filename);
      const response = await fetch(`/api/logs/content/${filename}?tail=1000`);
      if (!response.ok) throw new Error('Failed to fetch log content');
      const result = await response.json();
      setLogContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch log content');
    } finally {
      setLoadingLog(false);
    }
  };

  const deleteLog = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      const response = await fetch(`/api/logs/${filename}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete log');
      fetchLogs();
      if (selectedLog === filename) {
        setSelectedLog(null);
        setLogContent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-txt-2">Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchLogs}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logs & Debug Info</h1>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-surface-2 text-txt-2 rounded hover:bg-surface-2"
        >
          Refresh
        </button>
      </div>

      {/* System Info */}
      <Section
        title="System Info"
        expanded={expandedSections.system}
        onToggle={() => toggleSection('system')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Node.js" value={data?.system.nodeVersion} />
          <InfoItem label="Platform" value={data?.system.platform} />
          <InfoItem label="Architecture" value={data?.system.arch} />
          <InfoItem label="CPUs" value={`${data?.system.cpus} cores`} />
          <InfoItem label="Total Memory" value={`${data?.system.totalMemoryMB} MB`} />
          <InfoItem label="Free Memory" value={`${data?.system.freeMemoryMB} MB`} />
          <InfoItem label="Hostname" value={data?.system.hostname} />
          <InfoItem label="Uptime" value={formatUptime(data?.system.uptime || 0)} />
        </div>
      </Section>

      {/* File Paths */}
      <Section
        title="File Paths"
        expanded={expandedSections.paths}
        onToggle={() => toggleSection('paths')}
      >
        <div className="space-y-2 font-mono text-sm">
          <PathItem label="Logs Directory" path={data?.paths.logsDir} />
          <PathItem label="Errors Directory" path={data?.paths.errorsDir} />
          <PathItem label="Output Directory" path={data?.paths.outputDir} />
          <PathItem label="Config File" path={data?.paths.envFile} />
          <PathItem label="History Database" path={data?.paths.historyDb} />
        </div>
      </Section>

      {/* Error Screenshots */}
      <Section
        title={`Error Screenshots (${data?.errors.length || 0})`}
        expanded={expandedSections.errors}
        onToggle={() => toggleSection('errors')}
      >
        {data?.errors.length === 0 ? (
          <p className="text-txt-2 text-sm">No error screenshots found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.errors.map(error => (
              <div key={error.filename} className="border rounded-lg overflow-hidden">
                <img
                  src={`/api/logs/errors/${error.filename}`}
                  alt={error.filename}
                  className="w-full h-40 object-cover"
                />
                <div className="p-3 bg-surface-2">
                  <p className="text-sm font-medium text-txt-1">{error.filename}</p>
                  <p className="text-xs text-txt-2 mt-1">{error.sizeKB} KB</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Extraction Logs */}
      <Section
        title={`Extraction Logs (${data?.logs.length || 0})`}
        expanded={expandedSections.logs}
        onToggle={() => toggleSection('logs')}
      >
        {data?.logs.length === 0 ? (
          <p className="text-txt-2 text-sm">No extraction logs found</p>
        ) : (
          <div className="space-y-2">
            {data?.logs.map(log => (
              <div
                key={log.filename}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedLog === log.filename ? 'bg-blue-50 border-blue-200' : 'bg-surface-2'
                }`}
              >
                <div className="flex-1">
                  <button
                    onClick={() => fetchLogContent(log.filename)}
                    className="text-left"
                  >
                    <p className="font-medium text-blue-600 hover:underline">{log.filename}</p>
                    <p className="text-sm text-txt-2">{log.lines} lines, {log.sizeKB} KB</p>
                  </button>
                </div>
                <button
                  onClick={() => deleteLog(log.filename)}
                  className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-900/20 rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Error Log */}
      <Section
        title={`Error Log (${data?.errorLog?.lines || 0} lines, ${data?.errorLog?.sizeKB || 0} KB)`}
        expanded={expandedSections.errorLog}
        onToggle={() => toggleSection('errorLog')}
      >
        {(!data?.errorLog || data.errorLog.lines === 0) ? (
          <p className="text-txt-2 text-sm">No errors logged yet</p>
        ) : (
          <div className="bg-surface-1 rounded-lg overflow-hidden">
            <pre className="p-4 text-sm text-red-400 overflow-auto max-h-96 font-mono leading-relaxed">
              {data.errorLog.content}
            </pre>
          </div>
        )}
      </Section>

      {/* Log Content Viewer */}
      {selectedLog && logContent && (
        <div className="bg-surface-1 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-2">
            <h3 className="text-white font-medium">{logContent.filename}</h3>
            <div className="flex items-center gap-2">
              <span className="text-txt-2 text-sm">{logContent.lines} lines</span>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setLogContent(null);
                }}
                className="text-txt-2 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
          <pre className="p-4 text-sm text-green-400 overflow-auto max-h-96">
            {logContent.content}
          </pre>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-2 border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-surface-2 hover:bg-surface-2"
      >
        <h2 className="font-semibold text-txt-1">{title}</h2>
        <span className="text-txt-2">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-txt-2">{label}</p>
      <p className="font-medium text-txt-1">{value}</p>
    </div>
  );
}

function PathItem({ label, path }: { label: string; path?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-txt-2 w-40 shrink-0">{label}:</span>
      <span className="text-txt-1 break-all">{path}</span>
    </div>
  );
}
