'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
  Building2,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  CreditCard,
  Download,
  Search,
  DollarSign,
  ShieldAlert,
  X,
} from 'lucide-react';
import { formatCedi } from '@/lib/calculations';

type ActiveTab = 'saas' | 'ledger' | 'payouts' | 'pastdue';

export default function SuperAdminFinancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('saas');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [data, setData] = useState<{
    subscriptionPayments: any[];
    pastDueOrgs: any[];
    riderPayments: any[];
    withdrawals: any[];
    organizations: any[];
    metrics: {
      totalSubscriptionRevenue: number;
      totalRiderPaymentsCollected: number;
      pendingWithdrawalsTotal: number;
      pastDueCount: number;
    };
  } | null>(null);

  async function fetchFinanceData() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/super-admin/finance');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load enterprise finance ledger');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error loading finance ledger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFinanceData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Loading Enterprise Finance & Payout Ledger...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-rose-400 space-y-4 p-6 text-center">
        <AlertCircle className="w-12 h-12" />
        <p className="font-bold text-lg">{error}</p>
        <button
          onClick={fetchFinanceData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const query = searchQuery.toLowerCase().trim();

  const filteredSaas = (data?.subscriptionPayments || []).filter(
    (sp) => sp.reference?.toLowerCase().includes(query) || sp.organization?.name?.toLowerCase().includes(query)
  );

  const filteredLedger = (data?.riderPayments || []).filter(
    (rp) =>
      rp.reference?.toLowerCase().includes(query) ||
      rp.organization?.name?.toLowerCase().includes(query) ||
      rp.agreement?.vehicle?.registrationNo?.toLowerCase().includes(query) ||
      rp.agreement?.hirer?.name?.toLowerCase().includes(query)
  );

  const filteredPayouts = (data?.withdrawals || []).filter(
    (w) => w.organization?.name?.toLowerCase().includes(query) || w.organization?.payoutAccountNumber?.includes(query)
  );

  const filteredPastDue = (data?.pastDueOrgs || []).filter(
    (o) => o.name?.toLowerCase().includes(query) || (o.contactEmail && o.contactEmail.toLowerCase().includes(query))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                Finance & Payout Command Center
              </h1>
              <p className="text-xs text-slate-400">
                SaaS Revenue &bull; Platform Rider Collection Ledger &bull; Fleet Payouts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchFinanceData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Executive Financial Metrics Board */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total SaaS Platform Revenue</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatCedi(data?.metrics.totalSubscriptionRevenue || 0)}
            </p>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">Fleet Owner Subscription Access Fees</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Platform Rider Collections</span>
              <DollarSign className="w-5 h-5 text-teal-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {formatCedi(data?.metrics.totalRiderPaymentsCollected || 0)}
            </p>
            <span className="text-[11px] text-teal-400/80 mt-2 font-semibold">Total Hire-Purchase Principal Paid</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Payout Requests</span>
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-400">
              {formatCedi(data?.metrics.pendingWithdrawalsTotal || 0)}
            </p>
            <span className="text-[11px] text-amber-400/80 mt-2 font-semibold">Awaiting Super Admin Disbursement</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Past Due Fleets</span>
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-400">{data?.metrics.pastDueCount || 0}</p>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">Subscription Renewals Required</span>
          </div>
        </section>

        {/* Search & Navigation Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('saas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'saas'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>SaaS Subscriptions ({data?.subscriptionPayments.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ledger'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Platform Rider Ledger ({data?.riderPayments.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'payouts'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Fleet Payouts ({data?.withdrawals.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('pastdue')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'pastdue'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Past Due Fleets ({data?.pastDueOrgs.length || 0})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-medium pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SaaS Subscription Payments */}
        {activeTab === 'saas' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" /> SaaS Subscription Payments Ledger
              </h2>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredSaas.length} transactions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date Paid</th>
                    <th className="p-3.5">Fleet Organization</th>
                    <th className="p-3.5">Subscription Fee (GHS)</th>
                    <th className="p-3.5">Paystack Reference</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredSaas.map((sp) => (
                    <tr key={sp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-slate-300">{new Date(sp.createdAt).toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-white text-sm">{sp.organization?.name}</td>
                      <td className="p-3.5 font-black text-emerald-400 text-sm">{formatCedi(sp.amount)}</td>
                      <td className="p-3.5 font-mono text-slate-400">{sp.reference}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                          {sp.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredSaas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">No subscription payments match search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Rider Payment Stream (GMV Ledger) */}
        {activeTab === 'ledger' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" /> Platform Rider Collections Ledger
              </h2>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredLedger.length} payments</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date Paid</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Vehicle & Rider</th>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Audit Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredLedger.map((p) => (
                    <tr key={p.id} className={`hover:bg-slate-800/40 transition-colors ${p.voided ? 'opacity-50 line-through bg-rose-950/20' : ''}`}>
                      <td className="p-3.5 text-slate-300">{new Date(p.datePaid).toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-white text-sm">{formatCedi(p.amount)}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold text-[10px]">{p.channel}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-400 font-mono">{p.agreement?.vehicle?.registrationNo}</div>
                        <div className="text-[10px] text-slate-400">{p.agreement?.hirer?.name}</div>
                      </td>
                      <td className="p-3.5 text-slate-400">{p.organization?.name}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{p.reference || p.note || 'None'}</td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 italic">No rider collection records match search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Fleet Payouts Ledger */}
        {activeTab === 'payouts' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" /> Fleet Owner Payout Wallet Ledger
              </h2>
              <span className="text-xs text-slate-400 font-medium">{filteredPayouts.length} withdrawal records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Destination Payout Wallet</th>
                    <th className="p-3.5">Amount Requested</th>
                    <th className="p-3.5">Date Requested</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredPayouts.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">{w.organization?.name}</td>
                      <td className="p-3.5">
                        {w.organization?.payoutAccountNumber ? (
                          <div>
                            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-extrabold uppercase">
                                {w.organization.payoutNetwork || 'MOMO'}
                              </span>
                              <span>{w.organization.payoutAccountName}</span>
                            </div>
                            <div className="font-mono text-slate-300 text-[11px] mt-0.5">
                              {w.organization.payoutAccountNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                            ⚠️ No Verified Wallet Registered
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-black text-emerald-400 text-sm">{formatCedi(w.amount)}</td>
                      <td className="p-3.5 text-slate-400">{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            w.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : w.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPayouts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">No payout records match search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Past Due Fleets */}
        {activeTab === 'pastdue' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" /> Action Required: Past Due & Expired Fleets
              </h2>
              <span className="text-xs text-slate-400 font-medium">{filteredPastDue.length} expired fleets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Organization Name</th>
                    <th className="p-3.5">Contact Email</th>
                    <th className="p-3.5">Subscription Expiry</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredPastDue.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white text-sm">{org.name}</td>
                      <td className="p-3.5 text-slate-400 font-mono">{org.contactEmail}</td>
                      <td className="p-3.5 text-rose-400 font-semibold">
                        {org.currentPeriodEnd
                          ? new Date(org.currentPeriodEnd).toLocaleDateString()
                          : org.trialEndsAt
                          ? new Date(org.trialEndsAt).toLocaleDateString()
                          : 'Expired'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-bold">
                          PAST DUE
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Link
                          href="/super-admin"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          Manage Fleet Access
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredPastDue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">All approved fleet organizations are currently in good standing!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
