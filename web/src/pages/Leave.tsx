import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

interface LeaveRecord {
  id: number;
  staffName: string;
  leaveType: string;
  leaveTypeShort: string;
  reason: string;
  fromDate: string;
  toDate: string;
  days: number;
  requestDate: string;
  approveDate: string | null;
  status: 'approved' | 'pending' | 'cancelled';
  remainingDays: number;
  totalAllocated: number;
}

interface LeaveSummary {
  staffName: string;
  leaveTypes: {
    [typeName: string]: {
      shortName: string;
      allotted: number;
      used: number;
      remaining: number;
    };
  };
}

interface MonthlyBreakdown {
  staffName: string;
  months: { [month: string]: { [leaveType: string]: number } };
  yearTotal: number;
}

interface LeaveStatus {
  connected: boolean;
  totalRecords: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  lastFetched: string | null;
  staffCount: number;
  jsonFile: boolean;
  jsonModified: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-900/30 text-green-400',
  pending: 'bg-amber-900/30 text-amber-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

export default function Leave() {
  const [tab, setTab] = useState<'records' | 'summary' | 'monthly' | 'download'>('records');
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState({ staff: '', type: '', status: '' });

  const { data: status } = useQuery<LeaveStatus>('leave-status', () =>
    api<LeaveStatus>('/leave/status')
  );

  const { data: records, isLoading: loadingRecords } = useQuery<LeaveRecord[]>(
    ['leave-records', filters],
    () => {
      const params = new URLSearchParams();
      if (filters.staff) params.set('staff', filters.staff);
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      params.set('year', String(year));
      return api<LeaveRecord[]>(`/leave/records?${params}`);
    }
  );

  const { data: summary, isLoading: loadingSummary } = useQuery<LeaveSummary[]>(
    ['leave-summary', year],
    () => api<LeaveSummary[]>(`/leave/summary?year=${year}`)
  );

  const { data: monthly, isLoading: loadingMonthly } = useQuery<MonthlyBreakdown[]>(
    ['leave-monthly', year],
    () => api<MonthlyBreakdown[]>(`/leave/monthly?year=${year}`)
  );

  const handleDownload = () => {
    window.open(`/api/leave/download?year=${year}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-2 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Leave Management</h2>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-surface-2 border border-bdr rounded px-3 py-1.5 text-sm text-txt-1"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatusCard label="Total Records" value={status?.totalRecords ?? 0} />
          <StatusCard label="Approved" value={status?.byStatus?.approved ?? 0} color="text-green-400" />
          <StatusCard label="Pending" value={status?.byStatus?.pending ?? 0} color="text-amber-400" />
          <StatusCard label="Staff" value={status?.staffCount ?? 0} />
          <StatusCard
            label="Last Fetch"
            value={status?.lastFetched ? new Date(status.lastFetched).toLocaleDateString() : 'Never'}
            isText
          />
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 flex-wrap">
          {([
            ['records', 'Records', records?.length ?? 0],
            ['summary', 'Summary', summary?.length ?? 0],
            ['monthly', 'Monthly', monthly?.length ?? 0],
            ['download', 'Download', null],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                tab === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-surface-2 text-txt-2 hover:bg-surface-3'
              }`}
            >
              {label}
              {count !== null && count !== undefined ? ` (${count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Records tab */}
      {tab === 'records' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Filter by staff name..."
              value={filters.staff}
              onChange={e => setFilters(f => ({ ...f, staff: e.target.value }))}
              className="bg-surface-2 border border-bdr rounded px-3 py-1.5 text-sm text-txt-1 placeholder:text-txt-2 w-48"
            />
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="bg-surface-2 border border-bdr rounded px-3 py-1.5 text-sm text-txt-1"
            >
              <option value="">All Types</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Special Leave">Special Leave</option>
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="bg-surface-2 border border-bdr rounded px-3 py-1.5 text-sm text-txt-1"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loadingRecords ? (
            <div className="text-center py-8 text-txt-2">Loading records...</div>
          ) : !records || records.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-txt-2 font-medium">No leave records found</div>
              <div className="text-sm text-txt-2 mt-1">Run an extraction with PORTAL_LEAVE_SYNC=true to import data</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bdr">
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Staff</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Type</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Status</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">From</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">To</th>
                    <th className="p-2 text-center text-sm font-medium text-txt-2">Days</th>
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-bdr hover:bg-surface-3">
                      <td className="p-2 text-sm font-medium">{r.staffName}</td>
                      <td className="p-2 text-sm">
                        <span className="text-txt-2">{r.leaveType}</span>
                        {r.leaveTypeShort && (
                          <span className="ml-1 text-xs text-txt-2">({r.leaveTypeShort})</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-surface-3 text-txt-2'}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-txt-2">{r.fromDate}</td>
                      <td className="p-2 text-sm text-txt-2">{r.toDate}</td>
                      <td className="p-2 text-sm text-center font-medium">{r.days}</td>
                      <td className="p-2 text-sm text-txt-2 max-w-[200px] truncate" title={r.reason}>
                        {r.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          {loadingSummary ? (
            <div className="text-center py-8 text-txt-2">Loading summary...</div>
          ) : !summary || summary.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-txt-2 font-medium">No summary data</div>
              <div className="text-sm text-txt-2 mt-1">Fetch leave records first</div>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.map(s => (
                <div key={s.staffName} className="p-4 bg-surface-2 rounded-lg border border-bdr">
                  <div className="font-semibold text-txt-1 mb-2">{s.staffName}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(s.leaveTypes).map(([typeName, lt]) => (
                      <div key={typeName} className="flex items-center gap-4 text-sm">
                        <span className="text-txt-2 w-28">{typeName} ({lt.shortName})</span>
                        <span className="text-txt-2">
                          {lt.used}/{lt.allotted} used
                        </span>
                        <span className={`font-semibold ${
                          lt.remaining > 2 ? 'text-green-400' :
                          lt.remaining > 0 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {lt.remaining} remaining
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly tab */}
      {tab === 'monthly' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          {loadingMonthly ? (
            <div className="text-center py-8 text-txt-2">Loading monthly data...</div>
          ) : !monthly || monthly.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-txt-2 font-medium">No monthly data</div>
              <div className="text-sm text-txt-2 mt-1">Fetch leave records first</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bdr">
                    <th className="p-2 text-left text-sm font-medium text-txt-2">Staff</th>
                    {MONTHS.map(m => (
                      <th key={m} className="p-2 text-center text-sm font-medium text-txt-2 w-12">
                        {m.slice(0, 3)}
                      </th>
                    ))}
                    <th className="p-2 text-center text-sm font-medium text-txt-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(m => (
                    <tr key={m.staffName} className="border-b border-bdr hover:bg-surface-3">
                      <td className="p-2 text-sm font-medium">{m.staffName}</td>
                      {MONTHS.map(monthName => {
                        const monthData = m.months[monthName];
                        const total = monthData
                          ? Object.values(monthData).reduce((sum, d) => sum + d, 0)
                          : 0;
                        return (
                          <td key={monthName} className="p-2 text-center text-sm">
                            {total > 0 ? (
                              <span className="text-indigo-400 font-medium">{total}</span>
                            ) : (
                              <span className="text-txt-2">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-sm font-bold">
                        {m.yearTotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Download tab */}
      {tab === 'download' && (
        <div className="bg-surface-2 rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📥</div>
            <div className="text-txt-1 font-medium mb-2">Download Leave Report</div>
            <div className="text-sm text-txt-2 mb-6">
              Generate a styled Excel workbook with {year} leave data
            </div>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition"
            >
              Download Excel Report ({year})
            </button>
            {status?.jsonModified && (
              <div className="text-xs text-txt-2 mt-4">
                Data source: {status.jsonModified}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value, color, isText }: {
  label: string;
  value: number | string;
  color?: string;
  isText?: boolean;
}) {
  return (
    <div className="p-3 bg-surface-2 rounded-lg border border-bdr">
      <div className="text-xs text-txt-2 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${color || 'text-txt-1'} ${isText ? 'text-sm' : ''}`}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
