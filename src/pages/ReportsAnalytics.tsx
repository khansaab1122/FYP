import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Award, Users, CreditCard, PieChart as ChartIcon, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { Customer } from '../types';

interface ReportsAnalyticsProps {
  customers: Customer[];
}

export default function ReportsAnalytics({ customers }: ReportsAnalyticsProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    try {
      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('en-US', { month: 'short' }));
      }

      const trendsMap: Record<string, { month: string; CreditIssued: number; PaymentsReceived: number }> = {};
      months.forEach(m => { trendsMap[m] = { month: m, CreditIssued: 0, PaymentsReceived: 0 }; });

      customers.forEach(c => {
        (c.transactions || []).forEach((tx: any) => {
          const d = new Date(tx.date);
          const m = d.toLocaleString('en-US', { month: 'short' });
          if (!trendsMap[m]) return;
          if (tx.type === 'credit') trendsMap[m].CreditIssued += Number(tx.amount || 0);
          else trendsMap[m].PaymentsReceived += Number(tx.amount || 0);
        });
      });

      const computed = months.map(m => trendsMap[m]);
      setData(computed);
    } catch (err) {
      console.error('Error computing analytics from customers', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [customers]);

  const totalCustomersCount = customers.length;
  const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const totalOwes = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const surplusDeposit = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);

  const topDebtors = [...customers]
    .filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const formatcurrency = (num: number) => 'Rs. ' + num.toLocaleString('en-PK');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 rounded-full border-t-2 border-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-mono uppercase tracking-widest">Generating Ledger Analytics charts...</p>
      </div>
    );
  }

  return (
    <div id="reports-analytics" className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="stat-label text-rose-400">Store Credit Exposure</p>
            <h3 className="text-2xl font-bold font-sans tracking-tight text-rose-400">{formatcurrency(totalOwes)}</h3>
            <p className="text-[10px] text-slate-500">Sum of outstanding credits</p>
          </div>
          <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="stat-label text-emerald-400">Surplus Deposits</p>
            <h3 className="text-2xl font-bold font-sans tracking-tight text-emerald-400">{formatcurrency(surplusDeposit)}</h3>
            <p className="text-[10px] text-slate-500">Advance payments logged</p>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="stat-label text-blue-400">Total Credit Limit</p>
            <h3 className="text-2xl font-bold font-sans tracking-tight text-blue-400">{formatcurrency(totalCreditLimit)}</h3>
            <p className="text-[10px] text-slate-500">Authorized store-wide credit</p>
          </div>
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="stat-label text-slate-400 font-semibold tracking-wider">Registered Base</p>
            <h3 className="text-2xl font-bold font-sans tracking-tight text-white">{totalCustomersCount} Accounts</h3>
            <p className="text-[10px] text-slate-500">Face templates active</p>
          </div>
          <div className="p-4 bg-white/5 text-slate-300 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold font-sans tracking-tight flex items-center gap-2">
                <ChartIcon className="w-5 h-5 text-indigo-400" />
                Ledger Operations Trend
              </h3>
              <p className="text-xs text-slate-400">Monthly credit grants vs payment conversions</p>
            </div>

            <button
              onClick={() => { /* no-op refresh, data recomputes from customers */ }}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all"
              title="Refresh Analytics data"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1738', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} 
                  labelClassName="text-slate-400 text-xs font-bold"
                />
                <Area type="monotone" dataKey="CreditIssued" stroke="#f87171" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCredit)" name="Credits Granted (Rs.)" />
                <Area type="monotone" dataKey="PaymentsReceived" stroke="#34d399" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPayment)" name="Payments Received (Rs.)" />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 10, color: '#94a3b8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold font-sans tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Highest Pending Ledgers
            </h3>
            <p className="text-xs text-slate-400">Stores requiring immediate notifications</p>
          </div>

          <div className="space-y-3.5">
            {topDebtors.map((c, i) => {
              const utilPercent = (c.balance / (c.creditLimit || 1)) * 100;
              return (
                <div key={c.id} className="p-3 bg-[#111936]/35 rounded-2xl border border-white/5 space-y-1.5 hover:border-rose-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-rose-400">{formatcurrency(c.balance)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Limit: {formatcurrency(c.creditLimit)}</span>
                      <span className="font-semibold text-slate-400">{utilPercent.toFixed(0)}% Utilized</span>
                    </div>
                    <div className="w-full bg-[#1b254e] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${utilPercent > 80 ? 'bg-red-400' : utilPercent > 50 ? 'bg-amber-400' : 'bg-indigo-400'}`} 
                        style={{ width: `${Math.min(utilPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {topDebtors.length === 0 && (
              <p className="text-center py-12 text-xs text-slate-500 font-mono text-bold uppercase">LEDGERS COMPLETELY CLEAR</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
