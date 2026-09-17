
import React, { useState, useEffect } from 'react';
import { Settings, Building2, Save, BadgeHelp } from 'lucide-react';
import { motion } from 'motion/react';
import { BusinessProfile, UserSession } from '../types';

interface AdminPanelProps {
  session: UserSession;
}

export default function AdminPanel({ session }: AdminPanelProps) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Business profile form state
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('');
  const [bizContact, setBizContact] = useState('');
  const [bizAddress, setBizAddress] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);

        // Prepopulate form
        setBizName(data.profile.name);
        setBizCategory(data.profile.category);
        setBizContact(data.profile.contact);
        setBizAddress(data.profile.address);
      }
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bizName,
          category: bizCategory,
          contact: bizContact,
          address: bizAddress
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setStatusMsg('Business Profile secured and saved recursively!');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 rounded-full border-t-2 border-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-mono uppercase tracking-widest">Compiling Settings Workspace...</p>
      </div>
    );
  }



  return (
    <div id="admin-panel" className="max-w-6xl mx-auto p-4 space-y-6">
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-medium text-center animate-pulse">
          {statusMsg}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar controls */}
        <div className="w-full md:w-64 flex flex-col space-y-2 shrink-0">
          <button
            onClick={() => {}}
            className="sidebar-link-active"
          >
            <Building2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            Shop Information
          </button>

          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl text-[10px] text-slate-400/80 mt-6 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-300 uppercase tracking-widest text-[10px]">
              <BadgeHelp className="w-3.5 h-3.5 text-blue-400" /> Settings
            </div>
            <p>Configure your business profile, invoice headers, and contact details.</p>
          </div>
        </div>

        {/* Right Content panel */}
        <div className="flex-1 glass-card p-6 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 font-sans tracking-tight">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  General Store Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure retail invoice headers, addresses, and physical shop specs.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Shop / Business Name</label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      className="w-full bg-[#111936] border border-white/5 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Retail Category</label>
                    <input
                      type="text"
                      required
                      value={bizCategory}
                      onChange={(e) => setBizCategory(e.target.value)}
                      className="w-full bg-[#111936] border border-white/5 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Contact Hotline</label>
                    <input
                      type="text"
                      required
                      value={bizContact}
                      onChange={(e) => setBizContact(e.target.value)}
                      className="w-full bg-[#111936] border border-white/5 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Owner Email (Credentials Admin)</label>
                    <input
                      type="email"
                      disabled
                      value={profile?.ownerEmail || ''}
                      className="w-full bg-[#111936]/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Physical Shop Address</label>
                  <textarea
                    rows={3}
                    required
                    value={bizAddress}
                    onChange={(e) => setBizAddress(e.target.value)}
                    className="w-full bg-[#111936] border border-white/5 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95"
                  >
                    {savingProfile ? (
                      <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Commit Shop Updates
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
        </div>
      </div>
    </div>
  );
}
