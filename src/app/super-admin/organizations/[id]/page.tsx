'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Users, Bike, FileText, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';

export default function SuperAdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/super-admin/organizations/${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setOrg(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading fleet details...</div>;
  if (error) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400">{error}</div>;
  if (!org) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/super-admin" className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{org.name}</h1>
            <p className="text-xs text-slate-400 font-mono">slug: {org.slug} | Status: {org.status}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Organization Details & Stats */}
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Fleet Contacts</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Email: <strong className="text-white">{org.contactEmail}</strong></p>
              <p>Phone: <strong className="text-white">{org.contactPhone || 'N/A'}</strong></p>
              <p>Created: <strong className="text-white">{new Date(org.createdAt).toLocaleDateString()}</strong></p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Usage</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <Bike className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-white">{org._count.vehicles}</span>
                <span className="text-xs text-slate-500">Vehicles</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-white">{org._count.agreements}</span>
                <span className="text-xs text-slate-500">Agreements</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-white">{org._count.users}</span>
                <span className="text-xs text-slate-500">Users</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <Wallet className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-white">{org._count.payments}</span>
                <span className="text-xs text-slate-500">Rider Payments</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Users & Subscription History */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" /> Subscription History
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${org.subscriptionStatus === 'ACTIVE' || org.subscriptionStatus === 'TRIAL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {org.subscriptionStatus}
              </span>
            </div>
            
            <div className="text-sm text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 mb-4">
              <p>Current Period End: <strong className="text-white">{org.currentPeriodEnd ? new Date(org.currentPeriodEnd).toLocaleDateString() : 'N/A'}</strong></p>
              <p>Trial Ends: <strong className="text-white">{org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString() : 'N/A'}</strong></p>
            </div>

            {org.subscriptionPayments.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-4">No subscription payments on record.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold rounded-tl-xl">Date</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold rounded-tr-xl">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {org.subscriptionPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-300 text-xs">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-400">
                          GH₵{Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">
                          {p.reference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" /> Platform Users
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-xl">Name</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-xl">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {org.users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u.phone}</td>
                      <td className="px-4 py-3 text-slate-300">{u.email || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
