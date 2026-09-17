
import React from 'react';
import { Camera, ShieldCheck, CreditCard, Sparkles, Smartphone, Landmark, CheckCircle, ArrowRight, Star, Quote } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStartTrial: () => void;
}

export default function LandingPage({ onStartTrial }: LandingPageProps) {
  const features = [
    {
      icon: <Camera className="w-6 h-6 text-blue-400" />,
      title: "AI Face Recognition",
      desc: "Identify customers instantly at the cash counter using secure, high-precision visual recognition."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-indigo-400" />,
      title: "Digital Khata",
      desc: "Replace physical notebook records with automated cloud ledgers. Real-time balance calculations."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-emerald-400" />,
      title: "WhatsApp Reminders",
      desc: "Automate payment follow-ups. Share complete transaction statement slips directly in one click."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: "Audit History",
      desc: "Track every single credit issue and resolution with secure timestamp logs and clear receipts."
    }
  ];

  const testimonials = [
    {
      name: "Muhammad Siddique",
      biz: "Siddique General Stores",
      quote: "Smart Khata completamente cambiò come gestisco il negozio. Non perdo più un centesimo di credito!",
      rating: 5
    },
    {
      name: "Yasmin Akhtar",
      biz: "Punjab Supermarket",
      quote: "AI recognition is magical! When a regular walks in, their full ledger tab appears on screen before they even ask.",
      rating: 5
    }
  ];

  return (
    <div id="landing-page" className="min-h-screen app-container text-white overflow-hidden relative font-sans">
      
      {/* Visual background lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/assest/logo.png"
            alt="Smart Khata AI"
            className="w-10 h-10 object-cover rounded-xl bg-white/5 p-1"
          />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Smart Khata AI</span>
        </div>

        <button
          onClick={onStartTrial}
          className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
        >
          Partner Portal
        </button>
      </header>

      {/* Main hero showcase */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-400/10 text-emerald-300 rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20">
            <CheckCircle className="w-4 h-4" /> Smart Khata Pakistan — Digitizing Offline Retail
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] font-sans">
            Smart Khata Powered By <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">Artificial Intelligence</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Manage customer credit, payment records, and ledger balances with cutting-edge face recognition technology. Replace paper registers with precision and safety.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4"
        >
          <button
            onClick={onStartTrial}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/15 hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            Start Free Trial <ArrowRight className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={onStartTrial}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl text-sm font-bold uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
          >
            Explore Dashboard Demo
          </button>
        </motion.div>

        {/* Mockups and stats highlights */}
        <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-white/5">
          <div className="space-y-1">
            <h4 className="text-2xl font-extrabold text-blue-400">99.4%</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Face Recognition Acc</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-2xl font-extrabold text-indigo-400">0%</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Ledger Calculation Error</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-2xl font-extrabold text-[#115e59]">15,000+</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Shops & Retailers</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-2xl font-extrabold text-slate-200">1 Click</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">WhatsApp Notifications</p>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="bg-slate-950/80 border-t border-b border-white/5 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tight font-sans">Ecosystem Features Built For Growth</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">High-precision SaaS modules to transition manual ledger records to absolute security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card p-6.5 hover:border-blue-500/20 hover:bg-white/[0.04] transition-all space-y-4"
              >
                <div className="p-3 bg-white/5 w-fit rounded-2.5xl">
                  {f.icon}
                </div>
                <h4 className="text-md font-bold text-white tracking-wide">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Review Slider */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tight font-sans">Validated By Neighborhood Retailers</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto font-medium">Real reviews from general stores, pharmacies and wholesalers across cities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="glass-card p-6 space-y-4 relative overflow-hidden"
            >
              <Quote className="w-10 h-10 text-blue-500/10 absolute -right-2 -bottom-2 rotate-180" />
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, rIdx) => (
                  <Star key={rIdx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed font-sans">"{t.quote}"</p>
              <div>
                <h5 className="text-xs font-bold text-white">{t.name}</h5>
                <p className="text-[10px] text-slate-500 font-medium">{t.biz}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action Banner Footer */}
      <section className="bg-gradient-to-tr from-[#0a1128] via-[#0d1838] to-[#070b1e] border-t border-white/15 py-16 relative z-10 text-center space-y-5">
        <h2 className="text-3xl font-black tracking-tight font-sans">Ready to Upgrade Your Business?</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Secure your outstanding ledger credits and transition to smart face-match lookups today.</p>
          <button
            onClick={onStartTrial}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-700 hover:from-emerald-400 hover:to-indigo-600 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer"
          >
            Start Using Smart Khata
          </button>
      </section>
    </div>
  );
}
