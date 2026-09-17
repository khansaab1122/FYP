
import React, { useState } from 'react';
import { User, Phone, MapPin, CreditCard, Clock, Calendar, CheckCircle2, ChevronRight, MessageSquareCode, Plus, Minus, ReceiptText, ArrowUpRight, ArrowDownRight, RefreshCw, X, Trash2, AlertTriangle } from 'lucide-react';
import { Customer, Transaction } from '../types';

interface CustomerProfileProps {
  customer: Customer;
  onTransactionAdded: () => void;
  onCustomerDeleted?: () => void;
  onClose: () => void;
}

export default function CustomerProfile({ customer, onTransactionAdded, onCustomerDeleted, onClose }: CustomerProfileProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txType, setTxType] = useState<'credit' | 'payment'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Selected receipt invoice generator state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          type: txType,
          amount: Number(amount),
          description: description || (txType === 'credit' ? 'Purchased credit goods' : 'Paid balance amount')
        })
      });

      if (res.ok) {
        setAmount('');
        setDescription('');
        setModalOpen(false);
        onTransactionAdded();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Server transaction failed.');
      }
    } catch (err) {
      setError('Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete customer account');
      }

      setConfirmDeleteOpen(false);
      onCustomerDeleted?.();
    } catch (err: any) {
      setDeleteError(err.message || 'Something went wrong while deleting this customer.');
    } finally {
      setDeleting(false);
    }
  };

  const notifyUserViaWhatsapp = (tx: Transaction) => {
    const textMsg = `*Smart Khata AI - Receipt Notification*\n\nDear ${customer.name},\nA new transaction has been logged on your Al-Madina General Store ledger:\n\n*Type:* ${tx.type === 'credit' ? 'Credit Purchase' : 'Payment Received'}\n*Amount:* Rs. ${tx.amount.toLocaleString()}\n*Description:* ${tx.description}\n*Date:* ${new Date(tx.date).toLocaleDateString()}\n\n*Your remaining balance is:* Rs. ${customer.balance.toLocaleString()}\n\nThank you for choosing Al-Madina!`;
    const encoded = encodeURIComponent(textMsg);
    window.open(`https://api.whatsapp.com/send?phone=${customer.phone.replace(/[^0-9+]/g, '')}&text=${encoded}`, '_blank');
  };

  return (
    <div id="customer-profile" className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all font-semibold text-xs uppercase cursor-pointer border border-white/5"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Accounts
        </button>

        <button
          onClick={() => setConfirmDeleteOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl transition-all font-semibold text-xs uppercase cursor-pointer border border-rose-500/20"
        >
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Customer overview card */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-white/5">
            <div className="relative">
              {customer.image && customer.image.length > 50 ? (
                <img
                  src={customer.image}
                  alt={customer.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-400"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center border-2 border-white/10 text-3xl font-bold font-sans text-blue-400">
                  {customer.name.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-blue-500 text-white rounded-full text-[8px] font-bold uppercase tracking-widest border border-slate-950">
                Face Lock
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold font-sans text-white">{customer.name}</h2>
              <span className="text-[10px] text-slate-500 font-mono">ID: {customer.id}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3.5 text-sm text-slate-300">
              <Phone className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              <span className="font-mono text-xs">{customer.phone}</span>
            </div>

            <div className="flex items-center gap-3.5 text-sm text-slate-300">
              <MapPin className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              <span className="text-xs">{customer.address || 'No Address Registered'}</span>
            </div>

            <div className="flex items-center gap-3.5 text-xs text-slate-400">
              <Clock className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              <span>Created: {new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Current Ledger totals */}
          <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="stat-label text-slate-400">Credit Limit</span>
              <span className="text-xs font-bold text-slate-300">Rs. {customer.creditLimit?.toLocaleString('en-PK')}</span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
              <span className="stat-label text-slate-400">Current Balance</span>
              <span className={`text-md font-extrabold ${customer.balance > 0 ? 'text-rose-400' : customer.balance < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {customer.balance > 0 
                  ? `Rs. ${customer.balance.toLocaleString('en-PK')} (Owes)` 
                  : customer.balance < 0 
                    ? `Rs. ${Math.abs(customer.balance).toLocaleString('en-PK')} (Surplus)` 
                    : 'Rs. 0 (Clear)'}
              </span>
            </div>
          </div>

          {/* Core ledger actions */}
          <button
            onClick={() => {
              setTxType('credit');
              setModalOpen(true);
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-blue-500/25"
          >
            <Plus className="w-4.5 h-4.5" /> Credit / Payment Entry
          </button>
        </div>

        {/* Right ledger transaction list */}
        <div className="lg:col-span-2 glass-card p-6 space-y-5">
          <div className="pb-2 border-b border-white/5">
            <h3 className="text-lg font-bold font-sans tracking-tight">Ledger Statement & Logs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chronological audit ledger of credits issued and returns resolved.</p>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {customer.transactions && customer.transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 bg-[#111936]/25 rounded-2xl border border-white/5 hover:border-indigo-500/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex gap-3.5 items-start">
                  <div className={`p-2.5 rounded-xl shrink-0 ${tx.type === 'credit' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {tx.type === 'credit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">{customer.name} — {tx.description}</p>
                    <div className="flex gap-3 items-center text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono uppercase">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(tx.date).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{tx.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className={`text-md font-extrabold ${tx.type === 'credit' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {tx.type === 'credit' ? '+' : '-'} Rs. {tx.amount.toLocaleString('en-PK')}
                  </span>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-2 bg-[#1b254e]/50 hover:bg-[#1b254e] text-slate-300 rounded-xl transition-all cursor-pointer"
                      title="Issue printable receipt invoice"
                    >
                      <ReceiptText className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => notifyUserViaWhatsapp(tx)}
                      className="p-2 bg-[#1b254e]/50 hover:bg-[#1b254e] text-emerald-400 rounded-xl transition-all cursor-pointer"
                      title="Share ledger statement on WhatsApp"
                    >
                      <MessageSquareCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!customer.transactions || customer.transactions.length === 0) && (
              <p className="text-center py-16 text-xs text-slate-500 font-mono uppercase tracking-wider">No transaction audits logged on this ledger.</p>
            )}
          </div>
        </div>
      </div>

      {/* Credit/Payment Entry Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative backdrop-blur-xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div>
              <h3 className="text-lg font-bold font-sans text-white">Record Ledger Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Issue store credit or log balance clearance records.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide">Operation Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('credit')}
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${txType === 'credit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-md' : 'bg-[#111936] text-slate-400 border border-white/5 hover:text-white'}`}
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('payment')}
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${txType === 'payment' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md' : 'bg-[#111936] text-slate-400 border border-white/5 hover:text-white'}`}
                  >
                    <Minus className="w-3.5 h-3.5 inline mr-1" /> Payment
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">Transaction Liability (Rs.)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-[#111936] border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">Ledger Entry Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Rice sack, cooking oil"
                  className="w-full bg-[#111936] border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    'Record Ledger Entry'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-rose-500/20 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative backdrop-blur-xl">
            <button
              onClick={() => {
                setConfirmDeleteOpen(false);
                setDeleteError('');
              }}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-sans text-white">Delete Customer Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl text-center">
                {deleteError}
              </div>
            )}

            <p className="text-sm text-slate-300">
              Are you sure you want to remove <span className="font-bold text-white">{customer.name}</span> from the ledger? All account history and associated transactions will be deleted.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  setDeleteError('');
                }}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteCustomer}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-70 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Invoice printing module overlay */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 mr-0">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-6 relative text-slate-300 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Content */}
            <div className="space-y-4 text-center border-b border-dashed border-white/10 pb-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-md font-bold font-sans tracking-tight text-white">Smart Khata AI Receipt</h4>
                <p className="text-[10px] text-slate-400">AL-MADINA GENERAL STORE</p>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-2xl font-mono text-center flex flex-col space-y-0.5">
                <span className="text-[10px] uppercase text-slate-500 tracking-wider">Statement Amount</span>
                <span className="text-2xl font-extrabold text-white">Rs. {selectedTx.amount.toLocaleString()}</span>
                <span className="text-[10px] text-indigo-400 font-semibold">{selectedTx.type === 'credit' ? 'Outstanding Credit' : 'Payment Cleared'}</span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[11px] border-b border-dashed border-white/10 pb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-semibold text-white">{selectedTx.id}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Customer Acc:</span>
                <span className="font-semibold text-white">{customer.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Date Timestamp:</span>
                <span className="font-semibold text-white">{new Date(selectedTx.date).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Payment Notes:</span>
                <span className="font-semibold text-white">{selectedTx.description}</span>
              </div>

              <div className="flex justify-between border-t border-dashed border-white/5 pt-2">
                <span className="text-slate-500">Accumulated Out:</span>
                <span className="font-semibold text-rose-400">Rs. {customer.balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Print trigger dummy controls */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Print Invoice
              </button>
              <button
                onClick={() => notifyUserViaWhatsapp(selectedTx)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Share Acc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
