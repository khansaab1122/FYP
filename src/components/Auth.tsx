
import React, { useEffect, useRef, useState } from 'react';
import { Shield, Sparkles, Building, Mail, Lock, User, RefreshCw, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { UserSession } from '../types';

interface AuthProps {
  onAuthSuccess: (session: UserSession) => void;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number }) => void;
    };
  };
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [ownerSetupToken, setOwnerSetupToken] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const onAuthSuccessRef = useRef(onAuthSuccess);
  onAuthSuccessRef.current = onAuthSuccess;

  useEffect(() => {
    if (!isLogin || isForgot || isSetupMode) return;

    let cancelled = false;
    fetch('/api/auth/google/config')
      .then(response => response.json())
      .then(data => {
        if (!cancelled) setGoogleClientId(typeof data.clientId === 'string' ? data.clientId : '');
      })
      .catch(() => {
        if (!cancelled) setGoogleClientId('');
      })
      .finally(() => {
        if (!cancelled) setGoogleConfigLoaded(true);
      });

    return () => { cancelled = true; };
  }, [isLogin, isForgot, isSetupMode]);

  useEffect(() => {
    if (!googleClientId || !isLogin || isForgot || isSetupMode || !googleButtonRef.current) return;

    let cancelled = false;
    const renderButton = () => {
      const google = (window as Window & { google?: GoogleIdentityServices }).google;
      if (cancelled || !google || !googleButtonRef.current) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError('');
          setLoading(true);
          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Google sign-in failed.');
            onAuthSuccessRef.current(data.user);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        }
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 368
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if ((window as Window & { google?: GoogleIdentityServices }).google) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderButton, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      document.head.appendChild(script);
    }

    return () => { cancelled = true; };
  }, [googleClientId, isLogin, isForgot, isSetupMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      if (isForgot) {
        const res = await fetch(resetCodeSent ? '/api/auth/reset-password' : '/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resetCodeSent
            ? { email, code: resetCode, password: newPassword }
            : { email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password reset failed.');

        if (resetCodeSent) {
          setIsForgot(false);
          setResetCodeSent(false);
          setResetCode('');
          setNewPassword('');
          setPassword('');
          setIsLogin(true);
        } else {
          setResetCodeSent(true);
        }
        setMsg(data.message);
        return;
      }

      const endpoint = isSetupMode
        ? '/api/auth/initialize-password'
        : isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isSetupMode
        ? { email, password, setupToken }
        : isLogin
          ? { email, password }
          : { name, email, password, businessName, ownerSetupToken };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PASSWORD_SETUP_REQUIRED') {
          setIsSetupMode(true);
          setError('This account was created before password verification was added. Enter the one-time setup token configured by the administrator.');
          return;
        }
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
      {/* Decorative Blobs */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,106,247,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4,0,0.2,1] }}
        className="w-full max-w-md relative z-10 p-8 rounded-2xl"
        style={{
          background: 'rgba(8,16,40,0.90)',
          border: '1px solid rgba(79,142,247,0.15)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #7c6af7 100%)', boxShadow: '0 6px 24px rgba(79,142,247,0.35)' }}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #7ab3ff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SMART KHATA AI
          </h2>
          <p className="text-[#475569] text-xs mt-1.5 text-center">
            {isForgot
              ? resetCodeSent ? 'Enter the code sent to your registered email' : 'Recover your account using your registered email'
              : isSetupMode
                ? 'Set a password for your existing Smart Khata account'
              : isLogin
                ? 'Store Credit Management with Real-Time Face Match'
                : 'Digitize your retail register in 60 seconds'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs text-center font-medium"
            style={{ background: 'rgba(247,97,79,0.08)', border: '1px solid rgba(247,97,79,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {msg && (
          <div className="mb-4 p-3 rounded-xl text-xs text-center font-medium"
            style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: '#34d399' }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSetupMode && (
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">One-Time Setup Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  placeholder="Token configured by administrator"
                  className="input-field with-leading-icon"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

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
                    className="input-field with-leading-icon"
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
                    className="input-field with-leading-icon"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Owner Setup Token</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={ownerSetupToken}
                    onChange={(e) => setOwnerSetupToken(e.target.value)}
                    placeholder="Required for hosted registration"
                    className="input-field with-leading-icon"
                    autoComplete="off"
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
                    className="input-field with-leading-icon"
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
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field with-leading-icon"
                  />
                </div>
              </div>
            </>
          )}

          {isForgot && (
            <>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    readOnly={resetCodeSent}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="input-field with-leading-icon"
                  />
                </div>
              </div>
              {resetCodeSent && (
                <>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email Reset Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={6}
                        pattern="[0-9]{6}"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        className="input-field with-leading-icon"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        maxLength={128}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="input-field with-leading-icon"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 rounded-xl text-sm mt-2"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isSetupMode ? 'Set Password & Sign In' : isForgot ? resetCodeSent ? 'Reset Password' : 'Send Email Code' : isLogin ? 'Access Dashboard' : 'Deploy Smart Registry'}
              </>
            )}
          </button>
        </form>

        {isLogin && !isForgot && !isSetupMode && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {googleClientId ? (
              <div ref={googleButtonRef} />
            ) : googleConfigLoaded ? (
              <p className="text-slate-500 text-xs">Google sign-in is not configured.</p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-col space-y-3.5 text-center">
          <button
            type="button"
            onClick={() => {
              if (isForgot || isSetupMode) {
                setIsForgot(false);
                setIsSetupMode(false);
                setResetCodeSent(false);
                setIsLogin(true);
              } else {
                setIsLogin(!isLogin);
              }
              setError('');
              setMsg('');
            }}
            className="text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
          >
            {isSetupMode
              ? 'Return to Login'
              : isForgot
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
