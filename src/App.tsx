
import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, BarChart3, Settings, ShieldAlert, LogOut, ArrowLeft, RefreshCw, UserCheck, Sun, Moon } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import CustomerProfile from './components/CustomerProfile';
import ReportsAnalytics from './pages/ReportsAnalytics';
import AdminPanel from './pages/AdminPanel';
import { Customer, UserSession } from './types';

const THEME_STORAGE_KEY = 'smart-khata-theme';
const SESSION_USER_KEY = 'smart_khata_session_user';
const SESSION_TOKEN_KEY = 'smart_khata_session_token';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  );
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return null;
  });
  const [view, setView] = useState<'landing' | 'dashboard' | 'profile' | 'multi-profile' | 'reports' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(SESSION_USER_KEY)) {
      return 'dashboard';
    }
    return 'landing';
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setAuthenticatedUser = (
    session: UserSession | null,
    nextView: 'dashboard' | 'landing' = 'dashboard',
    token?: string
  ) => {
    setUser(session);
    if (session) {
      window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session));
      if (token) window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_USER_KEY);
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    setCustomers([]);
    setSelectedCustomer(null);
    setSelectedCustomers([]);
    setSessionKey(prev => prev + 1);
    setView(nextView);
  };

  // Load backend session details and ledger items
  const checkSessionAndLoadData = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error(`Session check failed (HTTP ${res.status}).`);

      const status = await res.json();
      if (status.user) {
        setUser(status.user);
        window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(status.user));
        setView(currentView => currentView === 'landing' ? 'dashboard' : currentView);
        await refreshCustomers();
      } else {
        setAuthenticatedUser(null, 'landing');
      }
    } catch (err) {
      console.error('Connection to backend failed:', err);
      if (!window.localStorage.getItem(SESSION_USER_KEY)) {
        setAuthenticatedUser(null, 'landing');
      }
    }
  };

  const refreshCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const list = await res.json();
        setCustomers(list);
        
        // If we currently have a selected customer, refresh their profile state as well
        if (selectedCustomer) {
          const refreshed = list.find((c: Customer) => c.id === selectedCustomer.id);
          if (refreshed) setSelectedCustomer(refreshed);
        }
        setSelectedCustomers(current => current.map(selected =>
          list.find((customer: Customer) => customer.id === selected.id) || selected
        ));
      }
    } catch (err) {
      console.error('Error fetching customers directory list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSessionAndLoadData();
    if (user) {
      refreshCustomers();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setSelectedCustomer(null);
    setSelectedCustomers([]);
    setAuthenticatedUser(null, 'landing');
  };

  const handleStartTrial = () => {
    if (user) {
      setView('dashboard');
    } else {
      setView('dashboard'); // Trigger direct access login flow
    }
  };

  // Switch to customer profile detail tab
  const handleOpenProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setView('profile');
  };

  const handleOpenProfiles = (customersToOpen: Customer[]) => {
    setSelectedCustomers(customersToOpen);
    setView('multi-profile');
  };

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark');

  // Return formatted current local time in elegant formatting
  const getCurrentFormattedTime = () => {
    return new Date().toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    }) + ' PKT';
  };

  // 1. Marketing Portal Render
  if (view === 'landing') {
    return <LandingPage onStartTrial={handleStartTrial} />;
  }

  // 2. Auth Gateway Render
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070b1e] text-white flex flex-col justify-between">
        <button
          onClick={() => setView('landing')}
          className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold uppercase relative z-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Landing Page
        </button>
        <Auth onAuthSuccess={(session, token) => {
          setAuthenticatedUser(session, 'dashboard', token);
          refreshCustomers();
        }} />
      </div>
    );
  }

  return (
    <div id="app-root" className="app-container min-h-screen text-slate-100 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Premium Navbar ── */}
      <nav style={{
        background: theme === 'dark' ? 'rgba(5,13,31,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: theme === 'dark' ? '1px solid rgba(79,142,247,0.1)' : '1px solid rgba(59,85,120,0.16)',
        boxShadow: theme === 'dark' ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(30,50,80,0.08)',
      }} className="sticky top-0 z-40 px-5 md:px-8 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => setView('dashboard')}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #7c6af7 100%)', boxShadow: '0 4px 14px rgba(79,142,247,0.35)' }}>
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: 'Outfit, sans-serif', color: theme === 'dark' ? '#f8fafc' : '#18324b' }}
            >
              SMART KHATA <span style={{ color: theme === 'dark' ? '#7ab3ff' : '#2456a4' }}>AI</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="dot-ping w-1.5 h-1.5" style={{ width: 6, height: 6 }} />
              <span className="text-[9px] uppercase tracking-widest text-[#475569]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Live</span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(12,22,48,0.8)', border: '1px solid rgba(79,142,247,0.08)' }}>
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${view === 'dashboard' || view === 'profile' || view === 'multi-profile' ? 'nav-link-active' : 'nav-link'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Ledger
          </button>
          <button
            onClick={() => setView('reports')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${view === 'reports' ? 'nav-link-active' : 'nav-link'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </button>
          {(user?.role === 'owner' || user?.role === 'manager') && (
            <button
              onClick={() => setView('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${view === 'admin' ? 'nav-link-active' : 'nav-link'}`}
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          )}
        </div>

        {/* Right: Time + User */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right select-none">
            <div className="text-[9px] uppercase tracking-widest text-[#334155]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>PKT Session</div>
            <div className="text-xs font-bold text-[#4f8ef7] glow-blue-text" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{getCurrentFormattedTime()}</div>
          </div>
          <div className="w-px h-8" style={{ background: 'rgba(79,142,247,0.1)' }} />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: theme === 'dark' ? '#cbd5e1' : '#34445b' }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #7c6af7 100%)' }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="text-right">
              <p
                className="text-xs font-semibold leading-none"
                style={{ color: theme === 'dark' ? '#f8fafc' : '#18324b' }}
              >
                {user.businessName || user.name}
              </p>
              <p
                className="text-[9px] uppercase tracking-wider mt-0.5 flex items-center gap-1"
                style={{ color: theme === 'dark' ? '#34d399' : '#18754d', fontFamily: 'JetBrains Mono, monospace' }}
              >
                <UserCheck className="w-3 h-3" /> {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/20"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(247,97,79,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile logout */}
        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg cursor-pointer"
            style={{ color: theme === 'dark' ? '#cbd5e1' : '#34445b' }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            className="p-2 rounded-lg cursor-pointer"
            style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(30,50,80,0.06)', color: theme === 'dark' ? '#475569' : '#526277' }}
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main content body */}
      <main className="flex-1 py-6 px-4 md:px-8">
        {view === 'dashboard' && (
          <Dashboard
            key={`dashboard-${sessionKey}`}
            session={user}
            customers={customers}
            onCustomerSelected={handleOpenProfile}
            onCustomersSelected={handleOpenProfiles}
            onRefreshData={refreshCustomers}
          />
        )}

        {view === 'profile' && selectedCustomer && (
          <CustomerProfile
            customer={selectedCustomer}
            onTransactionAdded={refreshCustomers}
            onCustomerDeleted={() => {
              setSelectedCustomer(null);
              setView('dashboard');
              refreshCustomers();
            }}
            onClose={() => setView('dashboard')}
          />
        )}

        {view === 'multi-profile' && selectedCustomers.length > 0 && (
          <div className="mx-auto grid max-w-[1800px] grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {selectedCustomers.map(customer => (
              <CustomerProfile
                key={customer.id}
                customer={customer}
                compact
                onTransactionAdded={refreshCustomers}
                onCustomerDeleted={() => {
                  const remaining = selectedCustomers.filter(selected => selected.id !== customer.id);
                  setSelectedCustomers(remaining);
                  if (remaining.length === 0) setView('dashboard');
                  refreshCustomers();
                }}
                onClose={() => {
                  const remaining = selectedCustomers.filter(selected => selected.id !== customer.id);
                  setSelectedCustomers(remaining);
                  if (remaining.length === 0) setView('dashboard');
                }}
              />
            ))}
          </div>
        )}

        {view === 'reports' && (
          <ReportsAnalytics key={`reports-${sessionKey}`} customers={customers} />
        )}

        {view === 'admin' && (
          <AdminPanel session={user} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center" style={{ borderTop: '1px solid rgba(79,142,247,0.06)' }}>
        <p className="text-[10px] text-[#334155] uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Smart Khata AI — Secure Facial Authentication Ledger System
        </p>
      </footer>
    </div>
  );
}
