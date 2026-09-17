
import React, { useState } from 'react';
import { Shield, Sparkles, Building, Mail, Lock, User, RefreshCw, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { UserSession } from '../types';

interface AuthProps {
  onAuthSuccess: (session: UserSession) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      if (isForgot) {
        // Mock forgot password
        setTimeout(() => {
          setMsg('Security reset PIN has been dispatched to your registered mobile and email.');
          setLoading(false);
          setIsForgot(false);
          setIsLogin(true);
        }, 1500);
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password }
        : { name, email, password, businessName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Connecting server failed.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div id="auth-portal" className="min-h-screen app-container text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blur Clusters */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-card p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
            Smart Khata AI
          </h2>
          <p className="text-slate-400 text-xs mt-1 text-center">
            {isForgot 
              ? 'Recover ledger security credentials' 
              : isLogin 
                ? 'Store Credit Management with Real-Time Face Match' 
                : 'Digitize your retail register in 60 seconds'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {msg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isForgot && (
            <>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Owner Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abdul Majid"
                    className="w-full bg-[#111936] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Business Name</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Al-Madina General Store"
                    className="w-full bg-[#111936] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {!isForgot && (
            <>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="w-full bg-[#111936] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider">Security Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgot(true)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111936] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {isForgot && (
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@store.com"
                  className="w-full bg-[#111936] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 animate-pulse" />
                {isForgot ? 'Send PIN Code' : isLogin ? 'Access Master Dashboard' : 'Deploy Smart Registry'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col space-y-3.5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsForgot(false);
              setIsLogin(!isLogin);
            }}
            className="text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
          >
            {isForgot 
              ? 'Return to Login' 
              : isLogin 
                ? "Don't have an account? Sign Up to Register Store" 
                : 'Already have a Smart Khata ledger? Sign In'}
          </button>


        </div>
      </motion.div>
    </div>
  );
}
