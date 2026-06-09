import { useState, useEffect } from 'react';

interface FieldDef {
  key: string;
  label: string;
  desc: string;
  type: 'text' | 'password' | 'toggle' | 'number';
  group: string;
  placeholder?: string;
}

const FIELDS: FieldDef[] = [
  // Portal
  { key: 'PORTAL_BASE_URL', label: 'Portal URL', desc: 'Base URL of the school portal (e.g. https://duhais.eduexpert24.com)', type: 'text', group: 'Portal', placeholder: 'https://...' },
  { key: 'PORTAL_USERNAME', label: 'Username', desc: 'Login username for the portal', type: 'text', group: 'Portal' },
  { key: 'PORTAL_PASSWORD', label: 'Password', desc: 'Login password (stored locally in .env)', type: 'password', group: 'Portal' },
  { key: 'PORTAL_YEAR', label: 'Academic Year', desc: 'Year filter for extraction (e.g. 2026)', type: 'text', group: 'Portal', placeholder: '2026' },
  { key: 'PORTAL_SHIFT', label: 'Shift', desc: 'Filter by shift (leave empty for all)', type: 'text', group: 'Portal', placeholder: 'Day Shift (optional)' },
  { key: 'PORTAL_CLASS', label: 'Class', desc: 'Filter by class (leave empty for all)', type: 'text', group: 'Portal', placeholder: 'One,Two (optional)' },
  { key: 'SCHOOL_PROFILE', label: 'School Profile', desc: 'School profile identifier', type: 'text', group: 'Portal', placeholder: 'default' },

  // Features
  { key: 'GENERATE_HTML_DASHBOARD', label: 'HTML Dashboard', desc: 'Generate a standalone HTML dashboard after extraction', type: 'toggle', group: 'Features' },
  { key: 'GENERATE_WHATSAPP_DASHBOARD', label: 'WhatsApp Dashboard', desc: 'Generate a WhatsApp message preview dashboard', type: 'toggle', group: 'Features' },
  { key: 'EXTRACT_PAYMENT_LEDGER', label: 'Payment Ledger', desc: 'Also extract detailed payment ledger data', type: 'toggle', group: 'Features' },
  { key: 'EXTRACT_WAIVERS', label: 'Fee Waivers', desc: 'Also extract fee waiver records', type: 'toggle', group: 'Features' },

  // Notifications
  { key: 'ENABLE_TELEGRAM_NOTIFICATIONS', label: 'Telegram Notifications', desc: 'Send extraction summaries via Telegram bot', type: 'toggle', group: 'Notifications' },
  { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', desc: 'Telegram bot token from @BotFather', type: 'text', group: 'Notifications', placeholder: '123456:ABC-...' },
  { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', desc: 'Telegram chat/group ID to send notifications to', type: 'text', group: 'Notifications', placeholder: '-100...' },

  // Cloud Sync
  { key: 'ENABLE_CLOUD_SYNC', label: 'Cloud Sync', desc: 'Upload results to Google Drive / Sheets after extraction', type: 'toggle', group: 'Cloud Sync' },
  { key: 'GOOGLE_DRIVE_FOLDER_ID', label: 'Drive Folder ID', desc: 'Google Drive folder ID for uploads', type: 'text', group: 'Cloud Sync', placeholder: '1aBcDeFg...' },
  { key: 'GOOGLE_SHEETS_SPREADSHEET_ID', label: 'Sheets ID', desc: 'Google Sheets spreadsheet ID for data sync', type: 'text', group: 'Cloud Sync', placeholder: '1aBcDeFg...' },

  // UI
  { key: 'ENABLE_DESKTOP_NOTIFICATIONS', label: 'Desktop Notifications', desc: 'Show desktop notifications when extraction completes', type: 'toggle', group: 'UI' },
  { key: 'ENABLE_GHOST_CURSOR', label: 'Ghost Cursor', desc: 'Show a visible cursor during browser automation (helpful for debugging)', type: 'toggle', group: 'UI' },
  { key: 'HEARTBEAT_URL', label: 'Heartbeat URL', desc: 'URL to ping after each run (for monitoring UptimeRobot, etc.)', type: 'text', group: 'UI', placeholder: 'https://...' },

  // Advanced
  { key: 'ENABLE_HISTORY_DB', label: 'History Database', desc: 'Track run history and trends in SQLite (required for Trends tab)', type: 'toggle', group: 'Advanced' },
  { key: 'MAX_OUTPUT_AGE_DAYS', label: 'Max Output Age', desc: 'Delete output files older than N days (0 = keep forever)', type: 'number', group: 'Advanced', placeholder: '30' },
  { key: 'PORTAL_COLUMNS', label: 'Export Columns', desc: 'Comma-separated column names for exports (CLI default + new browser sessions). UI can override per-session.', type: 'text', group: 'Advanced', placeholder: 'Std Name,User ID,Roll,...' },
];

const GROUP_ORDER = ['Portal', 'Features', 'Notifications', 'Cloud Sync', 'UI', 'Advanced'];

export default function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [needsRestart, setNeedsRestart] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUP_ORDER));

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  const update = (key: string, val: string) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setNeedsRestart(true);
    setMsg('');
  };

  const toggleBool = (key: string) => {
    const current = config[key]?.toLowerCase();
    const next = current === 'true' || current === '1' ? 'false' : 'true';
    update(key, next);
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setMsg('Settings saved');
    } catch {
      setMsg('Failed to save');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/config/test');
      const data = await res.json();
      setTestResult({ ok: data.ok, msg: data.message });
    } catch {
      setTestResult({ ok: false, msg: 'Could not reach server' });
    }
    setTesting(false);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    fields: FIELDS.filter(f => f.group === g),
  }));

  return (
    <div className="space-y-4">
      {needsRestart && (
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-amber-400 text-lg">&#9888;</span>
          <span className="text-sm text-amber-300">
            Settings changed. Restart the server for changes to take effect.
          </span>
        </div>
      )}

      {grouped.map(({ group, fields }) => (
        <div key={group} className="bg-surface-2 bg-surface-2 rounded-lg shadow overflow-hidden">
          <button
            onClick={() => toggleGroup(group)}
            className="w-full flex items-center justify-between px-5 py-3 bg-surface-2 bg-surface-2 hover:bg-surface-2 transition"
          >
            <span className="text-sm font-semibold text-txt-1">{group}</span>
            <span className="text-txt-2 text-xs">{expandedGroups.has(group) ? '▲' : '▼'}</span>
          </button>

          {expandedGroups.has(group) && (
            <div className="divide-y divide-bdr">
              {fields.map(field => (
                <div key={field.key} className="px-5 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium text-txt-2">{field.label}</label>
                    <p className="text-xs text-txt-2 mt-0.5">{field.desc}</p>
                  </div>
                  <div className="md:col-span-9">
                    {field.type === 'toggle' ? (
                      <button
                        onClick={() => toggleBool(field.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config[field.key]?.toLowerCase() === 'true' || config[field.key] === '1'
                            ? 'bg-accent'
                            : 'bg-surface-2'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-surface-2 transition-transform ${
                            config[field.key]?.toLowerCase() === 'true' || config[field.key] === '1'
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : field.type === 'password' ? (
                      <div className="relative">
                        <input
                          value={config[field.key] || ''}
                          onChange={e => update(field.key, e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          className="w-full border border-bdr-strong bg-surface-2 text-txt-1 rounded px-3 py-1.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-accent"
                          placeholder={field.placeholder}
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-2 hover:text-txt-2 text-xs"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    ) : (
                      <input
                        value={config[field.key] || ''}
                        onChange={e => update(field.key, e.target.value)}
                        type={field.type === 'number' ? 'number' : 'text'}
                        className="w-full border border-bdr-strong bg-surface-2 text-txt-1 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Actions */}
      <div className="bg-surface-2 bg-surface-2 rounded-lg shadow p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-accent text-white px-5 py-2 rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={testConnection}
            disabled={testing}
            className="bg-surface-2 text-txt-2 px-5 py-2 rounded text-sm font-medium hover:bg-surface-2 disabled:opacity-50 transition"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {msg && <span className="text-sm text-green-600">{msg}</span>}

          {testResult && (
            <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.ok ? '\u2713' : '\u2717'} {testResult.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
