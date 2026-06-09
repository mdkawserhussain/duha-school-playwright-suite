import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RunHistory from './pages/RunHistory';
import Trends from './pages/Trends';
import Controls from './pages/Controls';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Payroll from './pages/Payroll';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'runs', label: 'History', icon: '📋' },
  { key: 'trends', label: 'Trends', icon: '📈' },
  { key: 'run', label: 'Controls', icon: '▶️' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { key: 'logs', label: 'Logs', icon: '📝' },
  { key: 'payroll', label: 'Payroll', icon: '💰' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className={`min-h-screen ${dark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <nav className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              SP
            </div>
            <h1 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              School Portal Scraper
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => setPage(p.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  page === p.key
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : dark
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{p.icon}</span>
                <span className="hidden md:inline">{p.label}</span>
              </button>
            ))}
            <button
              onClick={() => setDark(!dark)}
              className={`ml-2 p-2 rounded-lg transition ${dark ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'dashboard' && <Dashboard />}
        {page === 'runs' && <RunHistory />}
        {page === 'trends' && <Trends />}
        {page === 'run' && <Controls />}
        {page === 'whatsapp' && <WhatsApp />}
        {page === 'logs' && <Logs />}
        {page === 'payroll' && <Payroll />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
