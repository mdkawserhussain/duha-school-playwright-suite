import { useState, useEffect } from 'react';

export default function Settings() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  const update = (key: string, val: string) => {
    setConfig(prev => ({ ...prev, [key]: val }));
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
      setMsg('Saved successfully');
    } catch {
      setMsg('Failed to save');
    }
    setSaving(false);
  };

  const fields = [
    'PORTAL_BASE_URL', 'PORTAL_USERNAME', 'PORTAL_PASSWORD',
    'PORTAL_YEAR', 'PORTAL_SHIFT', 'PORTAL_CLASS',
    'SCHOOL_PROFILE',
    'GENERATE_HTML_DASHBOARD', 'GENERATE_WHATSAPP_DASHBOARD',
    'ENABLE_TELEGRAM_NOTIFICATIONS', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
    'EXTRACT_PAYMENT_LEDGER', 'EXTRACT_WAIVERS',
    'ENABLE_CLOUD_SYNC', 'GOOGLE_DRIVE_FOLDER_ID', 'GOOGLE_SHEETS_SPREADSHEET_ID',
    'ENABLE_DESKTOP_NOTIFICATIONS', 'ENABLE_GHOST_CURSOR', 'HEARTBEAT_URL',
    'ENABLE_HISTORY_DB', 'MAX_OUTPUT_AGE_DAYS',
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Configuration</h2>
      <div className="space-y-3">
        {fields.map(key => (
          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">{key}</label>
            <input
              value={config[key] || ''}
              onChange={e => update(key, e.target.value)}
              className="col-span-2 border rounded px-3 py-2 text-sm"
              type={key.includes('PASSWORD') ? 'password' : 'text'}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </div>
  );
}
