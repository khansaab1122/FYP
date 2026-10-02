
import React from 'react';
import { Camera, ShieldCheck, CreditCard, Smartphone, CheckCircle, ArrowRight, Star, Quote, BarChart3, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStartTrial: () => void;
}

export default function LandingPage({ onStartTrial }: LandingPageProps) {
  const features = [
    {
      icon: <Camera className="w-5 h-5 text-[#4f8ef7]" />,
      title: "AI Face Recognition",
      desc: "Identify customers instantly at the counter using OpenCV YuNet & SFace — runs 100% offline, no cloud dependency.",
      color: "#4f8ef7",
    },
    {
      icon: <CreditCard className="w-5 h-5 text-[#7c6af7]" />,
      title: "Digital Khata Ledger",
      desc: "Replace paper notebooks with real-time cloud ledgers. Auto-calculates balances, credits, and payment history.",
      color: "#7c6af7",
    },
    {
      icon: <Smartphone className="w-5 h-5 text-[#00d4aa]" />,
      title: "WhatsApp Reminders",
      desc: "Automate payment follow-ups and share complete transaction statements directly via WhatsApp in one click.",
      color: "#00d4aa",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#f7614f]" />,
      title: "Secure Audit Logs",
      desc: "Every credit issue and payment resolution is timestamped, secured, and traceable with complete receipts.",
      color: "#f7614f",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-[#f7b84f]" />,
      title: "Business Analytics",
      desc: "Visual reports on monthly trends, top debtors, and collection performance — all at a glance.",
      color: "#f7b84f",
    },
    {
      icon: <Globe className="w-5 h-5 text-[#4f8ef7]" />,
      title: "Multi-Device Access",
      desc: "Access your complete ledger from any device — counter tablet, phone, or desktop — all synced instantly.",
      color: "#4f8ef7",
    },
  ];

  const testimonials = [
    {
      name: "Muhammad Siddique",
      biz: "Siddique General Stores, Lahore",
      quote: "Smart Khata ne mera pura kaam badal diya. Ab koi customer credit lene aata hai aur camera pe nazar aata hai, seedha uska hisaab khul jaata hai.",
      rating: 5,
      initials: "MS",
      color: "#4f8ef7",
    },
    {
      name: "Yasmin Akhtar",
      biz: "Punjab Supermarket, Rawalpindi",
      quote: "AI recognition is magical! When a regular customer walks in, their full ledger appears on screen before they even ask. Zero manual errors now.",
      rating: 5,
      initials: "YA",
      color: "#7c6af7",
    },
  ];

  const stats = [
    { value: "99.4%", label: "Face Recognition Accuracy", color: "#4f8ef7" },
    { value: "0%", label: "Ledger Calculation Error", color: "#00d4aa" },
    { value: "15,000+", label: "Shops & Retailers", color: "#7c6af7" },
    { value: "1-Click", label: "WhatsApp Notifications", color: "#f7b84f" },
  ];

  return (
    <div id="landing-page" className="min-h-screen app-container text-white overflow-x-hidden relative font-display">

      {/* ── Background Orbs ── */}
      <div className="fixed top-[-10%] left-[5%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.09) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="fixed top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,106,247,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />

      {/* ── Top Grid Texture ── */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(79,142,247,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.6) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

      {/* ══════════════════════════════
          NAVBAR
         ══════════════════════════════ */}
      <header className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #7c6af7 100%)', boxShadow: '0 4px 16px rgba(79,142,247,0.4)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              SMART KHATA <span className="text-gradient-blue">AI</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="dot-ping" />
              <span className="font-mono-custom text-[9px] text-[#475569] uppercase tracking-widest">System Active</span>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(12,22,48,0.7)', border: '1px solid rgba(79,142,247,0.1)', backdropFilter: 'blur(12px)' }}>
          {['Features', 'Testimonials', 'Pricing'].map(item => (
            <button key={item} className="px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-[#64748b] hover:text-white hover:bg-white/5 transition-all cursor-pointer">
              {item}
            </button>
          ))}
        </nav>

        <button
          onClick={onStartTrial}
          className="btn-primary text-[11px] py-2.5 px-5"
        >
          Partner Portal <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ══════════════════════════════
          HERO SECTION
         ══════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-28 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-7 max-w-4xl mx-auto"
        >
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-widest"
            style={{
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.2)',
              color: '#34d399',
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Pakistan's #1 AI-Powered Retail Ledger System
          </motion.div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-black leading-[1.06] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Manage Credit With{' '}
            <span className="relative inline-block">
              <span className="text-gradient-blue animate-gradient">Face Recognition</span>
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full animate-gradient"
                style={{ background: 'linear-gradient(90deg, #4f8ef7, #7c6af7, #00d4aa)', backgroundSize: '200% 100%' }} />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#64748b] text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Replace paper khata books with AI precision. Smart Khata identifies your customers by face,
            pulls up their ledger instantly, and keeps every transaction tracked automatically.
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
          >
            <button
              onClick={onStartTrial}
              className="btn-primary text-sm py-4 px-10 rounded-2xl"
            >
              <Zap className="w-4 h-4" />
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onStartTrial}
              className="btn-secondary text-sm py-4 px-10 rounded-2xl"
            >
              Explore Demo Dashboard
            </button>
          </motion.div>
        </motion.div>

        {/* ── Stats Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center space-y-1.5 p-4 rounded-2xl"
              style={{ background: 'rgba(12,22,48,0.7)', border: `1px solid ${s.color}25`, backdropFilter: 'blur(8px)' }}>
              <div className="text-2xl font-black num-display" style={{ color: s.color, fontFamily: 'Outfit, sans-serif' }}>
                {s.value}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════
          FEATURES SECTION
         ══════════════════════════════ */}
      <section className="relative z-10 py-24" style={{ background: 'rgba(7,16,42,0.6)', borderTop: '1px solid rgba(79,142,247,0.08)', borderBottom: '1px solid rgba(79,142,247,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-3">
            <div className="badge badge-blue mx-auto">Platform Features</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Everything Your Store Needs
            </h2>
            <p className="text-[#64748b] text-sm max-w-md mx-auto">
              High-precision modules built to transition manual credit ledgers to secure, intelligent automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl relative overflow-hidden cursor-default"
                style={{
                  background: 'rgba(12,22,48,0.85)',
                  border: '1px solid rgba(79,142,247,0.1)',
                  backdropFilter: 'blur(12px)',
                  transition: 'border-color 0.3s, transform 0.2s, box-shadow 0.3s',
                }}
                whileHover={{ y: -4, boxShadow: `0 8px 32px ${f.color}20` }}
              >
                {/* Feature top corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 100% 0%, ${f.color}15 0%, transparent 70%)` }} />

                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  {f.icon}
                </div>
                <h4 className="text-sm font-bold text-white mb-2 tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>{f.title}</h4>
                <p className="text-[13px] text-[#64748b] leading-relaxed">{f.desc}</p>

                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: f.color }}>
                  Learn more <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          TESTIMONIALS
         ══════════════════════════════ */}
      <section className="relative z-10 py-24 max-w-7xl mx-auto px-6">
        <div className="text-center space-y-3 mb-14">
          <div className="badge badge-green mx-auto">Customer Stories</div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Trusted by Neighborhood Retailers
          </h2>
          <p className="text-[#64748b] text-sm max-w-md mx-auto">
            Real stories from general stores, pharmacies and wholesalers across Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-7 rounded-2xl relative overflow-hidden"
              style={{
                background: 'rgba(12,22,48,0.85)',
                border: '1px solid rgba(79,142,247,0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Quote className="absolute right-5 top-4 w-12 h-12 opacity-[0.04]" style={{ color: t.color }} />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, rIdx) => (
                  <Star key={rIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-[13px] text-[#94a3b8] italic leading-relaxed mb-5">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.color} 0%, ${t.color}99 100%)` }}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-[10px] text-[#475569] mt-0.5">{t.biz}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          CTA FOOTER BANNER
         ══════════════════════════════ */}
      <section className="relative z-10 py-20 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(10,17,40,0.95) 0%, rgba(7,12,30,0.98) 100%)',
          borderTop: '1px solid rgba(79,142,247,0.12)',
        }}>
        {/* CTA glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(79,142,247,0.12) 0%, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-5 max-w-xl mx-auto px-6 relative z-10"
        >
          <div className="badge badge-blue mx-auto">Get Started Today</div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Ready to Upgrade<br />
            <span className="text-gradient-blue">Your Business?</span>
          </h2>
          <p className="text-[#64748b] text-sm">
            Secure your outstanding ledger credits and transition to smart face-match lookups today.
          </p>
          <button
            onClick={onStartTrial}
            className="btn-primary text-sm py-4 px-12 rounded-2xl mx-auto"
          >
            <Zap className="w-4 h-4" />
            Start Using Smart Khata
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-6 border-t text-center" style={{ borderColor: 'rgba(79,142,247,0.06)' }}>
        <p className="font-mono-custom text-[10px] text-[#334155] uppercase tracking-widest">
          Smart Khata AI © 2025 — Secure Facial Authentication Ledger System
        </p>
      </footer>
    </div>
  );
}
