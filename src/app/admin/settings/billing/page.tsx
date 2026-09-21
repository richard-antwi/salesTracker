'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CalendarDays, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BillingStatus {
  organization: {
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  fee: number;
}

export default function AdminBillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/billing/status')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setStatus(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe() {
    try {
      setPaying(true);
      const res = await fetch('/api/admin/billing/subscribe', { method: 'POST' });
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

            <div className="shrink-0 w-full sm:w-auto">
              <button
                onClick={handleSubscribe}
                disabled={paying}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {paying ? 'Connecting to Paystack...' : (
                  <>Renew Access (GH₵{fee}) <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

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

      </div>
    </div>
  );
}
