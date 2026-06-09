import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RunHistory from './pages/RunHistory';
import Trends from './pages/Trends';
import Controls from './pages/Controls';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Payroll from './pages/Payroll';
import Leave from './pages/Leave';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'runs', label: 'History', icon: '📋' },
  { key: 'trends', label: 'Trends', icon: '📈' },
  { key: 'run', label: 'Controls', icon: '▶️' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { key: 'logs', label: 'Logs', icon: '📝' },
  { key: 'payroll', label: 'Payroll', icon: '💰' },
  { key: 'leave', label: 'Leave', icon: '📅' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        aria-label="Toggle navigation"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem 1rem 1rem' }}>
          <div className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            School Portal
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
            Scraper Dashboard
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {PAGES.map(p => (
            <button
              key={p.key}
              onClick={() => { setPage(p.key); setSidebarOpen(false); }}
              className={`sidebar-nav-link ${page === p.key ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            DUHA Payroll
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            International School
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'runs' && <RunHistory />}
        {page === 'trends' && <Trends />}
        {page === 'run' && <Controls />}
        {page === 'whatsapp' && <WhatsApp />}
        {page === 'logs' && <Logs />}
        {page === 'payroll' && <Payroll />}
        {page === 'leave' && <Leave />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
