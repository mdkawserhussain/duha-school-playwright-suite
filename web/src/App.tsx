import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import RunHistory from './pages/RunHistory';
import Trends from './pages/Trends';
import Controls from './pages/Controls';
import Settings from './pages/Settings';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'runs', label: 'Run History' },
  { key: 'trends', label: 'Trends' },
  { key: 'run', label: 'Controls' },
  { key: 'settings', label: 'Settings' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14">
          <h1 className="text-lg font-bold text-indigo-600 mr-8">School Portal Scraper</h1>
          <div className="flex gap-1">
            {PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => setPage(p.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  page === p.key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'dashboard' && <Dashboard />}
        {page === 'runs' && <RunHistory />}
        {page === 'trends' && <Trends />}
        {page === 'run' && <Controls />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
