import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

interface DuesColumn {
  name: string;
  amount: number;
}

interface StaffLink {
  name: string;
  phone: string;
  message: string;
  link: string;
}

interface ParentLink {
  studentName: string;
  studentId: string;
  className: string;
  parentPhone: string;
  totalDue: number;
  periodDue: number;
  monthlyDues: DuesColumn[];
  feeDues: DuesColumn[];
  message: string;
  link: string;
}

interface SalarySlipEntry {
  name: string;
  phone: string;
  net: string;
  note: string;
  message: string;
}

interface SalarySlipsData {
  status: 'no_data' | 'ready' | 'error' | 'generating' | 'sending';
  hasDataFile: boolean;
  hasReport: boolean;
  reportFile: string | null;
  monthName: string | null;
  schoolName: string | null;
  filename: string | null;
  entries: SalarySlipEntry[];
  message?: string;
}

export default function WhatsApp() {
  const [tab, setTab] = useState<'salary' | 'staff' | 'parent' | 'verify'>('salary');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const { data: salaryData, isLoading: salaryLoading, refetch: salaryRefetch } = useQuery<SalarySlipsData>(
    'salary-slips',
    () => api<SalarySlipsData>('/salary-slips'),
    { refetchInterval: 5000 }
  );

  const { data: linksData, isLoading: linksLoading, refetch: linksRefetch } = useQuery('whatsapp-links', () =>
    api<{ staffLinks: StaffLink[]; parentLinks: ParentLink[]; generatedAt?: string; periodMonths?: string[] }>('/whatsapp/links')
  );

  const staffLinks = linksData?.staffLinks || [];
  const parentLinks = linksData?.parentLinks || [];
  const generatedAt = linksData?.generatedAt;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api<{ success: boolean; message: string; entries: SalarySlipEntry[] }>(
        '/salary-slips/generate',
        { method: 'POST' }
      );
      alert(result.message);
      salaryRefetch();
    } catch (err) {
      alert('Generate failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!confirm('This will send WhatsApp messages to all staff. Continue?')) return;
    setSending(true);
    try {
      const result = await api<{ success: boolean; message: string }>(
        '/salary-slips/send',
        { method: 'POST' }
      );
      alert(result.message);
    } catch (err) {
      alert('Send failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (isFinal = false) => {
    setVerifyRunning(true);
    setVerifyResult(null);
    setVerifyStatus(null);
    try {
      const result = await api<{ success: boolean; status: string; report: string }>(
        '/verify/run',
        {
          method: 'POST',
          body: JSON.stringify({ isFinal })
        }
      );
      setVerifyResult(result.report);
      setVerifyStatus(result.status);
    } catch (err) {
      setVerifyResult('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setVerifyStatus('error');
    } finally {
      setVerifyRunning(false);
    }
  };

  const openAllLinks = async (links: string[], delayMs = 2000) => {
    setSending(true);
    for (let i = 0; i < links.length; i++) {
      window.open(links[i], '_blank');
      if (i < links.length - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    setSending(false);
  };

  const openSalaryLinks = async () => {
    if (!salaryData?.entries) return;
    setSending(true);
    for (let i = 0; i < salaryData.entries.length; i++) {
      const entry = salaryData.entries[i];
      const phone = entry.phone.replace(/[^0-9]/g, '');
      if (phone.length >= 11) {
        const msg = encodeURIComponent(entry.message);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      }
      if (i < salaryData.entries.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">WhatsApp Messaging</h2>
          <div className="flex items-center gap-3">
            {generatedAt && (
              <span className="text-xs text-txt-2">
                Generated: {new Date(generatedAt).toLocaleString()}
              </span>
            )}
            <button
              onClick={() => {
                salaryRefetch();
                linksRefetch();
              }}
              className="px-3 py-1.5 bg-surface-2 hover:bg-surface-2 rounded text-sm font-medium transition"
            >
              Refresh
            </button>
            <a
              href="/output/WhatsApp-Links-Dashboard.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition"
            >
              Open Dashboard
            </a>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('salary')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'salary'
                ? 'bg-green-600 text-white'
                : 'bg-surface-2 text-txt-2 hover:bg-surface-2'
            }`}
          >
            Salary Slips ({salaryData?.entries?.length || 0})
          </button>
          <button
            onClick={() => setTab('staff')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'staff'
                ? 'bg-green-600 text-white'
                : 'bg-surface-2 text-txt-2 hover:bg-surface-2'
            }`}
          >
            Staff ({staffLinks.length})
          </button>
          <button
            onClick={() => setTab('parent')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'parent'
                ? 'bg-green-600 text-white'
                : 'bg-surface-2 text-txt-2 hover:bg-surface-2'
            }`}
          >
            Parents ({parentLinks.length})
          </button>
          <button
            onClick={() => setTab('verify')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'verify'
                ? 'bg-blue-600 text-white'
                : 'bg-surface-2 text-txt-2 hover:bg-surface-2'
            }`}
          >
            Verify
          </button>
        </div>
      </div>

      {/* Salary Slips Tab */}
      {tab === 'salary' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          {/* Status Info */}
          {salaryData && (
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-txt-2">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  salaryData.status === 'ready' ? 'bg-green-900/30 text-green-400' :
                  salaryData.status === 'no_data' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {salaryData.status === 'ready' ? 'Data Ready' :
                   salaryData.status === 'no_data' ? 'No Data' : salaryData.status}
                </span>
              </div>
              {salaryData.monthName && (
                <div className="flex items-center gap-2">
                  <span className="text-txt-2">Period:</span>
                  <span className="text-txt-1 font-medium">{salaryData.monthName}</span>
                </div>
              )}
              {salaryData.entries.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-txt-2">Staff:</span>
                  <span className="text-txt-1 font-medium">{salaryData.entries.length}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                generating
                  ? 'bg-surface-3 text-txt-2 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {generating ? 'Generating...' : 'Generate from Report'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !salaryData?.entries?.length}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                sending || !salaryData?.entries?.length
                  ? 'bg-surface-3 text-txt-2 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {sending ? 'Sending...' : 'Send All via WhatsApp'}
            </button>
            <button
              onClick={openSalaryLinks}
              disabled={!salaryData?.entries?.length}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                !salaryData?.entries?.length
                  ? 'bg-surface-3 text-txt-2 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              Open in Browser
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-400 mb-2">Workflow</h3>
            <ol className="text-sm text-txt-2 space-y-1 list-decimal list-inside">
              <li>Click "Generate from Report" to create/update the data file</li>
              <li>Edit the data file if needed (optional)</li>
              <li>Click "Send All via WhatsApp" to auto-send messages</li>
            </ol>
          </div>

          {/* Entries List */}
          {salaryLoading ? (
            <div className="text-center py-8 text-txt-2">Loading...</div>
          ) : !salaryData?.entries?.length ? (
            <div className="text-center py-8 text-txt-2">
              No salary slip data found. Click "Generate from Report" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {salaryData.entries.map((entry, i) => {
                const phone = entry.phone.replace(/[^0-9]/g, '');
                const hasValidPhone = phone.length >= 11;
                const msg = encodeURIComponent(entry.message);
                const waLink = hasValidPhone ? `https://wa.me/${phone}?text=${msg}` : '#';

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      hasValidPhone ? 'bg-surface-2 border-surface-3' : 'bg-red-900/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-txt-1">{entry.name}</div>
                      <div className="text-sm text-txt-2">
                        {entry.phone || 'No phone'} | Net: BDT {entry.net}
                      </div>
                      {!hasValidPhone && (
                        <div className="text-xs text-red-400 mt-1">Invalid phone number</div>
                      )}
                    </div>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                        hasValidPhone
                          ? 'bg-green-900/20 hover:bg-green-600 text-white'
                          : 'bg-surface-3 text-txt-2 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        if (!hasValidPhone) e.preventDefault();
                      }}
                    >
                      Send
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Staff panel */}
      {tab === 'staff' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-txt-2">Staff Salary Slips</h3>
            <button
              onClick={() => openAllLinks(staffLinks.map(s => s.link))}
              disabled={sending || staffLinks.length === 0}
              className={`px-4 py-2 rounded text-sm font-medium text-white transition ${
                sending || staffLinks.length === 0
                  ? 'bg-surface-3 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {sending ? 'Sending...' : `Send All (${staffLinks.length})`}
            </button>
          </div>

          {linksLoading ? (
            <div className="text-center py-8 text-txt-2">Loading links...</div>
          ) : staffLinks.length === 0 ? (
            <div className="text-center py-8 text-txt-2">
              No staff links found. Run an extraction first.
            </div>
          ) : (
            <div className="space-y-3">
              {staffLinks.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                  <div>
                    <div className="font-semibold text-txt-1">{s.name}</div>
                    <div className="text-sm text-txt-2">{s.phone || 'No phone'}</div>
                  </div>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-900/20 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition"
                  >
                    Send
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parent panel */}
      {tab === 'parent' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-txt-2">Parent Due Reminders</h3>
            <button
              onClick={() => openAllLinks(parentLinks.map(p => p.link))}
              disabled={sending || parentLinks.length === 0}
              className={`px-4 py-2 rounded text-sm font-medium text-white transition ${
                sending || parentLinks.length === 0
                  ? 'bg-surface-3 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {sending ? 'Sending...' : `Send All (${parentLinks.length})`}
            </button>
          </div>

          {linksLoading ? (
            <div className="text-center py-8 text-txt-2">Loading links...</div>
          ) : parentLinks.length === 0 ? (
            <div className="text-center py-8 text-txt-2">
              No parent links found. Generate WhatsApp messages from the Dashboard first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-surface-2">
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Student</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Class</th>
                    <th className="p-2 text-right text-sm font-medium text-txt-2">Period Due</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Monthly Dues</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Fee Dues</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parentLinks.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-surface-2">
                      <td className="p-2 text-sm">
                        <div className="font-medium">{p.studentName}</div>
                        <div className="text-xs text-txt-2">{p.studentId}</div>
                      </td>
                      <td className="p-2 text-sm">{p.className}</td>
                      <td className="p-2 text-sm font-semibold text-right text-red-600">
                        BDT {p.periodDue.toLocaleString()}
                      </td>
                      <td className="p-2">
                        {p.monthlyDues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.monthlyDues.map((d, j) => (
                              <span key={j} className="inline-block px-1.5 py-0.5 bg-red-900/20 text-red-600 text-[10px] rounded font-medium">
                                {d.name}: ৳{d.amount.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-txt-2 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        {p.feeDues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.feeDues.map((d, j) => (
                              <span key={j} className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded font-medium">
                                {d.name}: ৳{d.amount.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-txt-2 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-900/20 hover:bg-green-600 text-white rounded font-semibold text-sm transition"
                        >
                          Send
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verify Tab */}
      {tab === 'verify' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleVerify(false)}
              disabled={verifyRunning}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                verifyRunning
                  ? 'bg-surface-3 text-txt-2 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {verifyRunning ? 'Running...' : 'Run Verification'}
            </button>
            <button
              onClick={() => handleVerify(true)}
              disabled={verifyRunning}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                verifyRunning
                  ? 'bg-surface-3 text-txt-2 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {verifyRunning ? 'Running...' : 'Run Final Verification'}
            </button>
          </div>

          {verifyStatus && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
              verifyStatus === 'passed'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-red-900/30 text-red-400'
            }`}>
              {verifyStatus === 'passed' ? 'Verification PASSED' : 'Verification FAILED'}
            </div>
          )}

          {verifyResult ? (
            <div className="bg-surface-1 rounded-lg overflow-hidden">
              <pre className="p-4 text-sm text-green-400 overflow-auto max-h-[600px] font-mono leading-relaxed">
                {verifyResult}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-txt-2">
              Click "Run Verification" to check data consistency
            </div>
          )}
        </div>
      )}
    </div>
  );
}
