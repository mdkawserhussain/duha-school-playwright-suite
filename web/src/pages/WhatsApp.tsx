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

export default function WhatsApp() {
  const [tab, setTab] = useState<'staff' | 'parent'>('staff');
  const [sending, setSending] = useState(false);

  const { data, isLoading, refetch } = useQuery('whatsapp-links', () =>
    api<{ staffLinks: StaffLink[]; parentLinks: ParentLink[]; generatedAt?: string; periodMonths?: string[] }>('/whatsapp/links')
  );

  const staffLinks = data?.staffLinks || [];
  const parentLinks = data?.parentLinks || [];
  const generatedAt = data?.generatedAt;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">WhatsApp Messaging</h2>
          <div className="flex items-center gap-3">
            {generatedAt && (
              <span className="text-xs text-gray-400">
                Generated: {new Date(generatedAt).toLocaleString()}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition"
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
            onClick={() => setTab('staff')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'staff'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Staff Salary Slips ({staffLinks.length})
          </button>
          <button
            onClick={() => setTab('parent')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              tab === 'parent'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Parent Due Reminders ({parentLinks.length})
          </button>
        </div>
      </div>

      {/* Staff panel */}
      {tab === 'staff' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Staff Salary Slips</h3>
            <button
              onClick={() => openAllLinks(staffLinks.map(s => s.link))}
              disabled={sending || staffLinks.length === 0}
              className={`px-4 py-2 rounded text-sm font-medium text-white transition ${
                sending || staffLinks.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {sending ? 'Sending...' : `Send All (${staffLinks.length})`}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading links...</div>
          ) : staffLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No staff links found. Run an extraction first.
            </div>
          ) : (
            <div className="space-y-3">
              {staffLinks.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800">{s.name}</div>
                    <div className="text-sm text-gray-500">{s.phone || 'No phone'}</div>
                  </div>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition"
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Parent Due Reminders</h3>
            <button
              onClick={() => openAllLinks(parentLinks.map(p => p.link))}
              disabled={sending || parentLinks.length === 0}
              className={`px-4 py-2 rounded text-sm font-medium text-white transition ${
                sending || parentLinks.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {sending ? 'Sending...' : `Send All (${parentLinks.length})`}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading links...</div>
          ) : parentLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No parent links found. Generate WhatsApp messages from the Dashboard first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left text-sm font-medium text-gray-600">Student</th>
                    <th className="p-2 text-left text-sm font-medium text-gray-600">Class</th>
                    <th className="p-2 text-right text-sm font-medium text-gray-600">Period Due</th>
                    <th className="p-2 text-left text-sm font-medium text-gray-600">Monthly Dues</th>
                    <th className="p-2 text-left text-sm font-medium text-gray-600">Fee Dues</th>
                    <th className="p-2 text-left text-sm font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parentLinks.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">
                        <div className="font-medium">{p.studentName}</div>
                        <div className="text-xs text-gray-400">{p.studentId}</div>
                      </td>
                      <td className="p-2 text-sm">{p.className}</td>
                      <td className="p-2 text-sm font-semibold text-right text-red-600">
                        BDT {p.periodDue.toLocaleString()}
                      </td>
                      <td className="p-2">
                        {p.monthlyDues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.monthlyDues.map((d, j) => (
                              <span key={j} className="inline-block px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded font-medium">
                                {d.name}: ৳{d.amount.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
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
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded font-semibold text-sm transition"
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
    </div>
  );
}
