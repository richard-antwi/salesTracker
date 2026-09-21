'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, AlertCircle, Building2, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';

interface FinanceData {
  payments: any[];
  pastDueOrgs: any[];
  totalRevenue: number;
}

export default function SuperAdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchFinanceData() {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/finance');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFinanceData();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading finance ledger...</div>;
  if (error) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/super-admin" className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Finance & Billing Ledger</h1>
            <p className="text-xs text-slate-400">Platform revenue and organization subscription tracking</p>
          </div>
        </div>
        
        <button
          onClick={fetchFinanceData}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Total Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-300">Total Platform Revenue</h2>
            </div>
            <p className="text-4xl font-bold text-white">GH₵{data.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-300">Past Due Fleets</h2>
            </div>
            <p className="text-4xl font-bold text-white">{data.pastDueOrgs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Successful Payments ({data.payments.length})
            </h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {data.payments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No subscription payments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Organization</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {data.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-xs">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/super-admin/organizations/${p.organizationId}`} className="font-bold text-white hover:text-emerald-400 transition-colors">
                              {p.organization.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-400">
                            GH₵{Number(p.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {p.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Past Due Orgs Sidebar */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Action Required
            </h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
              {data.pastDueOrgs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">All approved fleets are in good standing.</div>
              ) : (
                <div className="space-y-2">
                  {data.pastDueOrgs.map((org) => (
                    <div key={org.id} className="p-3 bg-slate-950/50 rounded-xl border border-rose-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/super-admin/organizations/${org.id}`} className="font-bold text-sm text-white hover:text-rose-400">
                          {org.name}
                        </Link>
                        <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">PAST DUE</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Expired: {org.currentPeriodEnd ? new Date(org.currentPeriodEnd).toLocaleDateString() : (org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString() : 'Unknown')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
