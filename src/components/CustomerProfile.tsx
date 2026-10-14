
import React, { useState, useRef } from 'react';
import { User, Phone, MapPin, CreditCard, Clock, Calendar, CheckCircle2, ChevronRight, MessageSquareCode, Plus, Minus, ReceiptText, ArrowUpRight, ArrowDownRight, RefreshCw, X, Trash2, AlertTriangle, Pencil, Camera } from 'lucide-react';
import { Customer, Transaction } from '../types';

interface CustomerProfileProps {
  customer: Customer;
  onTransactionAdded: () => void;
  onCustomerDeleted?: () => void;
  onCustomerUpdated?: (updated: Customer) => void;
  onClose: () => void;
  compact?: boolean;
}

export default function CustomerProfile({ customer, onTransactionAdded, onCustomerDeleted, onCustomerUpdated, onClose, compact = false }: CustomerProfileProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txType, setTxType] = useState<'credit' | 'payment'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Edit Customer States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editCameraActive, setEditCameraActive] = useState(false);
  const [editCameraStream, setEditCameraStream] = useState<MediaStream | null>(null);
  const editVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const handleOpenEditModal = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address || '');
    setEditCreditLimit(String(customer.creditLimit || '25000'));
    setEditImage(customer.image || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    stopEditCamera();
    setEditModalOpen(false);
    setEditError('');
  };

  const startEditCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setEditCameraStream(stream);
      setEditCameraActive(true);
      setTimeout(() => {
        if (editVideoRef.current) {
          editVideoRef.current.srcObject = stream;
          editVideoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setEditError('Unable to access camera for face photo.');
    }
  };

  const stopEditCamera = () => {
    if (editCameraStream) {
      editCameraStream.getTracks().forEach(track => track.stop());
      setEditCameraStream(null);
    }
    setEditCameraActive(false);
  };

  const captureEditPhoto = () => {
    if (!editVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = editVideoRef.current.videoWidth || 640;
    canvas.height = editVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(-1, 1);
    ctx.drawImage(editVideoRef.current, -canvas.width, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setEditImage(dataUrl);
    stopEditCamera();
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Customer name is required');
      return;
    }
    if (!/^\d{11}$/.test(editPhone.trim())) {
      setEditError('Phone number must contain exactly 11 digits (e.g. 03001234567)');
      return;
    }
    setEditSubmitting(true);
    setEditError('');

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          creditLimit: Number(editCreditLimit) || 0,
          image: editImage
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update customer details');
      }

      const updated = await res.json();
      handleCloseEditModal();
      onCustomerUpdated?.(updated);
      onTransactionAdded();
    } catch (err: any) {
      setEditError(err.message || 'Error updating customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  const notifyUserViaWhatsapp = (tx: Transaction) => {
    const textMsg = `*Smart Khata AI - Receipt Notification*\n\nDear ${customer.name},\nA new transaction has been logged on your Al-Madina General Store ledger:\n\n*Type:* ${tx.type === 'credit' ? 'Credit Purchase' : 'Payment Received'}\n*Amount:* Rs. ${tx.amount.toLocaleString()}\n*Description:* ${tx.description}\n*Date:* ${new Date(tx.date).toLocaleDateString()}\n\n*Your remaining balance is:* Rs. ${customer.balance.toLocaleString()}\n\nThank you for choosing Al-Madina!`;
    const encoded = encodeURIComponent(textMsg);
    window.open(`https://api.whatsapp.com/send?phone=${customer.phone.replace(/[^0-9+]/g, '')}&text=${encoded}`, '_blank');
  };

  return (
    <div id="customer-profile" className={compact ? 'w-full space-y-3' : 'max-w-6xl mx-auto p-4 space-y-6'}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all font-semibold text-xs uppercase cursor-pointer border border-white/5"
        >
          {compact ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-180" />}
          {compact ? 'Close Customer' : 'Back to Accounts'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-xl transition-all font-semibold text-xs uppercase cursor-pointer border border-blue-500/20 shadow-sm"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>

          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl transition-all font-semibold text-xs uppercase cursor-pointer border border-rose-500/20"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {/* Left Customer overview card */}
        <div className={`glass-card ${compact ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
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
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold font-sans text-white">{customer.name}</h2>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  title="Edit customer details"
                  className="p-1 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
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
        <div className={`${compact ? '' : 'lg:col-span-2'} glass-card ${compact ? 'p-4 space-y-4' : 'p-6 space-y-5'}`}>
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
        <div className="ledger-entry-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ledger-entry-modal bg-slate-900/90 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative backdrop-blur-xl">
            <button
              onClick={() => setModalOpen(false)}
              className="ledger-entry-close absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div>
              <h3 className="text-lg font-bold font-sans text-white">Record Ledger Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Issue store credit or log balance clearance records.</p>
            </div>

            {error && (
              <div className="ledger-entry-error p-3 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl text-center">
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
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${txType === 'credit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-md' : 'ledger-entry-toggle bg-[#111936] text-slate-400 border border-white/5 hover:text-white'}`}
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('payment')}
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${txType === 'payment' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md' : 'ledger-entry-toggle bg-[#111936] text-slate-400 border border-white/5 hover:text-white'}`}
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

      {/* Edit Customer Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 relative text-slate-300 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-sans text-white">Edit Customer Details</h3>
                  <p className="text-xs text-slate-400">Update account info and registered face lock.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl text-center">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Customer Full Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.replace(/[^\p{L}\p{M} .'-]/gu, ''))}
                    placeholder="e.g. Karan Dev"
                    className="w-full bg-[#111936] border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    WhatsApp Hotline (11 digits)*
                  </label>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    minLength={11}
                    maxLength={11}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="e.g. 03001234567"
                    className="w-full bg-[#111936] border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Physical Delivery Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. Block 4, Gulshan-e-Iqbal, Karachi"
                    className="w-full bg-[#111936] border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Credit Limit Capacity (Rs.)
                  </label>
                  <input
                    type="number"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-[#111936] border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Registration Zone */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Customer Face Match Photo
                </label>

                {editCameraActive ? (
                  <div className="space-y-2 border border-blue-500/20 p-2.5 rounded-xl bg-blue-950/20">
                    <div className="w-full aspect-[4/3] bg-slate-950 rounded-lg overflow-hidden relative">
                      <video
                        ref={editVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute inset-0 border-2 border-blue-400/30 rounded-lg pointer-events-none"></div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={captureEditPhoto}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Capture Face
                      </button>
                      <button
                        type="button"
                        onClick={stopEditCamera}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={startEditCamera}
                        className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors border border-indigo-500/30 shadow-md cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Retake Photo
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">OR</span>
                      <input
                        type="file"
                        onChange={handleEditPhotoUpload}
                        accept="image/*"
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:transition-colors file:cursor-pointer cursor-pointer"
                      />
                    </div>

                    {editImage ? (
                      <div className="relative w-max mt-1">
                        <img
                          src={editImage}
                          alt="Face Preview"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setEditImage('')}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-400 shadow-md transition-colors cursor-pointer"
                          title="Remove Photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-400/90 font-medium">
                        ⚠️ No face photo attached — face recognition scanner will not match this customer without a photo.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {editSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
