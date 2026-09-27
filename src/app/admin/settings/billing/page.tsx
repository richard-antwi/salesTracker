'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CalendarDays, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BillingStatus {
  organization: {
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    payoutNetwork?: string | null;
    payoutAccountName?: string | null;
    payoutAccountNumber?: string | null;
    walletChangeRequests?: { status: string }[];
  };
  fee: number;
}

export default function AdminBillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<1 | 3 | 6 | 12>(1);

  // Wallet form state
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletForm, setWalletForm] = useState({ network: 'MTN', name: '', number: '' });
  const [walletSaving, setWalletSaving] = useState(false);

  async function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWalletSaving(true);
    try {
      const res = await fetch('/api/admin/wallet-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newNetwork: walletForm.network,
          newAccountName: walletForm.name,
          newAccountNumber: walletForm.number
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Wallet change requested successfully! The Super Admin will verify this change.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to request wallet change');
    } finally {
      setWalletSaving(false);
    }
  }

  useEffect(() => {
    async function init() {
      const urlParams = new URLSearchParams(window.location.search);
      const trxref = urlParams.get('trxref') || urlParams.get('reference');

      if (trxref) {
        try {
          const verifyRes = await fetch(`/api/payments/verify?reference=${trxref}`);
          if (verifyRes.ok) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error('Error verifying transaction:', e);
        }
      }

      fetch('/api/admin/billing/status')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setStatus(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    }
    init();
  }, []);

  async function handleSubscribe() {
    try {
      setPaying(true);
      const res = await fetch('/api/admin/billing/subscribe', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationInMonths: selectedMonths })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Redirect to Paystack
      window.location.href = data.authorization_url;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      setPaying(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading billing info...</div>;
  if (error) return <div className="p-8 text-center text-rose-400">{error}</div>;
  if (!status) return null;

  const { organization, fee } = status;
  
  const isPastDue = organization.subscriptionStatus === 'PAST_DUE' || 
    (organization.currentPeriodEnd && new Date(organization.currentPeriodEnd) < new Date());
  
  const isTrial = organization.subscriptionStatus === 'TRIAL';
  const isTrialExpired = isTrial && organization.trialEndsAt && new Date(organization.trialEndsAt) < new Date();

  const totalFee = fee * selectedMonths;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-amber-400" /> Subscription & Billing
          </h1>
          <p className="text-sm text-slate-400 mt-2">Manage your platform access and view billing history.</p>
        </div>

        {/* Status Banner */}
        <div className={`p-6 rounded-3xl border ${isPastDue || isTrialExpired ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Status</span>
                {organization.subscriptionStatus === 'ACTIVE' && !isPastDue && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">ACTIVE</span>
                )}
                {(isPastDue || isTrialExpired) && (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">EXPIRED</span>
                )}
                {isTrial && !isTrialExpired && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">FREE TRIAL</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-white">
                {isTrial && !isTrialExpired ? 'Trial expires on ' : 'Next billing date: '}
                {organization.currentPeriodEnd 
                  ? new Date(organization.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : organization.trialEndsAt 
                    ? new Date(organization.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
                    : 'N/A'
                }
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                {isPastDue || isTrialExpired 
                  ? "Your access has expired. Please renew your subscription to continue managing your fleet and generating agreements."
                  : "Your account is in good standing. You have full access to all features."}
              </p>
            </div>

            {!isTrial && !isPastDue && organization.subscriptionStatus === 'ACTIVE' ? (
              <div className="shrink-0 w-full sm:w-auto">
                <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 font-bold px-6 py-3 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" /> All Set!
                </span>
              </div>
            ) : (
              <div className="shrink-0 w-full sm:w-auto flex flex-col gap-3">
                <select 
                  value={selectedMonths}
                  onChange={(e) => setSelectedMonths(Number(e.target.value) as any)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value={1}>1 Month (GH₵{fee})</option>
                  <option value={3}>3 Months (GH₵{fee * 3})</option>
                  <option value={6}>6 Months (GH₵{fee * 6})</option>
                  <option value={12}>1 Year (GH₵{fee * 12})</option>
                </select>
                <button
                  onClick={handleSubscribe}
                  disabled={paying}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paying ? 'Connecting to Paystack...' : (
                    <>Pay GH₵{totalFee} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Plan Details */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
          <h3 className="text-base font-bold text-white mb-6">Plan Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Unlimited Vehicle Agreements',
              'Unlimited Riders & Guarantors',
              'Automated Balance Tracking',
              'Printable PDF Contracts',
              'Sms Payment Notifications (Coming Soon)',
              'Multi-Device Access',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payout Wallet Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Verified Payout Wallet
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Where your digital collections will be sent. For security, changes require verification.
              </p>
            </div>
            {!showWalletForm && (
              <button
                onClick={() => setShowWalletForm(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700"
              >
                Change Wallet
              </button>
            )}
          </div>

          {organization.walletChangeRequests && organization.walletChangeRequests.length > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-400">Wallet Change Pending</p>
                <p className="text-xs text-amber-200 mt-1">
                  Your request is being reviewed. The Super Admin will contact you to verify your identity before approving the change.
                </p>
              </div>
            </div>
          ) : showWalletForm ? (
            <form onSubmit={handleWalletSubmit} className="space-y-4 bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Network/Bank</label>
                  <select
                    value={walletForm.network}
                    onChange={(e) => setWalletForm({ ...walletForm, network: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="VODAFONE">Telecel Cash</option>
                    <option value="AIRTELTIGO">AT Money</option>
                    <option value="BANK">Bank Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={walletForm.number}
                    onChange={(e) => setWalletForm({ ...walletForm, number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 0550000000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Account Name (Must Match Registration)</label>
                  <input
                    type="text"
                    required
                    value={walletForm.name}
                    onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Kwame Mensah"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walletSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
                >
                  {walletSaving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Network</p>
                <p className="text-sm font-semibold text-white">{organization.payoutNetwork || 'Not Set'}</p>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Account Name</p>
                <p className="text-sm font-semibold text-white">{organization.payoutAccountName || 'Not Set'}</p>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Account Number</p>
                <p className="text-sm font-semibold text-white">{organization.payoutAccountNumber || 'Not Set'}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
