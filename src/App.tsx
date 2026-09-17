
import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, BarChart3, Settings, ShieldAlert, LogOut, ArrowLeft, RefreshCw, UserCheck } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import CustomerProfile from './components/CustomerProfile';
import ReportsAnalytics from './pages/ReportsAnalytics';
import AdminPanel from './pages/AdminPanel';
import { Customer, UserSession } from './types';

const AUTH_STORAGE_KEY = 'smart-khata-user';

const readStoredUser = (): UserSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return storedValue ? (JSON.parse(storedValue) as UserSession) : null;
  } catch {
    return null;
  }
};

const writeStoredUser = (session: UserSession | null) => {
  if (typeof window === 'undefined') return;

  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'profile' | 'reports' | 'admin'>('landing');
  const [user, setUser] = useState<UserSession | null>(() => readStoredUser());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const setAuthenticatedUser = (session: UserSession | null, nextView: 'dashboard' | 'landing' = 'dashboard') => {
    setUser(session);
    writeStoredUser(session);
    setCustomers([]);
    setSelectedCustomer(null);
    setSessionKey(prev => prev + 1);
    setView(nextView);
  };

  // Load backend session details and ledger items
  const checkSessionAndLoadData = async () => {
    const storedUser = readStoredUser();

    if (storedUser) {
      setAuthenticatedUser(storedUser, 'dashboard');
    }

    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const status = await res.json();
        if (status.user) {
          setAuthenticatedUser(status.user, 'dashboard');
        } else {
          setAuthenticatedUser(null, !storedUser ? 'landing' : 'dashboard');
        }
      } else if (!storedUser) {
        setAuthenticatedUser(null, 'landing');
      }
      await refreshCustomers();
    } catch (err) {
      console.error('Connection to backend failed, serving simulation mode:', err);
      if (!storedUser) {
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
      }
    } catch (err) {
      console.error('Error fetching customers directory list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSessionAndLoadData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setSelectedCustomer(null);
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
        <Auth onAuthSuccess={(session) => {
          setAuthenticatedUser(session, 'dashboard');
          refreshCustomers();
        }} />
      </div>
    );
  }

  return (
    <div id="app-root" className="app-container min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-500">
      
      {/* SaaS Primary Control Nav Header */}
      <nav className="border-b border-white/5 bg-[#1e293b]/20 backdrop-blur-lg sticky top-0 z-40 px-4 md:px-8 py-3.5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <span className="text-md font-bold tracking-tight text-white leading-none">Smart Khata AI</span>
              <p className="text-[9px] text-blue-400 font-mono tracking-widest font-extrabold uppercase mt-0.5">Ecosystem Active</p>
            </div>
          </div>

          <div className="flex md:hidden gap-2">
            <button
              onClick={handleLogout}
              className="p-2 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
              title="Sign Out of Terminal"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex gap-1 bg-black/30 p-1 rounded-2xl border border-white/5 order-3 md:order-2">
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${view === 'dashboard' || view === 'profile' ? 'bg-blue-500/10 text-[#00d2ff] shadow-md border border-blue-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Ledger Board
          </button>

          <button
            onClick={() => setView('reports')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${view === 'reports' ? 'bg-blue-500/10 text-[#00d2ff] shadow-md border border-blue-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>

          {(user?.role === 'owner' || user?.role === 'manager') && (
            <button
              onClick={() => setView('admin')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${view === 'admin' ? 'bg-blue-500/10 text-[#00d2ff] shadow-md border border-blue-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>

        {/* Clerk identity & systems metrics */}
        <div className="hidden md:flex items-center gap-4 order-2 md:order-3">
          <div className="flex flex-col text-right font-mono select-none">
            <span className="text-5rem text-slate-500 font-bold uppercase tracking-widest">Local Session Time</span>
            <span className="text-4rem text-blue-400 font-bold glow-blue-text">{getCurrentFormattedTime()}</span>
          </div>

          <div className="h-7 w-[1px] bg-white/5" />

          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white tracking-wide">{user.name}</span>
              <span className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-0.5">
                <UserCheck className="w-3 h-3" /> {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer border border-white/5"
              title="Lock Terminal & Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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

        {view === 'reports' && (
          <ReportsAnalytics key={`reports-${sessionKey}`} customers={customers} />
        )}

        {view === 'admin' && (
          <AdminPanel session={user} />
        )}
      </main>

      {/* Footer Branding line */}
      <footer className="border-t border-white/5 py-4 text-center text-[10px] text-slate-600 font-mono tracking-widest uppercase">
        Smart Khata AI • Secure Facial Authentication Ledger System MVP
      </footer>
    </div>
  );
}
